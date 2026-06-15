import fs from "node:fs";
import { parseSync } from "oxc-parser";

// oxc-parser emits an ESTree + TypeScript AST. We walk it structurally, so a
// loose node shape (discriminated by `type`, with positions for source slicing)
// is enough — narrowing happens by checking `node.type` and casting the fields
// we touch. The test suite is the contract.
export interface AstNode {
  type: string;
  start: number;
  end: number;
  [key: string]: unknown;
}

export interface Comment {
  type: "Line" | "Block";
  value: string;
  start: number;
  end: number;
}

export interface ParsedFile {
  path: string;
  source: string;
  body: AstNode[];
  comments: Comment[];
}

export function isNode(value: unknown): value is AstNode {
  return (
    !!value && typeof value === "object" && typeof (value as { type?: unknown }).type === "string"
  );
}

/** Child node under `key`, or undefined. */
export function child(node: AstNode | undefined, key: string): AstNode | undefined {
  const v = node?.[key];
  return isNode(v) ? v : undefined;
}

/** Child node array under `key` (only the AST-node elements). */
export function children(node: AstNode | undefined, key: string): AstNode[] {
  const v = node?.[key];
  return Array.isArray(v) ? v.filter(isNode) : [];
}

export function str(node: AstNode | undefined, key: string): string | undefined {
  const v = node?.[key];
  return typeof v === "string" ? v : undefined;
}

export function text(file: ParsedFile, node: AstNode): string {
  return file.source.slice(node.start, node.end);
}

/** Does this subtree contain any JSX? Used to identify React components. */
export function containsJsx(node: AstNode): boolean {
  if (
    node.type === "JSXElement" ||
    node.type === "JSXFragment" ||
    node.type === "JSXSelfClosingElement"
  ) {
    return true;
  }
  for (const key in node) {
    if (key === "type" || key === "start" || key === "end") continue;
    const value = node[key];
    if (Array.isArray(value)) {
      for (const el of value) if (isNode(el) && containsJsx(el)) return true;
    } else if (isNode(value) && containsJsx(value)) {
      return true;
    }
  }
  return false;
}

/** The block/line comment immediately preceding `nodeStart` (whitespace only between). */
function leadingComment(file: ParsedFile, nodeStart: number): Comment | undefined {
  let best: Comment | undefined;
  for (const c of file.comments) {
    if (c.end <= nodeStart && file.source.slice(c.end, nodeStart).trim() === "") {
      if (!best || c.end > best.end) best = c;
    }
  }
  return best;
}

export function hasTideSkip(file: ParsedFile, nodeStart: number): boolean {
  const c = leadingComment(file, nodeStart);
  return !!c && /@tide-skip\b/.test(c.value);
}

/** First non-tag line of the leading JSDoc block, mirroring ts-morph's getDescription. */
export function jsDocDescription(file: ParsedFile, nodeStart: number): string | undefined {
  const c = leadingComment(file, nodeStart);
  if (!c || c.type !== "Block") return undefined;
  const lines = c.value
    .split("\n")
    .map((line) => line.replace(/^\s*\*?\s?/, "").trim())
    .filter((line) => line && !line.startsWith("@"));
  const desc = lines.join(" ").trim();
  return desc || undefined;
}

/** A file parser with a per-run cache (avoids re-parsing shared type modules). */
export interface FileParser {
  parse(absPath: string): ParsedFile | null;
}

export function createFileParser(): FileParser {
  const cache = new Map<string, ParsedFile | null>();
  return {
    parse(absPath) {
      const cached = cache.get(absPath);
      if (cached !== undefined) return cached;
      let parsed: ParsedFile | null = null;
      try {
        const source = fs.readFileSync(absPath, "utf-8");
        const result = parseSync(absPath, source);
        parsed = {
          path: absPath,
          source,
          body: (result.program.body as AstNode[]) ?? [],
          comments: (result.comments as Comment[]) ?? [],
        };
      } catch {
        parsed = null;
      }
      cache.set(absPath, parsed);
      return parsed;
    },
  };
}
