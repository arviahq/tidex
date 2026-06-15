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
    const values: string[] = [];
    for (const t of typeNode.getTypeNodes()) {
      if (Node.isLiteralTypeNode(t) && Node.isStringLiteral(t.getLiteral())) {
        values.push(
          t
            .getLiteral()
            .getText()
            .replace(/^['"]|['"]$/g, ""),
        );
      }
    }
    if (values.length > 0) {
      return { type: "union", values };
    }
  }

  const text = typeNode.getText();
  if (text === "boolean") return { type: "boolean" };
  if (text === "string") return { type: "string" };
  if (text === "number") return { type: "number" };

  if (Node.isTypeReference(typeNode)) {
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

  return { type: "unknown" };
}

export function extractProps(root: string, components: ComponentEntry[]): PropsMap {
  const project = new Project({
    skipAddingFilesFromTsConfig: true,
    compilerOptions: { jsx: 2 },
  });
  const resolver = new ProjectTypeResolver(root);
  const result: PropsMap = {};

  for (const component of components) {
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

  return result;
}

export { discoverComponents };
