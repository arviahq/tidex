import path from "node:path";
import {
  getComponentId,
  isCallbackProp,
  shouldSkipProp,
  type PropSchema,
  type PropsMap,
  type ComponentEntry,
} from "@tide/core";
import {
  child,
  children,
  jsDocDescription,
  str,
  text,
  type AstNode,
  type ParsedFile,
} from "./oxc-ast.js";
import {
  discoverComponents,
  findPropsTypeNode,
  findPropsInterface,
  getComponentParameterType,
} from "./discover.js";
import { ProjectTypeResolver } from "./resolve-type.js";

/** Property name from a `TSPropertySignature` key (identifier or string/number literal). */
function memberName(member: AstNode): string | undefined {
  const key = child(member, "key");
  if (!key) return undefined;
  const name = str(key, "name");
  if (name) return name;
  const value = key.value;
  if (typeof value === "string" || typeof value === "number") return String(value);
  return undefined;
}

function memberTypeNode(member: AstNode): AstNode | undefined {
  return child(child(member, "typeAnnotation"), "typeAnnotation");
}

function addMember(
  properties: Record<string, PropSchema>,
  member: AstNode,
  file: ParsedFile,
  resolver: ProjectTypeResolver,
  depth: number,
): void {
  if (member.type !== "TSPropertySignature") return;
  const name = memberName(member);
  const typeNode = memberTypeNode(member);
  if (!name || !typeNode) return;

  const typeText = text(file, typeNode);
  const description = jsDocDescription(file, member.start);

  if (isCallbackProp(name, typeText)) {
    properties[name] = { type: "callback", description };
    return;
  }
  if (shouldSkipProp(name, typeText)) return;

  const schema = schemaFromTypeNode(typeNode, file, resolver, depth + 1);
  properties[name] = { ...schema, required: member.optional !== true, description };
}

function schemaFromInterface(
  iface: AstNode,
  file: ParsedFile,
  resolver: ProjectTypeResolver,
  depth = 0,
): PropSchema {
  const properties: Record<string, PropSchema> = {};

  for (const base of children(iface, "extends")) {
    const baseName = str(child(base, "expression"), "name");
    if (!baseName) continue;
    const baseIface = resolver.findInterface(file, baseName);
    if (baseIface) {
      const baseSchema = schemaFromInterface(baseIface, file, resolver, depth + 1);
      if (baseSchema.type === "object") Object.assign(properties, baseSchema.properties);
    }
  }

  for (const member of children(child(iface, "body"), "body")) {
    addMember(properties, member, file, resolver, depth);
  }

  return { type: "object", properties };
}

function unionFromTypeNodes(nodes: AstNode[], file: ParsedFile): PropSchema | null {
  const values: string[] = [];
  const kinds = new Set<"string" | "number" | "boolean">();

  for (const t of nodes) {
    if (t.type !== "TSLiteralType") continue;
    const literal = child(t, "literal");
    if (!literal) continue;
    if (literal.type === "UnaryExpression") {
      // Negative numeric literal, e.g. `-1`.
      values.push(text(file, literal));
      kinds.add("number");
      continue;
    }
    const value = literal.value;
    if (typeof value === "string") {
      values.push(value);
      kinds.add("string");
    } else if (typeof value === "number") {
      values.push(String(value));
      kinds.add("number");
    } else if (typeof value === "boolean") {
      values.push(String(value));
      kinds.add("boolean");
    }
  }

  if (values.length === 0) return null;
  const valueType = kinds.size === 1 ? [...kinds][0]! : "string";
  return { type: "union", values, valueType };
}

function schemaFromTypeNode(
  typeNode: AstNode,
  file: ParsedFile,
  resolver: ProjectTypeResolver,
  depth = 0,
): PropSchema {
  if (depth > 10) return { type: "unknown" };

  switch (typeNode.type) {
    case "TSTypeLiteral": {
      const properties: Record<string, PropSchema> = {};
      for (const member of children(typeNode, "members")) {
        addMember(properties, member, file, resolver, depth);
      }
      return { type: "object", properties };
    }
    case "TSIntersectionType": {
      const properties: Record<string, PropSchema> = {};
      for (const part of children(typeNode, "types")) {
        const schema = schemaFromTypeNode(part, file, resolver, depth + 1);
        if (schema.type === "object") Object.assign(properties, schema.properties);
      }
      return { type: "object", properties };
    }
    case "TSUnionType": {
      const union = unionFromTypeNodes(children(typeNode, "types"), file);
      if (union) return union;
      break;
    }
    case "TSStringKeyword":
      return { type: "string" };
    case "TSNumberKeyword":
      return { type: "number" };
    case "TSBooleanKeyword":
      return { type: "boolean" };
    case "TSArrayType":
      return {
        type: "array",
        element: schemaFromTypeNode(child(typeNode, "elementType")!, file, resolver, depth + 1),
      };
    case "TSTypeReference": {
      const name = str(child(typeNode, "typeName"), "name");
      if (name === "Array" || name === "ReadonlyArray") {
        const arg = children(child(typeNode, "typeArguments"), "params")[0];
        return {
          type: "array",
          element: arg ? schemaFromTypeNode(arg, file, resolver, depth + 1) : undefined,
        };
      }
      if (name === "Date") return { type: "date" };
      if (name === "Set" || name === "ReadonlySet") {
        const arg = children(child(typeNode, "typeArguments"), "params")[0];
        return {
          type: "set",
          element: arg ? schemaFromTypeNode(arg, file, resolver, depth + 1) : undefined,
        };
      }
      const resolved = resolver.resolveTypeReference(typeNode, file, depth);
      if (resolved) {
        return resolved.kind === "interface"
          ? schemaFromInterface(resolved.node, resolved.file, resolver, depth + 1)
          : schemaFromTypeNode(resolved.node, resolved.file, resolver, depth + 1);
      }
      break;
    }
  }

  // Unresolved — keep the source text (e.g. an imported type name) so the UI
  // can tell the user exactly which type to co-locate.
  return { type: "unknown", typeText: text(file, typeNode) };
}

export type ProgressReporter = (done: number, total: number, label?: string) => void;

export async function extractProps(
  root: string,
  components: ComponentEntry[],
  onProgress?: ProgressReporter,
): Promise<PropsMap> {
  const resolver = new ProjectTypeResolver(root);
  const result: PropsMap = {};

  for (let i = 0; i < components.length; i++) {
    const component = components[i]!;
    // Reported before the (potentially slow) type resolution for this entry, so
    // the label names the component currently being worked on. Yield to the
    // event loop when a reporter is attached so a live progress UI can repaint.
    if (onProgress) {
      onProgress(i, components.length, component.name);
      await new Promise((resolve) => setImmediate(resolve));
    }

    const componentId = getComponentId(component);
    const absPath = path.join(root, component.path);
    const file = resolver.getSourceFile(absPath);
    if (!file) {
      result[componentId] = {};
      continue;
    }

    const iface = findPropsInterface(file, component.name);
    if (iface) {
      const schema = schemaFromInterface(iface, file, resolver);
      result[componentId] = schema.type === "object" ? schema.properties : {};
      continue;
    }

    const typeNode =
      findPropsTypeNode(file, component.name) ?? getComponentParameterType(file, component.name);
    if (!typeNode) {
      result[componentId] = {};
      continue;
    }

    const schema = schemaFromTypeNode(typeNode, file, resolver);
    result[componentId] = schema.type === "object" ? schema.properties : {};
  }

  onProgress?.(components.length, components.length);
  return result;
}

export { discoverComponents };
