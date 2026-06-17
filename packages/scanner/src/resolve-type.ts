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

const TS_PARSEABLE = /\.(d\.ts|tsx?|jsx?|mjs|cjs)$/;
// The TypeScript standard library declarations (`lib.dom.d.ts`, `lib.es2020.d.ts`,
// …). Huge, full of ambient globals, and only resolvable by the compiler itself.
const TS_LIB_RE = /[\\/]typescript[\\/]lib[\\/]lib\.[^\\/]+\.d\.ts$/;

/** Does a parsed module declare any type alias or interface we could resolve to? */
function hasTypeDecls(file: ParsedFile): boolean {
  for (const stmt of file.body) {
    const decl = unwrapDeclaration(stmt);
    if (decl?.type === "TSTypeAliasDeclaration" || decl?.type === "TSInterfaceDeclaration") {
      return true;
    }
  }
  return false;
}

/** Strip `//` and block comments from JSONC, respecting string literals. */
function stripJsonComments(input: string): string {
  let out = "";
  let inString = false;
  let inLine = false;
  let inBlock = false;
  for (let i = 0; i < input.length; i++) {
    const c = input[i];
    const next = input[i + 1];
    if (inLine) {
      if (c === "\n") {
        inLine = false;
        out += c;
      }
      continue;
    }
    if (inBlock) {
      if (c === "*" && next === "/") {
        inBlock = false;
        i++;
      }
      continue;
    }
    if (inString) {
      out += c;
      if (c === "\\") {
        out += next ?? "";
        i++;
      } else if (c === '"') {
        inString = false;
      }
      continue;
    }
    if (c === '"') {
      inString = true;
      out += c;
    } else if (c === "/" && next === "/") {
      inLine = true;
      i++;
    } else if (c === "/" && next === "*") {
      inBlock = true;
      i++;
    } else {
      out += c;
    }
  }
  return out;
}

/**
 * Read `compilerOptions.rootDirs` as absolute paths. TypeScript treats files
 * mirrored across these dirs as one virtual directory — codegen tools that emit
 * a `.d.ts` into a parallel dir for a non-TS source rely on it, but module
 * resolvers don't apply it, so we read it to find those generated declarations.
 */
function readRootDirs(tsconfigPath: string, root: string): string[] {
  try {
    const raw = fs.readFileSync(tsconfigPath, "utf-8");
    const json = JSON.parse(stripJsonComments(raw)) as {
      compilerOptions?: { rootDirs?: unknown };
    };
    const dirs = json.compilerOptions?.rootDirs;
    if (!Array.isArray(dirs)) return [];
    return dirs.filter((d): d is string => typeof d === "string").map((d) => path.resolve(root, d));
  } catch {
    return [];
  }
}

export class ProjectTypeResolver {
  private readonly root: string;
  private readonly parser: FileParser;
  private readonly resolver: ResolverFactory;
  private readonly rootDirs: string[];

  constructor(root: string) {
    this.root = path.resolve(root);
    this.parser = createFileParser();
    const tsconfig = path.join(this.root, "tsconfig.json");
    const hasTsconfig = fs.existsSync(tsconfig);
    this.rootDirs = hasTsconfig ? readRootDirs(tsconfig, this.root) : [];
    this.resolver = new ResolverFactory({
      extensions: [".tsx", ".ts", ".jsx", ".js", ".mjs", ".cjs"],
      ...(hasTsconfig ? { tsconfig: { configFile: tsconfig, references: "auto" } } : {}),
    });
  }

  /**
   * Declaration candidates for a resolved path, best first. When the resolver
   * lands on a non-TS source (e.g. a generated `.graphql`/`.proto`/DSL file),
   * prefer the `.d.ts` mirrored through `rootDirs` (`src/x.ext` → a parallel
   * `gen-dir/x.ext.d.ts`).
   */
  private declCandidates(resolvedPath: string): string[] {
    const remaps: string[] = [];
    for (const from of this.rootDirs) {
      const prefix = from + path.sep;
      if (!resolvedPath.startsWith(prefix)) continue;
      const rel = resolvedPath.slice(prefix.length);
      for (const to of this.rootDirs) {
        if (to === from) continue;
        const base = path.join(to, rel);
        remaps.push(`${base}.d.ts`, `${base}.ts`, `${base}.tsx`);
      }
    }
    // A TS source resolves to itself first; a codegen source defers to its mirror.
    return TS_PARSEABLE.test(resolvedPath) ? [resolvedPath, ...remaps] : [...remaps, resolvedPath];
  }

  getSourceFile(absPath: string): ParsedFile | undefined {
    return this.parser.parse(absPath) ?? undefined;
  }

  /**
   * Resolve an import specifier to a parsed declaration file. Project-local
   * sources are preferred (and `rootDirs`-mirrored to their generated `.d.ts`);
   * `node_modules` package types are also resolved so small imported unions/enums
   * surface — large external objects are bounded downstream by a member cap, and
   * the TS lib globals (`lib.dom`, `lib.es*`) are skipped since they can't be
   * resolved without the compiler and would only ever explode.
   */
  resolveImport(fromAbsPath: string, specifier: string): ParsedFile | undefined {
    let resolvedPath: string | undefined;
    try {
      const result = this.resolver.sync(path.dirname(fromAbsPath), specifier);
      resolvedPath = result.path ?? undefined;
    } catch {
      resolvedPath = undefined;
    }
    if (!resolvedPath) return undefined;
    if (TS_LIB_RE.test(resolvedPath)) return undefined;

    if (resolvedPath.includes("node_modules")) {
      const parsed = this.parser.parse(resolvedPath);
      return parsed && hasTypeDecls(parsed) ? parsed : undefined;
    }

    if (!resolvedPath.startsWith(this.root + path.sep) && resolvedPath !== this.root)
      return undefined;
    for (const candidate of this.declCandidates(resolvedPath)) {
      const parsed = this.parser.parse(candidate);
      if (parsed && hasTypeDecls(parsed)) return parsed;
    }
    return undefined;
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

  /**
   * Find the import that binds `name` locally, returning the module specifier
   * and the *imported* (original export) name — which differs from `name` when
   * aliased (`import { Foo as Bar }` referenced as `Bar`), so the target module
   * is searched by `Foo`, not `Bar`.
   */
  private importBindingFor(
    file: ParsedFile,
    name: string,
  ): { specifier: string; importedName: string } | undefined {
    for (const stmt of file.body) {
      if (stmt.type !== "ImportDeclaration") continue;
      for (const s of children(stmt, "specifiers")) {
        const local = str(child(s, "local"), "name");
        const imported = str(child(s, "imported"), "name") ?? local;
        if (local === name || imported === name) {
          const specifier = str(child(stmt, "source"), "value");
          if (specifier) return { specifier, importedName: imported ?? name };
        }
      }
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

    // Utility types that preserve the underlying object's members (only the
    // optionality/readonly/nullability differs) → resolve their source type.
    // The member-set is what matters for control generation, so the modifier is
    // safely ignored.
    if (
      name === "Omit" ||
      name === "Partial" ||
      name === "Required" ||
      name === "Readonly" ||
      name === "NonNullable"
    ) {
      const arg = children(child(node, "typeArguments"), "params")[0];
      return arg ? this.resolveTypeReference(arg, file, depth + 1) : undefined;
    }

    // Imported from a project-local module.
    const binding = this.importBindingFor(file, name);
    if (binding) {
      const target = this.resolveImport(file.path, binding.specifier);
      if (target) {
        const alias = this.findTypeAlias(target, binding.importedName);
        if (alias) {
          return (
            this.resolveTypeReference(alias, target, depth + 1) ?? {
              kind: "type",
              node: alias,
              file: target,
            }
          );
        }
        const iface = this.findInterface(target, binding.importedName);
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
