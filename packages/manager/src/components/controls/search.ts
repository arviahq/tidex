import type { PropSchema } from "../../api";

/**
 * Does a field named `name` (or anything nested under it) match `query`?
 * Used to filter object inspectors while searching. Recurses into object
 * properties, array/set/tuple elements, and map/variant shapes so a query like
 * `role` surfaces `User.role`, `members[].role`, etc.
 */
export function matchesQuery(name: string, schema: PropSchema, query: string, depth = 0): boolean {
  if (!query) return true;
  if (name.toLowerCase().includes(query)) return true;
  if (depth > 6) return false;

  switch (schema.type) {
    case "object":
      return Object.entries(schema.properties).some(([k, child]) =>
        matchesQuery(k, child, query, depth + 1),
      );
    case "array":
    case "set":
      return schema.element ? matchesQuery(name, schema.element, query, depth + 1) : false;
    case "tuple":
      return schema.elements.some((el, i) =>
        matchesQuery(schema.labels?.[i] ?? name, el, query, depth + 1),
      );
    case "map":
    case "record":
      return schema.value ? matchesQuery(name, schema.value, query, depth + 1) : false;
    case "variant":
      return schema.variants.some((v) => matchesQuery(name, v.schema, query, depth + 1));
    default:
      return false;
  }
}
