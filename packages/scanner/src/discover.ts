import path from "node:path";
import type { ComponentEntry } from "@tidex/core";
import {
  child,
  children,
  containsJsx,
  createFileParser,
  hasTidexSkip,
  str,
  text,
  type AstNode,
  type ParsedFile,
} from "./oxc-ast.js";

const PASCAL_CASE = /^[A-Z][a-zA-Z0-9]*$/;

export interface DiscoverOptions {
  componentsDir?: string;
}

export function isPascalCase(name: string): boolean {
  return PASCAL_CASE.test(name);
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

function componentNameFromFn(name: string | undefined, filePath: string): string | null {
  if (name && isPascalCase(name)) return name;
  const base = path.basename(filePath, path.extname(filePath));
  return isPascalCase(base) ? base : null;
}

function calleeName(file: ParsedFile, callExpr: AstNode): string {
  const callee = child(callExpr, "callee");
  if (!callee) return "";
  if (callee.type === "Identifier") return str(callee, "name") ?? "";
  return text(file, callee);
}

/**
 * Unwrap an initializer to the inner component function, seeing through:
 *  - `forwardRef(fn)` / `memo(fn)` wrappers,
 *  - `Object.assign(Root, { Sub })` compound components (the root is the first arg),
 *  - bare identifier references (e.g. `Object.assign(TabsRoot, …)` where `TabsRoot`
 *    is a local `const`/`function` declaration), resolved to their local declaration.
 * `seen` guards against cyclic references (`const A = A`).
 */
function unwrapComponentInit(
  file: ParsedFile,
  node: AstNode | undefined,
  seen: Set<string> = new Set(),
): AstNode | undefined {
  if (!node) return undefined;
  if (node.type === "Identifier") {
    const name = str(node, "name");
    if (!name || seen.has(name)) return undefined;
    seen.add(name);
    return unwrapComponentInit(file, findLocalDecl(file, name), seen);
  }
  if (node.type === "CallExpression") {
    const callee = calleeName(file, node);
    if (
      callee === "forwardRef" ||
      callee.endsWith(".forwardRef") ||
      callee === "memo" ||
      callee.endsWith(".memo") ||
      callee === "Object.assign"
    ) {
      return unwrapComponentInit(file, children(node, "arguments")[0], seen);
    }
  }
  return node;
}

/** Is this initializer a function that returns JSX (a React component)? */
function isComponentInitializer(file: ParsedFile, node: AstNode | undefined): boolean {
  const unwrapped = unwrapComponentInit(file, node);
  if (!unwrapped) return false;
  if (
    unwrapped.type === "ArrowFunctionExpression" ||
    unwrapped.type === "FunctionExpression" ||
    unwrapped.type === "FunctionDeclaration"
  ) {
    return containsJsx(unwrapped);
  }
  return false;
}

/**
 * Resolve a local top-level binding to the node worth testing as a component:
 * the variable's initializer for `const X = …`, or the declaration itself for
 * `function X() {}`. Used to follow identifier references (default-export
 * aliases and `Object.assign` roots) back to their definition.
 */
function findLocalDecl(file: ParsedFile, name: string): AstNode | undefined {
  for (const stmt of file.body) {
    const decl = stmt.type === "ExportNamedDeclaration" ? child(stmt, "declaration") : stmt;
    if (decl?.type === "VariableDeclaration") {
      for (const d of children(decl, "declarations")) {
        if (str(child(d, "id"), "name") === name) return child(d, "init");
      }
    } else if (decl?.type === "FunctionDeclaration" && str(child(decl, "id"), "name") === name) {
      return decl;
    }
  }
  return undefined;
}

export function discoverComponents(
  root: string,
  files: string[],
  options: DiscoverOptions = {},
): ComponentEntry[] {
  const parser = createFileParser();
  const entries: ComponentEntry[] = [];
  const seen = new Set<string>();

  for (const file of files) {
    const absPath = path.isAbsolute(file) ? file : path.join(root, file);
    const parsed = parser.parse(absPath);
    if (!parsed) continue;

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

    for (const stmt of parsed.body) {
      if (hasTidexSkip(parsed, stmt.start)) continue;

      if (stmt.type === "ExportDefaultDeclaration") {
        const decl = child(stmt, "declaration");
        if (!decl) continue;
        if (decl.type === "Identifier") {
          const refName = str(decl, "name");
          if (refName && isComponentInitializer(parsed, findLocalDecl(parsed, refName))) {
            add(isPascalCase(refName) ? refName : path.basename(absPath, ".tsx"), "default", true);
          }
        } else if (decl.type === "FunctionDeclaration") {
          if (containsJsx(decl)) {
            add(
              componentNameFromFn(str(child(decl, "id"), "name"), absPath) ??
                path.basename(absPath, ".tsx"),
              "default",
              true,
            );
          }
        } else if (isComponentInitializer(parsed, decl)) {
          add(path.basename(absPath, ".tsx"), "default", true);
        }
        continue;
      }

      if (stmt.type === "ExportNamedDeclaration") {
        const decl = child(stmt, "declaration");
        if (!decl) continue; // re-export specifiers — not a component declaration
        if (decl.type === "FunctionDeclaration") {
          if (!containsJsx(decl)) continue;
          const name = componentNameFromFn(str(child(decl, "id"), "name"), absPath);
          if (name) add(name, name, false);
        } else if (decl.type === "VariableDeclaration") {
          for (const d of children(decl, "declarations")) {
            const name = str(child(d, "id"), "name");
            if (!name || !isPascalCase(name)) continue;
            if (isComponentInitializer(parsed, child(d, "init"))) add(name, name, false);
          }
        }
      }
    }
  }

  return entries.sort((a, b) => a.title.localeCompare(b.title));
}

export function resolvePropsTypeName(componentName: string): string[] {
  return [`${componentName}Props`, `Props`, `I${componentName}Props`];
}

/** The type node of a co-located `*Props` type alias, if any (interface takes precedence elsewhere). */
export function findPropsTypeNode(file: ParsedFile, componentName: string): AstNode | undefined {
  for (const name of resolvePropsTypeName(componentName)) {
    for (const stmt of file.body) {
      const decl = stmt.type === "ExportNamedDeclaration" ? child(stmt, "declaration") : stmt;
      if (decl?.type === "TSTypeAliasDeclaration" && str(child(decl, "id"), "name") === name) {
        return child(decl, "typeAnnotation");
      }
      if (decl?.type === "TSInterfaceDeclaration" && str(child(decl, "id"), "name") === name) {
        return undefined; // interface handled by findPropsInterface
      }
    }
  }
  return undefined;
}

/** A co-located `*Props` interface, if any. */
export function findPropsInterface(file: ParsedFile, componentName: string): AstNode | undefined {
  for (const name of resolvePropsTypeName(componentName)) {
    for (const stmt of file.body) {
      const decl = stmt.type === "ExportNamedDeclaration" ? child(stmt, "declaration") : stmt;
      if (decl?.type === "TSInterfaceDeclaration" && str(child(decl, "id"), "name") === name) {
        return decl;
      }
    }
  }
  return undefined;
}

function firstParamType(fn: AstNode | undefined): AstNode | undefined {
  const param = children(fn, "params")[0];
  return child(child(param, "typeAnnotation"), "typeAnnotation");
}

/** Fall back to the component's first parameter type when there's no `*Props` declaration. */
export function getComponentParameterType(
  file: ParsedFile,
  componentName: string,
): AstNode | undefined {
  for (const stmt of file.body) {
    const decl =
      stmt.type === "ExportNamedDeclaration" || stmt.type === "ExportDefaultDeclaration"
        ? child(stmt, "declaration")
        : stmt;
    if (!decl) continue;

    if (decl.type === "FunctionDeclaration" && str(child(decl, "id"), "name") === componentName) {
      return firstParamType(decl);
    }
    if (decl.type === "VariableDeclaration") {
      for (const d of children(decl, "declarations")) {
        if (str(child(d, "id"), "name") !== componentName) continue;
        const init = unwrapComponentInit(file, child(d, "init"));
        if (
          init?.type === "ArrowFunctionExpression" ||
          init?.type === "FunctionExpression" ||
          init?.type === "FunctionDeclaration"
        ) {
          return firstParamType(init);
        }
      }
    }
    // Default export of a function (named or anonymous).
    if (stmt.type === "ExportDefaultDeclaration" && decl.type === "FunctionDeclaration") {
      return firstParamType(decl);
    }
  }
  return undefined;
}
