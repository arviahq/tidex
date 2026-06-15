import { Node, Project, type InterfaceDeclaration, type TypeNode } from "ts-morph";
import {
  getComponentId,
  isCallbackProp,
  shouldSkipProp,
  type PropSchema,
  type PropsMap,
  type ComponentEntry,
} from "@tide/core";
import path from "node:path";
import {
  discoverComponents,
  findPropsTypeNode,
  findPropsInterface,
  getComponentParameterType,
} from "./discover.js";
import { jsDocDescription, ProjectTypeResolver } from "./resolve-type.js";

function schemaFromInterface(
  iface: InterfaceDeclaration,
  resolver: ProjectTypeResolver,
  fromAbsPath: string,
): PropSchema {
  const properties: Record<string, PropSchema> = {};
  const sourceFile = iface.getSourceFile();

  for (const base of iface.getExtends()) {
    const baseName = base.getExpression().getText();
    const extendedIface =
      sourceFile.getInterface(baseName) ?? resolver.findInterface(sourceFile, baseName);
    if (extendedIface) {
      const baseSchema = schemaFromInterface(extendedIface, resolver, fromAbsPath);
      if (baseSchema.type === "object") {
        Object.assign(properties, baseSchema.properties);
      }
    }
  }

  for (const member of iface.getMembers()) {
    if (!Node.isPropertySignature(member)) continue;
    const name = member.getName();
    const memberType = member.getTypeNode();
    if (!name || !memberType) continue;
    const typeText = memberType.getText();
    const description = jsDocDescription(member);
    if (isCallbackProp(name, typeText)) {
      properties[name] = { type: "callback", description };
      continue;
    }
    if (shouldSkipProp(name, typeText)) continue;
    let schema = schemaFromTypeNode(memberType, resolver, fromAbsPath);
    schema = {
      ...schema,
      required: !member.hasQuestionToken() ? true : false,
      description,
    };
    properties[name] = schema;
  }

  return { type: "object", properties };
}

function schemaFromTypeNode(
  typeNode: TypeNode,
  resolver: ProjectTypeResolver,
  fromAbsPath: string,
  depth = 0,
): PropSchema {
  if (depth > 10) return { type: "unknown" };

  if (Node.isTypeLiteral(typeNode)) {
    const properties: Record<string, PropSchema> = {};
    for (const member of typeNode.getMembers()) {
      if (!Node.isPropertySignature(member)) continue;
      const name = member.getName();
      const memberType = member.getTypeNode();
      if (!name || !memberType) continue;
      const typeText = memberType.getText();
      const description = jsDocDescription(member);
      if (isCallbackProp(name, typeText)) {
        properties[name] = { type: "callback", description };
        continue;
      }
      if (shouldSkipProp(name, typeText)) continue;
      let schema = schemaFromTypeNode(memberType, resolver, fromAbsPath, depth + 1);
      schema = {
        ...schema,
        required: !member.hasQuestionToken() ? true : false,
        description,
      };
      properties[name] = schema;
    }
    return { type: "object", properties };
  }

  if (Node.isIntersectionTypeNode(typeNode)) {
    const properties: Record<string, PropSchema> = {};
    for (const part of typeNode.getTypeNodes()) {
      const schema = schemaFromTypeNode(part, resolver, fromAbsPath, depth + 1);
      if (schema.type === "object") {
        Object.assign(properties, schema.properties);
      }
    }
    return { type: "object", properties };
  }

  if (Node.isUnionTypeNode(typeNode)) {
    const union = unionFromTypeNodes(typeNode.getTypeNodes());
    if (union) return union;
  }

  const text = typeNode.getText();
  if (text === "boolean") return { type: "boolean" };
  if (text === "string") return { type: "string" };
  if (text === "number") return { type: "number" };

  // `T[]` — represent as an array of the (best-effort) element schema; the UI
  // edits it as JSON.
  if (Node.isArrayTypeNode(typeNode)) {
    return {
      type: "array",
      element: schemaFromTypeNode(typeNode.getElementTypeNode(), resolver, fromAbsPath, depth + 1),
    };
  }

  if (Node.isTypeReference(typeNode)) {
    const name = typeNode.getTypeName().getText();
    // `Array<T>` / `ReadonlyArray<T>`.
    if (name === "Array" || name === "ReadonlyArray") {
      const arg = typeNode.getTypeArguments()[0];
      return {
        type: "array",
        element: arg ? schemaFromTypeNode(arg, resolver, fromAbsPath, depth + 1) : undefined,
      };
    }
    const resolved = resolver.resolveTypeReference(typeNode, fromAbsPath, depth);
    if (resolved) {
      if (Node.isInterfaceDeclaration(resolved)) {
        return schemaFromInterface(resolved, resolver, resolved.getSourceFile().getFilePath());
      }
      if (Node.isTypeNode(resolved)) {
        return schemaFromTypeNode(resolved, resolver, fromAbsPath, depth + 1);
      }
    }
  }

  // Unresolved — keep the source text (e.g. an imported type name) so the UI
  // can tell the user exactly which type to co-locate.
  return { type: "unknown", typeText: text };
}

/**
 * Build a union schema from the members of a union type, supporting string,
 * numeric, and boolean literal members (e.g. `"a" | "b"`, `1 | 2 | 3`). Returns
 * null when there are no literal members. The `valueType` lets controls coerce
 * the chosen option back to its real kind.
 */
function unionFromTypeNodes(nodes: TypeNode[]): PropSchema | null {
  const values: string[] = [];
  const kinds = new Set<"string" | "number" | "boolean">();

  for (const t of nodes) {
    if (!Node.isLiteralTypeNode(t)) continue;
    const literal = t.getLiteral();
    if (Node.isStringLiteral(literal)) {
      values.push(literal.getLiteralValue());
      kinds.add("string");
    } else if (Node.isNumericLiteral(literal)) {
      values.push(literal.getText());
      kinds.add("number");
    } else if (Node.isTrueLiteral(literal) || Node.isFalseLiteral(literal)) {
      values.push(literal.getText());
      kinds.add("boolean");
    } else if (Node.isPrefixUnaryExpression(literal)) {
      // Negative numeric literal, e.g. `-1`.
      values.push(literal.getText());
      kinds.add("number");
    }
  }

  if (values.length === 0) return null;
  // Mixed kinds fall back to string options.
  const valueType = kinds.size === 1 ? [...kinds][0] : "string";
  return { type: "union", values, valueType };
}

export type ProgressReporter = (done: number, total: number, label?: string) => void;

export async function extractProps(
  root: string,
  components: ComponentEntry[],
  onProgress?: ProgressReporter,
): Promise<PropsMap> {
  const project = new Project({
    skipAddingFilesFromTsConfig: true,
    compilerOptions: { jsx: 2 },
  });
  const resolver = new ProjectTypeResolver(root);
  const result: PropsMap = {};

  for (let i = 0; i < components.length; i++) {
    const component = components[i]!;
    // Reported before the (potentially slow) type resolution for this entry, so
    // the label names the component currently being worked on. Yield to the
    // event loop when a reporter is attached so a live progress UI can repaint
    // (this loop is otherwise CPU-bound and would block rendering).
    if (onProgress) {
      onProgress(i, components.length, component.name);
      await new Promise((resolve) => setImmediate(resolve));
    }
    const componentId = getComponentId(component);
    const absPath = path.join(root, component.path);
    let sourceFile;
    try {
      sourceFile = project.addSourceFileAtPath(absPath);
    } catch {
      result[componentId] = {};
      continue;
    }

    const iface = findPropsInterface(sourceFile, component.name);
    if (iface) {
      const schema = schemaFromInterface(iface, resolver, absPath);
      result[componentId] = schema.type === "object" ? schema.properties : {};
      continue;
    }

    let typeNode = findPropsTypeNode(sourceFile, component.name);
    if (!typeNode) {
      typeNode = getComponentParameterType(sourceFile, component.name);
    }

    if (!typeNode) {
      result[componentId] = {};
      continue;
    }

    const schema = schemaFromTypeNode(typeNode, resolver, absPath);
    result[componentId] = schema.type === "object" ? schema.properties : {};
  }

  onProgress?.(components.length, components.length);
  return result;
}

export { discoverComponents };
