import path from "node:path";
import {
  Node,
  Project,
  ts,
  type Node as MorphNode,
  type SourceFile,
  type Type,
  type TypeNode,
} from "ts-morph";
import type { ComponentEntry } from "@tide/core";

const PASCAL_CASE = /^[A-Z][a-zA-Z0-9]*$/;

export interface DiscoverOptions {
  componentsDir?: string;
}

export function isPascalCase(name: string): boolean {
  return PASCAL_CASE.test(name);
}

function hasTideSkip(node: MorphNode): boolean {
  if (
    !("getJsDocs" in node) ||
    typeof (node as { getJsDocs?: () => Array<{ getFullText: () => string }> }).getJsDocs !==
      "function"
  ) {
    return false;
  }
  return (node as { getJsDocs: () => Array<{ getFullText: () => string }> })
    .getJsDocs()
    .some((doc) => /@tide-skip\b/.test(doc.getFullText()));
}

function hasJsx(node: MorphNode): boolean {
  let found = false;
  const visit = (n: ts.Node): void => {
    if (found) return;
    if (
      n.kind === ts.SyntaxKind.JsxElement ||
      n.kind === ts.SyntaxKind.JsxSelfClosingElement ||
      n.kind === ts.SyntaxKind.JsxFragment
    ) {
      found = true;
      return;
    }
    ts.forEachChild(n, visit);
  };
  visit(node.compilerNode);
  return found;
}

function hasKeyword(node: MorphNode, kind: ts.SyntaxKind): boolean {
  const mods = (node.compilerNode as { modifiers?: ts.NodeArray<ts.ModifierLike> }).modifiers;
  return !!mods && mods.some((m) => m.kind === kind);
}

function deriveTitle(
  filePath: string,
  componentName: string,
  root: string,
  componentsDir?: string,
): string {
  const rel = path.relative(root, filePath).replace(/\\/g, "/");
  const normalizedComponentsDir = componentsDir?.replace(/\\/g, "/");

  if (normalizedComponentsDir) {
    const idx = rel.indexOf(normalizedComponentsDir + "/");
    if (idx >= 0) {
      const after = rel.slice(idx + normalizedComponentsDir.length + 1);
      const dir = path.dirname(after).replace(/\\/g, "/");
      if (dir && dir !== ".") {
        const category = dir
          .split("/")
          .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
          .join("/");
        return `${category}/${componentName}`;
      }
      return componentName;
    }
  }

  const parts = rel.split("/");
  parts.pop();
  if (parts[0] === "src") parts.shift();
  if (parts.length === 0) return componentName;
  const category = parts.map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join("/");
  return `${category}/${componentName}`;
}

export function deriveComponentId(
  relPath: string,
  componentName: string,
  componentsDir?: string,
): string {
  const normalized = relPath.replace(/\\/g, "/");
  const normalizedComponentsDir = componentsDir?.replace(/\\/g, "/");

  if (normalizedComponentsDir) {
    const idx = normalized.indexOf(normalizedComponentsDir + "/");
    if (idx >= 0) {
      const after = normalized.slice(idx + normalizedComponentsDir.length + 1);
      const dir = path.dirname(after).replace(/\\/g, "/");
      if (dir && dir !== ".") return `${dir}/${componentName}`;
      return componentName;
    }
  }

  const parts = normalized.split("/");
  parts.pop();
  const componentsIdx = parts.lastIndexOf("components");
  if (componentsIdx >= 0) {
    const segs = parts.slice(componentsIdx + 1);
    if (segs.length > 0) return `${segs.join("/")}/${componentName}`;
  }

  if (parts[0] === "src") parts.shift();
  if (parts.length > 0) return `${parts.join("/")}/${componentName}`;
  return componentName;
}

function getComponentNameFromFunction(name: string | undefined, filePath: string): string | null {
  if (name && isPascalCase(name)) return name;
  const base = path.basename(filePath, path.extname(filePath));
  return isPascalCase(base) ? base : null;
}

function unwrapComponentInitializer(init: MorphNode | undefined): MorphNode | undefined {
  if (!init) return undefined;

  if (Node.isCallExpression(init)) {
    const callee = init.getExpression().getText();
    if (
      callee === "forwardRef" ||
      callee.endsWith(".forwardRef") ||
      callee === "memo" ||
      callee.endsWith(".memo")
    ) {
      return unwrapComponentInitializer(init.getArguments()[0]);
    }
  }

  return init;
}

function isComponentInitializer(init: MorphNode | undefined): init is MorphNode {
  const unwrapped = unwrapComponentInitializer(init);
  if (!unwrapped) return false;
  if (
    Node.isArrowFunction(unwrapped) ||
    Node.isFunctionExpression(unwrapped) ||
    Node.isFunctionDeclaration(unwrapped)
  ) {
    return hasJsx(unwrapped);
  }
  return false;
}

export function discoverComponents(
  root: string,
  files: string[],
  options: DiscoverOptions = {},
): ComponentEntry[] {
  const project = new Project({
    skipAddingFilesFromTsConfig: true,
    compilerOptions: { jsx: 2 },
  });

  const entries: ComponentEntry[] = [];
  const seen = new Set<string>();

  for (const file of files) {
    const absPath = path.isAbsolute(file) ? file : path.join(root, file);
    let sourceFile: SourceFile;
    try {
      sourceFile = project.addSourceFileAtPath(absPath);
    } catch {
      continue;
    }

    const relPath = path.relative(root, absPath).replace(/\\/g, "/");

    const add = (name: string, exportName: string, isDefault: boolean) => {
      const id = deriveComponentId(relPath, name, options.componentsDir);
      const key = `${relPath}:${id}:${isDefault ? "default" : exportName}`;
      if (seen.has(key)) return;
      seen.add(key);
      entries.push({
        id,
        name,
        path: relPath,
        exportName,
        title: deriveTitle(absPath, name, root, options.componentsDir),
        isDefault,
      });
    };

    for (const fn of sourceFile.getFunctions()) {
      if (!hasKeyword(fn, ts.SyntaxKind.ExportKeyword)) continue;
      if (hasTideSkip(fn)) continue;
      if (!hasJsx(fn)) continue;
      if (hasKeyword(fn, ts.SyntaxKind.DefaultKeyword)) {
        const name =
          getComponentNameFromFunction(fn.getName(), absPath) ?? path.basename(absPath, ".tsx");
        add(name, "default", true);
      } else {
        const componentName = getComponentNameFromFunction(fn.getName(), absPath);
        if (componentName) add(componentName, componentName, false);
      }
    }

    for (const ea of sourceFile.getExportAssignments()) {
      if (ea.isExportEquals()) continue;
      const expr = ea.getExpression();
      let initializer: MorphNode | undefined = expr;
      let name = path.basename(absPath, ".tsx");
      if (Node.isIdentifier(expr)) {
        const refName = expr.getText();
        if (isPascalCase(refName)) name = refName;
        const decl = sourceFile.getVariableDeclaration(refName);
        initializer = decl?.getInitializer() ?? sourceFile.getFunction(refName);
      } else if (Node.isFunctionExpression(expr)) {
        name = getComponentNameFromFunction(expr.getName(), absPath) ?? name;
      }
      if (isComponentInitializer(initializer)) {
        add(name, "default", true);
      }
    }

    for (const stmt of sourceFile.getVariableStatements()) {
      if (!hasKeyword(stmt, ts.SyntaxKind.ExportKeyword)) continue;
      for (const decl of stmt.getDeclarations()) {
        const name = decl.getName();
        if (!isPascalCase(name)) continue;
        if (hasTideSkip(decl)) continue;
        const init = decl.getInitializer();
        if (isComponentInitializer(init)) {
          add(name, name, false);
        }
      }
    }
  }

  return entries.sort((a, b) => a.title.localeCompare(b.title));
}

export function resolvePropsTypeName(componentName: string): string[] {
  return [`${componentName}Props`, `Props`, `I${componentName}Props`];
}

export function findPropsTypeNode(
  sourceFile: SourceFile,
  componentName: string,
): TypeNode | undefined {
  const candidates = resolvePropsTypeName(componentName);

  for (const name of candidates) {
    const typeAlias = sourceFile.getTypeAlias(name);
    if (typeAlias) return typeAlias.getTypeNode();

    const iface = sourceFile.getInterface(name);
    if (iface) return undefined;
  }

  return undefined;
}

export function findPropsInterface(sourceFile: SourceFile, componentName: string) {
  const candidates = resolvePropsTypeName(componentName);
  for (const name of candidates) {
    const iface = sourceFile.getInterface(name);
    if (iface) return iface;
  }
  return undefined;
}

export function getComponentParameterType(
  sourceFile: SourceFile,
  componentName: string,
): TypeNode | undefined {
  const fn = sourceFile.getFunction(componentName);
  if (fn) {
    const param = fn.getParameters()[0];
    return param?.getTypeNode();
  }

  for (const stmt of sourceFile.getVariableStatements()) {
    for (const decl of stmt.getDeclarations()) {
      if (decl.getName() !== componentName) continue;
      const init = unwrapComponentInitializer(decl.getInitializer());
      if (init && (Node.isArrowFunction(init) || Node.isFunctionExpression(init))) {
        return init.getParameters()[0]?.getTypeNode();
      }
    }
  }

  const defaultExport = sourceFile.getDefaultExportSymbol();
  if (defaultExport) {
    for (const decl of defaultExport.getDeclarations()) {
      if (Node.isFunctionDeclaration(decl)) {
        return decl.getParameters()[0]?.getTypeNode();
      }
      if (Node.isVariableDeclaration(decl)) {
        const init = unwrapComponentInitializer(decl.getInitializer());
        if (init && (Node.isArrowFunction(init) || Node.isFunctionExpression(init))) {
          return init.getParameters()[0]?.getTypeNode();
        }
      }
    }
  }

  return undefined;
}

export function literalUnionValues(type: Type): string[] {
  if (type.isUnion()) {
    const values: string[] = [];
    for (const t of type.getUnionTypes()) {
      if (t.isStringLiteral()) {
        values.push(t.getLiteralValue() as string);
      }
    }
    if (values.length > 0) return values;
  }
  return [];
}

export { type SourceFile };
