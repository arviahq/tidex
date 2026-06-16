import { coerceUnionValue } from "@tide/react";
import { Switch } from "../Switch";
import type { ControlNodeProps } from "./types";
import { toIsoDate } from "./helpers";

export function BooleanControl({ value, onChange }: ControlNodeProps) {
  return <Switch checked={Boolean(value)} onChange={(next) => onChange(next)} />;
}

export function StringControl({ schema, value, onChange, name }: ControlNodeProps) {
  const meta = "meta" in schema ? schema.meta : undefined;
  const str = value == null ? "" : String(value);

  if (meta?.format === "color") {
    return (
      <div className="bb-controls__color">
        <input
          type="color"
          className="bb-controls__color-swatch"
          value={/^#[0-9a-f]{6}$/i.test(str) ? str : "#000000"}
          onChange={(event) => onChange(event.target.value)}
          aria-label={`${name} color`}
        />
        <input
          type="text"
          className="bb-controls__input bb-controls__input--text bb-controls__color-hex"
          value={str}
          onChange={(event) => onChange(event.target.value)}
        />
      </div>
    );
  }

  if (meta?.format === "multiline") {
    return (
      <textarea
        className="bb-controls__input bb-controls__textarea"
        value={str}
        maxLength={meta.maxLength}
        onChange={(event) => onChange(event.target.value)}
      />
    );
  }

  const inputType =
    meta?.secret || meta?.format === "password"
      ? "password"
      : meta?.format === "url"
        ? "url"
        : meta?.format === "email"
          ? "email"
          : "text";

  return (
    <input
      type={inputType}
      className="bb-controls__input bb-controls__input--text"
      value={str}
      maxLength={meta?.maxLength}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}

export function NumberControl({ schema, value, onChange }: ControlNodeProps) {
  const meta = "meta" in schema ? schema.meta : undefined;
  const num = value == null || value === "" ? "" : String(value);
  const commit = (raw: string) => onChange(raw === "" ? 0 : Number(raw));

  if (meta?.slider && meta.min != null && meta.max != null) {
    return (
      <div className="bb-controls__slider">
        <input
          type="range"
          className="bb-controls__range"
          min={meta.min}
          max={meta.max}
          step={meta.step ?? 1}
          value={num === "" ? meta.min : Number(num)}
          onChange={(event) => commit(event.target.value)}
        />
        <output className="bb-controls__slider-value">{num === "" ? meta.min : num}</output>
      </div>
    );
  }

  return (
    <input
      type="number"
      className="bb-controls__input bb-controls__input--number"
      value={num}
      min={meta?.min}
      max={meta?.max}
      step={meta?.step}
      onChange={(event) => commit(event.target.value)}
    />
  );
}

export function DateControl({ value, onChange }: ControlNodeProps) {
  return (
    <input
      type="date"
      className="bb-controls__input bb-controls__input--text"
      value={toIsoDate(value)}
      // Keep the value a real Date — postMessage's structured clone preserves
      // it, so the component receives a Date, not a string.
      onChange={(event) => onChange(event.target.value ? new Date(event.target.value) : null)}
    />
  );
}

export function UnionControl({ schema, value, onChange, name }: ControlNodeProps) {
  if (schema.type !== "union") return null;
  const valueType = schema.valueType;
  // A long option list overflows a segmented control — fall back to a select.
  if (schema.values.length > 5) {
    return (
      <select
        className="bb-controls__input bb-controls__select"
        value={String(value)}
        onChange={(event) => onChange(coerceUnionValue(event.target.value, valueType))}
      >
        {schema.values.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    );
  }

  return (
    <div className="bb-controls__segmented" role="group" aria-label={name}>
      {schema.values.map((option) => (
        <button
          key={option}
          type="button"
          className="bb-controls__segment"
          data-active={String(value) === option ? "true" : undefined}
          onClick={() => onChange(coerceUnionValue(option, valueType))}
        >
          {option}
        </button>
      ))}
    </div>
  );
}

export function UnknownControl({ schema }: ControlNodeProps) {
  const typeText = schema.type === "unknown" ? schema.typeText : undefined;
  return (
    <span className="bb-controls__unknown" title={typeText}>
      {typeText ? <code>{typeText}</code> : "unsupported type"}
    </span>
  );
}
