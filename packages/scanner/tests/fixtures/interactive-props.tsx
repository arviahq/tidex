// Canonical / convention handlers, not invoked in the body — pure naming inference.
export type DialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedKeys: Set<string>;
  onSelectionChange: (keys: Set<string>) => void;
};

export function Dialog({ open, selectedKeys }: DialogProps) {
  return (
    <div>
      {open ? "open" : "closed"}
      {[...selectedKeys].join(",")}
    </div>
  );
}

// Native `value` + `onChange`: the call site `onChange(e)` confirms the
// relationship via source, but the strategy stays the convention's event-value
// (the component forwards the whole event).
export type FieldProps = {
  value: string;
  onChange: (event: { target: { value: string } }) => void;
};

export function Field({ value, onChange }: FieldProps) {
  return <input value={value} onChange={(e) => onChange(e)} />;
}

// Source reveals a concrete toggle strategy that refines the convention.
export type SwitchProps = {
  active: boolean;
  onActivate: (active: boolean) => void;
};

export function Switch({ active, onActivate }: SwitchProps) {
  return (
    <button type="button" onClick={() => onActivate(!active)}>
      {active ? "on" : "off"}
    </button>
  );
}
