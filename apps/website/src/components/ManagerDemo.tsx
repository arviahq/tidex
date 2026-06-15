import { useState } from "react";

type DemoComponent = {
  id: string;
  group: string;
  name: string;
  props: { label: string; type: "select" | "text"; value: string; options?: string[] }[];
};

const DEMO_COMPONENTS: DemoComponent[] = [
  {
    id: "button",
    group: "Inputs",
    name: "Button",
    props: [
      { label: "variant", type: "select", value: "primary", options: ["primary", "secondary", "ghost"] },
      { label: "children", type: "text", value: "Get started" },
    ],
  },
  {
    id: "badge",
    group: "Data",
    name: "Badge",
    props: [
      { label: "variant", type: "select", value: "success", options: ["success", "warning", "danger"] },
      { label: "children", type: "text", value: "Live" },
    ],
  },
  {
    id: "alert",
    group: "Feedback",
    name: "Alert",
    props: [
      { label: "title", type: "text", value: "Scan complete" },
      { label: "children", type: "text", value: "24 components indexed." },
    ],
  },
];

function renderPreview(comp: DemoComponent, props: Record<string, string>) {
  if (comp.id === "button") {
    const variant = props.variant ?? "primary";
    return (
      <button type="button" className={`demo-btn demo-btn--${variant}`}>
        {props.children ?? "Button"}
      </button>
    );
  }
  if (comp.id === "badge") {
    const variant = props.variant ?? "success";
    return <span className={`demo-badge demo-badge--${variant}`}>{props.children ?? "Badge"}</span>;
  }
  return (
    <div className="demo-alert">
      <strong>{props.title ?? "Alert"}</strong>
      <p>{props.children ?? ""}</p>
    </div>
  );
}

export function ManagerDemo() {
  const [selectedId, setSelectedId] = useState("button");
  const [propValues, setPropValues] = useState<Record<string, Record<string, string>>>(() => {
    const initial: Record<string, Record<string, string>> = {};
    for (const comp of DEMO_COMPONENTS) {
      initial[comp.id] = Object.fromEntries(comp.props.map((p) => [p.label, p.value]));
    }
    return initial;
  });

  const selected = DEMO_COMPONENTS.find((c) => c.id === selectedId) ?? DEMO_COMPONENTS[0];
  const groups = [...new Set(DEMO_COMPONENTS.map((c) => c.group))];

  return (
    <div className="manager-demo">
      <div className="manager-demo__chrome">
        <span className="manager-demo__dot" />
        <span className="manager-demo__dot" />
        <span className="manager-demo__dot" />
        <span className="manager-demo__url">localhost:6006</span>
      </div>
      <div className="manager-demo__layout">
        <aside className="manager-demo__sidebar">
          <div className="manager-demo__sidebar-header">Components</div>
          {groups.map((group) => (
            <div key={group} className="manager-demo__group">
              <div className="manager-demo__group-label">{group}</div>
              {DEMO_COMPONENTS.filter((c) => c.group === group).map((comp) => (
                <button
                  key={comp.id}
                  type="button"
                  className={`manager-demo__item${selectedId === comp.id ? " manager-demo__item--active" : ""}`}
                  onClick={() => setSelectedId(comp.id)}
                >
                  {comp.name}
                </button>
              ))}
            </div>
          ))}
        </aside>

        <main className="manager-demo__preview">
          <div className="manager-demo__preview-toolbar">
            <span className="manager-demo__tab manager-demo__tab--active">Preview</span>
            <span className="manager-demo__tab">Variants</span>
          </div>
          <div className="manager-demo__canvas">
            {renderPreview(selected, propValues[selected.id] ?? {})}
          </div>
        </main>

        <aside className="manager-demo__panel">
          <div className="manager-demo__panel-tabs">
            <span className="manager-demo__panel-tab manager-demo__panel-tab--active">Props</span>
            <span className="manager-demo__panel-tab">Docs</span>
            <span className="manager-demo__panel-tab">Tests</span>
          </div>
          <div className="manager-demo__controls">
            {selected.props.map((prop) => (
              <label key={prop.label} className="manager-demo__control">
                <span className="manager-demo__control-label">{prop.label}</span>
                {prop.type === "select" ? (
                  <select
                    value={propValues[selected.id]?.[prop.label] ?? prop.value}
                    onChange={(e) =>
                      setPropValues((prev) => ({
                        ...prev,
                        [selected.id]: { ...prev[selected.id], [prop.label]: e.target.value },
                      }))
                    }
                  >
                    {prop.options?.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={propValues[selected.id]?.[prop.label] ?? prop.value}
                    onChange={(e) =>
                      setPropValues((prev) => ({
                        ...prev,
                        [selected.id]: { ...prev[selected.id], [prop.label]: e.target.value },
                      }))
                    }
                  />
                )}
              </label>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}
