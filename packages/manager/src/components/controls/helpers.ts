import type { PropSchema } from "../../api";
import { defaultArgsForProp } from "@tide/core";

/** A date control's value as a `YYYY-MM-DD` string for `<input type="date">`. */
export function toIsoDate(value: unknown): string {
  const date = value instanceof Date ? value : value ? new Date(value as string) : null;
  return date && !Number.isNaN(date.getTime()) ? date.toISOString().slice(0, 10) : "";
}

/** Coerce a value to a Set for editing. */
export function toSet(value: unknown): Set<unknown> {
  if (value instanceof Set) return value;
  if (Array.isArray(value)) return new Set(value);
  return new Set();
}

/** Coerce a value to a Map for editing (accepts a Map, an entry array, or a record). */
export function toMap(value: unknown): Map<unknown, unknown> {
  if (value instanceof Map) return value;
  if (Array.isArray(value)) return new Map(value as Array<[unknown, unknown]>);
  if (value && typeof value === "object") return new Map(Object.entries(value));
  return new Map();
}

/** A fresh default value for a schema, used when adding collection items. */
export function defaultFor(schema: PropSchema | undefined): unknown {
  if (!schema) return "";
  return defaultArgsForProp(schema);
}

/** A one-line, human-readable preview of a value for collapsed inspectors. */
export function summarize(value: unknown): string {
  if (value === null) return "null";
  if (value === undefined) return "—";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (value instanceof Set) return `Set(${value.size})`;
  if (value instanceof Map) return `Map(${value.size})`;
  if (Array.isArray(value)) return `${value.length} item${value.length === 1 ? "" : "s"}`;
  if (typeof value === "object") {
    const keys = Object.keys(value as object);
    return keys.length ? `{ ${keys.slice(0, 3).join(", ")}${keys.length > 3 ? ", …" : ""} }` : "{}";
  }
  if (typeof value === "string") return value.length > 32 ? `${value.slice(0, 32)}…` : value;
  return String(value);
}

/**
 * Serialize a value to editable JSON text for the raw-JSON escape hatch.
 * Set/Map/Date are lowered to JSON-friendly forms (array / entry-pairs / ISO)
 * so the text round-trips back through {@link jsonTextToValue}.
 */
export function valueToJsonText(schema: PropSchema | undefined, value: unknown): string {
  const lowered = lowerForJson(value);
  const fallback = schema?.type === "array" || schema?.type === "set" ? [] : {};
  return JSON.stringify(lowered ?? fallback, null, 2);
}

function lowerForJson(value: unknown): unknown {
  if (value instanceof Set) return [...value].map(lowerForJson);
  if (value instanceof Map) return [...value].map(([k, v]) => [k, lowerForJson(v)]);
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(lowerForJson);
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as object)) out[k] = lowerForJson(v);
    return out;
  }
  return value;
}

/**
 * Parse raw-JSON text back into a value of the schema's kind, re-hydrating
 * Set/Map/Date from their lowered JSON forms. Throws on invalid JSON so the
 * caller can keep the last good value while the user is mid-edit.
 */
export function jsonTextToValue(schema: PropSchema | undefined, text: string): unknown {
  const parsed = JSON.parse(text);
  switch (schema?.type) {
    case "set":
      return new Set(Array.isArray(parsed) ? parsed : []);
    case "map":
      return new Map(Array.isArray(parsed) ? (parsed as Array<[unknown, unknown]>) : []);
    case "date":
      return typeof parsed === "string" ? new Date(parsed) : parsed;
    default:
      return parsed;
  }
}

/** Schema kinds that get a collapsible inspector + raw-JSON escape hatch. */
export function isComplexSchema(schema: PropSchema): boolean {
  return (
    schema.type === "object" ||
    schema.type === "array" ||
    schema.type === "set" ||
    schema.type === "map" ||
    schema.type === "record" ||
    schema.type === "tuple" ||
    schema.type === "variant"
  );
}
