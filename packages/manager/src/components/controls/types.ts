import type { PropSchema } from "../../api";

/** Props every control node receives. Controls compose locally: a container
 * control calls `onChange` with its whole next value, built from child changes. */
export interface ControlNodeProps {
  schema: PropSchema;
  value: unknown;
  onChange: (next: unknown) => void;
  /** Label for this node (prop name, object key, or tuple slot). */
  name: string;
  /** Nesting depth — drives indentation and default-collapsed heuristics. */
  depth: number;
  /** Active search query (lowercased); empty when not filtering. */
  query?: string;
}
