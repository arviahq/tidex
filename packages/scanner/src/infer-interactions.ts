import path from "node:path";
import {
  getComponentId,
  type BindingsMap,
  type ComponentEntry,
  type ExtractStrategy,
  type InteractionBinding,
  type PropsMap,
} from "@tidex/core";
import {
  child,
  children,
  createFileParser,
  str,
  walk,
  type AstNode,
  type FileParser,
  type ParsedFile,
} from "./oxc-ast.js";

// Handlers whose controlled prop / extraction can't be derived from the generic
// `on<X>Change` rule. High confidence — these are stable library conventions.
const CANONICAL: Record<string, { prop: string; strategy: ExtractStrategy }> = {
  onOpenChange: { prop: "open", strategy: "first-arg" },
  onValueChange: { prop: "value", strategy: "first-arg" },
  onCheckedChange: { prop: "checked", strategy: "first-arg" },
  onSelectionChange: { prop: "selectedKeys", strategy: "set" },
  onExpandedChange: { prop: "expanded", strategy: "first-arg" },
  onCollapsedChange: { prop: "collapsed", strategy: "first-arg" },
  onPageChange: { prop: "page", strategy: "first-arg" },
  onSortChange: { prop: "sort", strategy: "object" },
  onSortingChange: { prop: "sorting", strategy: "object" },
  onFiltersChange: { prop: "filters", strategy: "object" },
  onFilterChange: { prop: "filter", strategy: "object" },
  onPaginationChange: { prop: "pagination", strategy: "object" },
  onRowSelectionChange: { prop: "rowSelection", strategy: "object" },
  onQueryChange: { prop: "query", strategy: "first-arg" },
  onSearchChange: { prop: "search", strategy: "first-arg" },
};

// Lower-confidence pairs (no `…Change` suffix). Emitted for runtime verification.
const MEDIUM: Record<string, { prop: string; strategy: ExtractStrategy }> = {
  onActivate: { prop: "active", strategy: "toggle" },
  onSelect: { prop: "selected", strategy: "first-arg" },
  onShow: { prop: "visible", strategy: "constant-true" },
  onHide: { prop: "visible", strategy: "constant-false" },
  onOpen: { prop: "open", strategy: "constant-true" },
  onClose: { prop: "open", strategy: "constant-false" },
};

function lowerFirst(s: string): string {
  return s.charAt(0).toLowerCase() + s.slice(1);
}

/** Pair a handler with a controlled prop using naming conventions (no source needed). */
function conventionBinding(
  handler: string,
  stateProps: Set<string>,
): InteractionBinding | undefined {
  const make = (
    prop: string,
    strategy: ExtractStrategy,
    confidence: InteractionBinding["confidence"],
  ): InteractionBinding | undefined =>
    stateProps.has(prop)
      ? { stateProp: prop, handler, strategy, confidence, source: "convention" }
      : undefined;

  const canonical = CANONICAL[handler];
  if (canonical) {
    const b = make(canonical.prop, canonical.strategy, "high");
    if (b) return b;
  }

  const change = /^on([A-Z]\w*)Change$/.exec(handler);
  if (change) {
    const b = make(lowerFirst(change[1]!), "first-arg", "high");
    if (b) return b;
  }

  // Native form convention: `value`/`checked` controlled by a plain `onChange`.
  if (handler === "onChange") {
    return make("value", "event-value", "high") ?? make("checked", "event-checked", "high");
  }

  const medium = MEDIUM[handler];
  if (medium) return make(medium.prop, medium.strategy, "medium");

  return undefined;
}

// ---- static pass: refine strategy from the component's handler call sites ----

/** Find the component's function node (declaration / arrow / default export). */
function findComponentFn(file: ParsedFile, name: string): AstNode | undefined {
  let found: AstNode | undefined;
  for (const stmt of file.body) {
    const decl =
      stmt.type === "ExportNamedDeclaration" || stmt.type === "ExportDefaultDeclaration"
        ? child(stmt, "declaration")
        : stmt;
    if (!decl) continue;
    if (decl.type === "FunctionDeclaration" && str(child(decl, "id"), "name") === name) return decl;
    if (decl.type === "VariableDeclaration") {
      for (const d of children(decl, "declarations")) {
        if (str(child(d, "id"), "name") !== name) continue;
        const init = child(d, "init");
        if (init?.type === "ArrowFunctionExpression" || init?.type === "FunctionExpression") {
          return init;
        }
      }
    }
    if (stmt.type === "ExportDefaultDeclaration" && decl.type === "FunctionDeclaration")
      found = decl;
  }
  return found;
}

/** Names of handler props the component destructures from its first parameter. */
function destructuredParamNames(fn: AstNode): { destructured: Set<string>; propsVar?: string } {
  const param = children(fn, "params")[0];
  const destructured = new Set<string>();
  if (!param) return { destructured };
  if (param.type === "ObjectPattern") {
    for (const prop of children(param, "properties")) {
      const key = str(child(prop, "key"), "name");
      if (key) destructured.add(key);
    }
    return { destructured };
  }
  if (param.type === "Identifier") return { destructured, propsVar: str(param, "name") };
  return { destructured };
}

/** Conventional event-parameter names — a forwarded one stays ambiguous. */
const EVENT_PARAM_NAMES = new Set(["e", "ev", "evt", "event"]);

/**
 * Infer the extraction strategy from the first argument passed to a handler
 * call. Returns `undefined` when the argument is ambiguous (a forwarded event
 * param) so the naming convention's guess stands; returns a concrete strategy
 * for anything that is plainly an event read, a toggle, a constant, or a value.
 */
function strategyFromArg(arg: AstNode | undefined): ExtractStrategy | undefined {
  if (!arg) return undefined;
  if (arg.type === "Identifier") {
    // `onChange(e)` forwards the whole event — leave the convention's
    // event-value/checked guess in place. Any other identifier (`onChange(next)`)
    // holds a value the component already computed, so it's a first-arg.
    const name = (str(arg, "name") ?? "").toLowerCase();
    return EVENT_PARAM_NAMES.has(name) ? undefined : "first-arg";
  }
  if (arg.type === "MemberExpression") {
    const prop = str(child(arg, "property"), "name");
    const objProp = str(child(child(arg, "object"), "property"), "name");
    if (objProp === "target" && prop === "value") return "event-value";
    if (objProp === "target" && prop === "checked") return "event-checked";
    return "first-arg";
  }
  if (arg.type === "UnaryExpression" && str(arg, "operator") === "!") return "toggle";
  if (arg.type === "Literal") {
    if (arg.value === true) return "constant-true";
    if (arg.value === false) return "constant-false";
    return "first-arg";
  }
  // CallExpression (`Number(e.target.value)`), BinaryExpression (`value + 1`),
  // ConditionalExpression, etc. all resolve to a concrete value.
  return "first-arg";
}

/**
 * Map handler name → strategy observed at its call sites inside the component
 * body. A handler is recorded even when its argument is ambiguous (value
 * `undefined`) — the call site still confirms the handler↔prop relationship; a
 * later concrete observation upgrades the ambiguous one.
 */
function staticStrategies(
  file: ParsedFile,
  name: string,
): Map<string, ExtractStrategy | undefined> {
  const out = new Map<string, ExtractStrategy | undefined>();
  const fn = findComponentFn(file, name);
  if (!fn) return out;
  const { destructured, propsVar } = destructuredParamNames(fn);

  walk(fn, (node) => {
    if (node.type !== "CallExpression") return;
    const callee = child(node, "callee");
    if (!callee) return;
    let handler: string | undefined;
    if (callee.type === "Identifier") {
      const n = str(callee, "name");
      if (n && destructured.has(n)) handler = n;
    } else if (callee.type === "MemberExpression" && propsVar) {
      if (str(child(callee, "object"), "name") === propsVar)
        handler = str(child(callee, "property"), "name");
    }
    if (!handler || !/^on[A-Z]/.test(handler)) return;
    const strategy = strategyFromArg(children(node, "arguments")[0]);
    if (!out.has(handler) || (out.get(handler) === undefined && strategy !== undefined)) {
      out.set(handler, strategy);
    }
  });

  return out;
}

/** Infer interaction bindings for one component (convention + static refinement). */
export function inferComponentBindings(
  file: ParsedFile | undefined,
  componentName: string,
  props: Record<string, { type: string }>,
): InteractionBinding[] {
  const stateProps = new Set<string>();
  const handlers: string[] = [];
  for (const [propName, schema] of Object.entries(props)) {
    if (schema.type === "callback") handlers.push(propName);
    else stateProps.add(propName);
  }

  const observed = file
    ? staticStrategies(file, componentName)
    : new Map<string, ExtractStrategy | undefined>();
  const bindings: InteractionBinding[] = [];

  for (const handler of handlers) {
    const binding = conventionBinding(handler, stateProps);
    if (!binding) continue;
    if (observed.has(handler)) {
      // The call site confirms the handler↔prop relationship (source: static,
      // promote medium→high). A concrete observed strategy refines the
      // convention's guess; an ambiguous one (a forwarded event param) leaves
      // the convention's event-value/checked strategy in place.
      const seen = observed.get(handler);
      if (seen) binding.strategy = seen;
      binding.source = "static";
      if (binding.confidence === "medium") binding.confidence = "high";
    }
    bindings.push(binding);
  }

  return bindings;
}

/** Infer bindings for every component, keyed by component id. */
export function inferInteractions(
  root: string,
  components: ComponentEntry[],
  props: PropsMap,
  parser: FileParser = createFileParser(),
): BindingsMap {
  const result: BindingsMap = {};
  for (const component of components) {
    const id = getComponentId(component);
    const file = parser.parse(path.join(root, component.path)) ?? undefined;
    const bindings = inferComponentBindings(file, component.name, props[id] ?? {});
    if (bindings.length > 0) result[id] = bindings;
  }
  return result;
}
