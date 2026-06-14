import {
  Node,
  Project,
  type InterfaceDeclaration,
  type Type,
  type TypeNode,
} from "ts-morph";
import {
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
  literalUnionValues,
} from "./discover.js";

function schemaFromType(type: Type, typeText: string): PropSchema {
  if (typeText.includes("|")) {
    const values = literalUnionValues(type);
    if (values.length > 0) {
      return { type: "union", values };
    }
  }

  if (type.isBoolean() || typeText === "boolean") {
    return { type: "boolean" };
  }
  if (type.isString() || typeText === "string") {
    return { type: "string" };
  }
  if (type.isNumber() || typeText === "number") {
    return { type: "number" };
  }

  const props = type.getProperties();
  if (props.length > 0 && typeText.startsWith("{")) {
    const properties: Record<string, PropSchema> = {};
    for (const prop of props) {
      const name = prop.getName();
      const propType = prop.getTypeAtLocation(prop.getDeclarations()[0]!);
      const propTypeText = propType.getText();
      if (shouldSkipProp(name, propTypeText)) continue;
      properties[name] = schemaFromType(propType, propTypeText);
    }
    if (Object.keys(properties).length > 0) {
      return { type: "object", properties };
    }
  }

  return { type: "unknown" };
}

function schemaFromInterface(iface: InterfaceDeclaration, project: Project): PropSchema {
  const properties: Record<string, PropSchema> = {};
  for (const member of iface.getMembers()) {
    if (!Node.isPropertySignature(member)) continue;
    const name = member.getName();
    const memberType = member.getTypeNode();
    if (!name || !memberType) continue;
    const typeText = memberType.getText();
    if (shouldSkipProp(name, typeText)) continue;
    let schema = schemaFromTypeNode(memberType, project);
    schema = { ...schema, required: !member.hasQuestionToken() ? true : false };
    properties[name] = schema;
  }
  return { type: "object", properties };
}

function schemaFromTypeNode(typeNode: TypeNode, project: Project): PropSchema {
  if (Node.isTypeLiteral(typeNode)) {
    const properties: Record<string, PropSchema> = {};
    for (const member of typeNode.getMembers()) {
      if (!Node.isPropertySignature(member)) continue;
      const name = member.getName();
      const memberType = member.getTypeNode();
      if (!name || !memberType) continue;
      const typeText = memberType.getText();
      if (shouldSkipProp(name, typeText)) continue;
      let schema = schemaFromTypeNode(memberType, project);
      schema = { ...schema, required: !member.hasQuestionToken() ? true : false };
      properties[name] = schema;
    }
    return { type: "object", properties };
  }

  if (Node.isUnionTypeNode(typeNode)) {
    const values: string[] = [];
    for (const t of typeNode.getTypeNodes()) {
      if (Node.isLiteralTypeNode(t) && Node.isStringLiteral(t.getLiteral())) {
        values.push(t.getLiteral().getText().replace(/^['"]|['"]$/g, ""));
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
    const typeName = typeNode.getTypeName().getText();
    const sourceFile = typeNode.getSourceFile();
    const alias = sourceFile.getTypeAlias(typeName);
    if (alias?.getTypeNode()) {
      return schemaFromTypeNode(alias.getTypeNode()!, project);
    }
    const iface = sourceFile.getInterface(typeName);
    if (iface) {
      return schemaFromInterface(iface, project);
    }
  }

  const checker = project.getTypeChecker();
  const type = checker.getTypeAtLocation(typeNode);
  return schemaFromType(type, text);
}

export function extractProps(root: string, components: ComponentEntry[]): PropsMap {
  const project = new Project({
    skipAddingFilesFromTsConfig: true,
    compilerOptions: { jsx: 2 },
  });

  const result: PropsMap = {};

  for (const component of components) {
    const absPath = path.join(root, component.path);
    let sourceFile;
    try {
      sourceFile = project.addSourceFileAtPath(absPath);
    } catch {
      result[component.name] = {};
      continue;
    }

    const iface = findPropsInterface(sourceFile, component.name);
    if (iface) {
      const schema = schemaFromInterface(iface, project);
      result[component.name] = schema.type === "object" ? schema.properties : {};
      continue;
    }

    let typeNode = findPropsTypeNode(sourceFile, component.name);
    if (!typeNode) {
      typeNode = getComponentParameterType(sourceFile, component.name);
    }

    if (!typeNode) {
      result[component.name] = {};
      continue;
    }

    const schema = schemaFromTypeNode(typeNode, project);
    result[component.name] = schema.type === "object" ? schema.properties : {};
  }

  return result;
}

export { discoverComponents };
