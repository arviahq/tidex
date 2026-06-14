interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export function Switch({ checked, onChange }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      data-state={checked ? "checked" : "unchecked"}
      className="bb-controls__switch"
      onClick={() => onChange(!checked)}
    >
      <span className="bb-controls__switch-thumb" />
    </button>
  );
}
