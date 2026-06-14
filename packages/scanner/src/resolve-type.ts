import fs from "node:fs";
import path from "node:path";
import {
  Node,
  Project,
  type InterfaceDeclaration,
  type SourceFile,
  type TypeNode,
} from "ts-morph";

const SOURCE_EXTENSIONS = [".tsx", ".ts"];

export class ProjectTypeResolver {
  private readonly project: Project;
  private readonly root: string;
  private readonly cache = new Map<string, SourceFile>();

  constructor(root: string) {
    this.root = path.resolve(root);
    this.project = new Project({
      skipAddingFilesFromTsConfig: true,
      compilerOptions: { jsx: 2 },
    });
  }

  getSourceFile(absPath: string): SourceFile | undefined {
    const normalized = path.resolve(absPath);
    const cached = this.cache.get(normalized);
    if (cached) return cached;

    if (!normalized.startsWith(this.root + path.sep) && normalized !== this.root) {
      return undefined;
    }
    if (!fs.existsSync(normalized)) return undefined;

    try {
      const sourceFile = this.project.addSourceFileAtPath(normalized);
      this.cache.set(normalized, sourceFile);
      return sourceFile;
    } catch {
      return undefined;
    }
  }

  resolveLocalImport(fromAbsPath: string, specifier: string): SourceFile | undefined {
    if (!specifier.startsWith(".")) return undefined;

    const base = path.resolve(path.dirname(fromAbsPath), specifier);
    const candidates = [
      base,
      ...SOURCE_EXTENSIONS.map((ext) => base + ext),
      ...SOURCE_EXTENSIONS.map((ext) => path.join(base, `index${ext}`)),
    ];

    for (const candidate of candidates) {
      const sourceFile = this.getSourceFile(candidate);
      if (sourceFile) return sourceFile;
    }

    return undefined;
  }

  findTypeAlias(sourceFile: SourceFile, name: string): TypeNode | undefined {
    return sourceFile.getTypeAlias(name)?.getTypeNode();
  }

  findInterface(sourceFile: SourceFile, name: string): InterfaceDeclaration | undefined {
    return sourceFile.getInterface(name);
  }

  resolveTypeReference(
    typeNode: TypeNode,
    fromAbsPath: string,
    depth = 0,
  ): TypeNode | InterfaceDeclaration | undefined {
    if (depth > 8) return undefined;

    if (Node.isTypeReference(typeNode)) {
      const typeName = typeNode.getTypeName().getText();
      const typeArgs = typeNode.getTypeArguments();

      // Imported type: ButtonProps from './types'
      const importDecl = typeNode
        .getSourceFile()
        .getImportDeclarations()
        .find((decl) => decl.getNamedImports().some((ni) => ni.getName() === typeName));

      if (importDecl) {
        const specifier = importDecl.getModuleSpecifierValue();
        if (specifier) {
          const resolved = this.resolveLocalImport(fromAbsPath, specifier);
          if (resolved) {
            const alias = this.findTypeAlias(resolved, typeName);
            if (alias) return this.resolveTypeReference(alias, resolved.path, depth + 1) ?? alias;
            const iface = this.findInterface(resolved, typeName);
            if (iface) return iface;
          }
        }
      }

      const alias = this.findTypeAlias(typeNode.getSourceFile(), typeName);
      if (alias) return this.resolveTypeReference(alias, fromAbsPath, depth + 1) ?? alias;

      const iface = this.findInterface(typeNode.getSourceFile(), typeName);
      if (iface) return iface;

      if (typeArgs.length === 1 && typeName === "Omit") {
        return this.resolveTypeReference(typeArgs[0]!, fromAbsPath, depth + 1);
      }
    }

    return typeNode;
  }
}

export function jsDocDescription(node: {
  getJsDocs?: () => Array<{ getDescription: () => string }>;
}): string | undefined {
  if (!node.getJsDocs) return undefined;
  const text = node
    .getJsDocs()
    .map((doc) => doc.getDescription().trim())
    .find(Boolean);
  return text || undefined;
}
