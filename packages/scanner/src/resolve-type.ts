import fs from "node:fs";
import path from "node:path";
import { ResolverFactory } from "oxc-resolver";
import {
  child,
  children,
  createFileParser,
  str,
  type AstNode,
  type FileParser,
  type ParsedFile,
} from "./oxc-ast.js";

export type { ParsedFile } from "./oxc-ast.js";

/** A type reference resolved to its concrete declaration. */
export type ResolvedType =
  | { kind: "interface"; node: AstNode; file: ParsedFile }
  | { kind: "type"; node: AstNode; file: ParsedFile };

/** Unwrap an `export` wrapper to the declaration it carries. */
function unwrapDeclaration(node: AstNode): AstNode | undefined {
  if (node.type === "ExportNamedDeclaration" || node.type === "ExportDefaultDeclaration") {
    return child(node, "declaration");
  }
  return node;
}

function declName(node: AstNode): string | undefined {
  return str(child(node, "id"), "name");
}

export class ProjectTypeResolver {
  private readonly root: string;
  private readonly parser: FileParser;
  private readonly resolver: ResolverFactory;

  constructor(root: string) {
    this.root = path.resolve(root);
    this.parser = createFileParser();
    const tsconfig = path.join(this.root, "tsconfig.json");
    this.resolver = new ResolverFactory({
      extensions: [".tsx", ".ts", ".jsx", ".js", ".mjs", ".cjs"],
      ...(fs.existsSync(tsconfig)
        ? { tsconfig: { configFile: tsconfig, references: "auto" } }
        : {}),
    });
  }

  getSourceFile(absPath: string): ParsedFile | undefined {
    return this.parser.parse(absPath) ?? undefined;
  }

  /** Resolve an import specifier to a project-local file (never node_modules). */
  resolveImport(fromAbsPath: string, specifier: string): ParsedFile | undefined {
    let resolvedPath: string | undefined;
    try {
      const result = this.resolver.sync(path.dirname(fromAbsPath), specifier);
      resolvedPath = result.path ?? undefined;
    } catch {
      resolvedPath = undefined;
    }
    if (!resolvedPath) return undefined;
    // Stay inside the project — external/`.d.ts` types are treated as unresolved.
    if (resolvedPath.includes("node_modules")) return undefined;
    if (!resolvedPath.startsWith(this.root + path.sep) && resolvedPath !== this.root)
      return undefined;
    return this.parser.parse(resolvedPath) ?? undefined;
  }

  /** Top-level interface declaration named `name`, if any. */
  findInterface(file: ParsedFile, name: string): AstNode | undefined {
    for (const stmt of file.body) {
      const decl = unwrapDeclaration(stmt);
      if (decl?.type === "TSInterfaceDeclaration" && declName(decl) === name) return decl;
    }
    return undefined;
  }

  /** The type node of a top-level type alias named `name`, if any. */
  findTypeAlias(file: ParsedFile, name: string): AstNode | undefined {
    for (const stmt of file.body) {
      const decl = unwrapDeclaration(stmt);
      if (decl?.type === "TSTypeAliasDeclaration" && declName(decl) === name) {
        return child(decl, "typeAnnotation");
      }
    }
    return undefined;
  }

  private importSpecifierFor(file: ParsedFile, name: string): string | undefined {
    for (const stmt of file.body) {
      if (stmt.type !== "ImportDeclaration") continue;
      const importsName = children(stmt, "specifiers").some(
        (s) =>
          str(child(s, "imported"), "name") === name || str(child(s, "local"), "name") === name,
      );
      if (importsName) return str(child(stmt, "source"), "value");
    }
    return undefined;
  }

  /**
   * Resolve a type node as far as possible to a concrete type node or interface
   * — following a type alias (locally or across a project-local import) and
   * unwrapping `Omit<T, …>`. Returns undefined for genuinely unresolvable
   * references (external types, missing declarations).
   */
  resolveTypeReference(node: AstNode, file: ParsedFile, depth = 0): ResolvedType | undefined {
    if (depth > 8) return undefined;
    if (node.type !== "TSTypeReference") return { kind: "type", node, file };

    const name = str(child(node, "typeName"), "name");
    if (!name) return undefined;

    // `Omit<T, …>` → resolve the source type.
    if (name === "Omit") {
      const arg = children(child(node, "typeArguments"), "params")[0];
      return arg ? this.resolveTypeReference(arg, file, depth + 1) : undefined;
    }

    // Imported from a project-local module.
    const specifier = this.importSpecifierFor(file, name);
    if (specifier) {
      const target = this.resolveImport(file.path, specifier);
      if (target) {
        const alias = this.findTypeAlias(target, name);
        if (alias) {
          return (
            this.resolveTypeReference(alias, target, depth + 1) ?? {
              kind: "type",
              node: alias,
              file: target,
            }
          );
        }
        const iface = this.findInterface(target, name);
        if (iface) return { kind: "interface", node: iface, file: target };
      }
    }

    // Declared in the same file.
    const localAlias = this.findTypeAlias(file, name);
    if (localAlias) {
      return (
        this.resolveTypeReference(localAlias, file, depth + 1) ?? {
          kind: "type",
          node: localAlias,
          file,
        }
      );
    }
    const localIface = this.findInterface(file, name);
    if (localIface) return { kind: "interface", node: localIface, file };

    return undefined;
  }
}
