import path from "node:path";
import {
  Node,
  Project,
  SyntaxKind,
  type SourceFile,
  type Type,
  type TypeNode,
} from "ts-morph";
import type { ComponentEntry } from "@tide/core";

const PASCAL_CASE = /^[A-Z][a-zA-Z0-9]*$/;

export function isPascalCase(name: string): boolean {
  return PASCAL_CASE.test(name);
}

function hasJsx(node: Node): boolean {
  return node.getDescendantsOfKind(SyntaxKind.JsxElement).length > 0
    || node.getDescendantsOfKind(SyntaxKind.JsxSelfClosingElement).length > 0
    || node.getDescendantsOfKind(SyntaxKind.JsxFragment).length > 0;
}

function deriveTitle(filePath: string, componentName: string, root: string): string {
  const rel = path.relative(root, filePath).replace(/\\/g, "/");
  const parts = rel.split("/");
  parts.pop();
  if (parts[0] === "src") parts.shift();
  if (parts.length === 0) return componentName;
  const category = parts.map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join("/");
  return `${category}/${componentName}`;
}

function getComponentNameFromFunction(name: string | undefined, filePath: string): string | null {
  if (name && isPascalCase(name)) return name;
  const base = path.basename(filePath, path.extname(filePath));
  return isPascalCase(base) ? base : null;
}

export function discoverComponents(root: string, files: string[]): ComponentEntry[] {
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

    // export function Button() {}
    for (const fn of sourceFile.getFunctions()) {
      if (!fn.isExported()) continue;
      if (fn.isDefaultExport()) continue;
      const name = fn.getName();
      const componentName = getComponentNameFromFunction(name, absPath);
      if (!componentName || !hasJsx(fn)) continue;
      const key = `${relPath}:${componentName}`;
      if (seen.has(key)) continue;
      seen.add(key);
      entries.push({
        name: componentName,
        path: relPath,
        exportName: componentName,
        title: deriveTitle(absPath, componentName, root),
        isDefault: false,
      });
    }

    // export default function Button() {}
    const defaultExport = sourceFile.getDefaultExportSymbol();
    if (defaultExport) {
      const decls = defaultExport.getDeclarations();
      for (const decl of decls) {
        if (Node.isFunctionDeclaration(decl) && hasJsx(decl)) {
          const name = getComponentNameFromFunction(decl.getName(), absPath) ?? path.basename(absPath, ".tsx");
          const key = `${relPath}:${name}:default`;
          if (!seen.has(key)) {
            seen.add(key);
            entries.push({
              name,
              path: relPath,
              exportName: "default",
              title: deriveTitle(absPath, name, root),
              isDefault: true,
            });
          }
        }
      }
    }

    // export const Button = () => {}
    for (const stmt of sourceFile.getVariableStatements()) {
      if (!stmt.isExported()) continue;
      for (const decl of stmt.getDeclarations()) {
        const name = decl.getName();
        if (!isPascalCase(name)) continue;
        const init = decl.getInitializer();
        if (!init) continue;
        if (Node.isArrowFunction(init) || Node.isFunctionExpression(init)) {
          if (!hasJsx(init)) continue;
          const key = `${relPath}:${name}`;
          if (seen.has(key)) continue;
          seen.add(key);
          entries.push({
            name,
            path: relPath,
            exportName: name,
            title: deriveTitle(absPath, name, root),
            isDefault: false,
          });
        }
      }
    }
  }

  return entries.sort((a, b) => a.title.localeCompare(b.title));
}

export function resolvePropsTypeName(componentName: string): string[] {
  return [
    `${componentName}Props`,
    `Props`,
    `I${componentName}Props`,
  ];
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
    if (iface) return undefined; // handled via interface extraction
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

export function getComponentParameterType(sourceFile: SourceFile, componentName: string): TypeNode | undefined {
  const fn = sourceFile.getFunction(componentName);
  if (fn) {
    const param = fn.getParameters()[0];
    return param?.getTypeNode();
  }

  for (const stmt of sourceFile.getVariableStatements()) {
    for (const decl of stmt.getDeclarations()) {
      if (decl.getName() !== componentName) continue;
      const init = decl.getInitializer();
      if (Node.isArrowFunction(init) || Node.isFunctionExpression(init)) {
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
        const init = decl.getInitializer();
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
