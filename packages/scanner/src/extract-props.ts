import path from "node:path";
import {
  getComponentId,
  isCallbackProp,
  shouldSkipProp,
  type PropMeta,
  type PropSchema,
  type PropsMap,
  type ComponentEntry,
} from "@tidex/core";
import {
  child,
  children,
  jsDocDescription,
  jsDocTags,
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

function numericTag(value: string | true | undefined): number | undefined {
  if (typeof value !== "string") return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

/** Build {@link PropMeta} from a member's JSDoc tags, or undefined if none apply. */
function metaFromJsDoc(file: ParsedFile, nodeStart: number): PropMeta | undefined {
  const tags = jsDocTags(file, nodeStart);
  const meta: PropMeta = {};
  if ("min" in tags) meta.min = numericTag(tags.min);
  if ("max" in tags) meta.max = numericTag(tags.max);
  if ("step" in tags) meta.step = numericTag(tags.step);
  if ("slider" in tags) meta.slider = true;
  if ("minLength" in tags) meta.minLength = numericTag(tags.minLength);
  if ("maxLength" in tags) meta.maxLength = numericTag(tags.maxLength);
  if ("pattern" in tags && typeof tags.pattern === "string") meta.pattern = tags.pattern;
  if ("multiline" in tags) meta.format = "multiline";
  if ("url" in tags) meta.format = "url";
  if ("email" in tags) meta.format = "email";
  if ("password" in tags) meta.format = "password";
  if ("color" in tags) meta.format = "color";
  if ("secret" in tags) meta.secret = true;
  // Drop keys that parsed to undefined (e.g. a malformed `@min`).
  for (const k of Object.keys(meta) as Array<keyof PropMeta>) {
    if (meta[k] === undefined) delete meta[k];
  }
  return Object.keys(meta).length ? meta : undefined;
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
  const meta = metaFromJsDoc(file, member.start);
  properties[name] = {
    ...schema,
    required: member.optional !== true,
    description,
    ...(meta ? { meta } : {}),
  };
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

const DISCRIMINANT_KEYS = ["type", "kind", "variant", "mode"];

/** Resolve a type node to the property members of the object it denotes, if any. */
function objectMembers(
  typeNode: AstNode,
  file: ParsedFile,
  resolver: ProjectTypeResolver,
  depth: number,
): { members: AstNode[]; file: ParsedFile } | null {
  if (depth > 10) return null;
  if (typeNode.type === "TSTypeLiteral") return { members: children(typeNode, "members"), file };
  if (typeNode.type === "TSTypeReference") {
    const resolved = resolver.resolveTypeReference(typeNode, file, depth);
    if (resolved?.kind === "interface")
      return { members: children(child(resolved.node, "body"), "body"), file: resolved.file };
    if (resolved?.kind === "type")
      return objectMembers(resolved.node, resolved.file, resolver, depth + 1);
  }
  return null;
}

/** The string-literal value of property `key` among `members`, if it is one. */
function literalDiscriminant(members: AstNode[], key: string): string | undefined {
  for (const m of members) {
    if (m.type !== "TSPropertySignature" || memberName(m) !== key) continue;
    const t = memberTypeNode(m);
    if (t?.type === "TSLiteralType") {
      const lit = child(t, "literal");
      if (lit && typeof lit.value === "string") return lit.value;
    }
    return undefined;
  }
  return undefined;
}

/**
 * Detect a discriminated union of object shapes — every member is an object
 * with a shared literal property (`type`/`kind`/`variant`/`mode`) that is
 * distinct across members — and build a `variant` schema for the picker.
 */
function variantFromUnion(
  nodes: AstNode[],
  file: ParsedFile,
  resolver: ProjectTypeResolver,
  depth: number,
): PropSchema | null {
  const members = nodes.filter(
    (n) =>
      n.type !== "TSUndefinedKeyword" && n.type !== "TSNullKeyword" && n.type !== "TSVoidKeyword",
  );
  if (members.length < 2) return null;

  const bodies = members.map((n) => objectMembers(n, file, resolver, depth));
  if (bodies.some((b) => b === null)) return null;

  for (const key of DISCRIMINANT_KEYS) {
    const labels = bodies.map((b) => literalDiscriminant(b!.members, key));
    if (labels.every((l) => typeof l === "string") && new Set(labels).size === labels.length) {
      return {
        type: "variant",
        discriminant: key,
        variants: members.map((n, i) => ({
          label: labels[i]!,
          schema: schemaFromTypeNode(n, file, resolver, depth + 1),
        })),
      };
    }
  }
  return null;
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
      const members = children(typeNode, "types");
      const union = unionFromTypeNodes(members, file);
      if (union) return union;
      const variant = variantFromUnion(members, file, resolver, depth);
      if (variant) return variant;
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
    case "TSTupleType": {
      const elementNodes = children(typeNode, "elementTypes");
      const elements: PropSchema[] = [];
      const labels: string[] = [];
      let named = false;
      for (const el of elementNodes) {
        if (el.type === "TSNamedTupleMember") {
          named = true;
          labels.push(str(child(el, "label"), "name") ?? "");
          elements.push(schemaFromTypeNode(child(el, "elementType")!, file, resolver, depth + 1));
        } else {
          labels.push("");
          elements.push(schemaFromTypeNode(el, file, resolver, depth + 1));
        }
      }
      return { type: "tuple", elements, ...(named ? { labels } : {}) };
    }
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
      if (name === "Map" || name === "ReadonlyMap" || name === "WeakMap") {
        const params = children(child(typeNode, "typeArguments"), "params");
        return {
          type: "map",
          key: params[0] ? schemaFromTypeNode(params[0], file, resolver, depth + 1) : undefined,
          value: params[1] ? schemaFromTypeNode(params[1], file, resolver, depth + 1) : undefined,
        };
      }
      if (name === "Record") {
        const params = children(child(typeNode, "typeArguments"), "params");
        return {
          type: "record",
          key: params[0] ? schemaFromTypeNode(params[0], file, resolver, depth + 1) : undefined,
          value: params[1] ? schemaFromTypeNode(params[1], file, resolver, depth + 1) : undefined,
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
