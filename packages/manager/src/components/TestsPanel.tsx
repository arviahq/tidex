import { useEffect, useRef, useState } from "react";
import {
  formatDisplayName,
  type AssertMatcher,
  type InteractionStep,
  type InteractionTest,
  type StepResult,
  type StepTarget,
} from "@tide/core";
import { CodeBlock } from "./CodeBlock";
import "./tests.css";

interface TestsPanelProps {
  componentName: string;
  test: InteractionTest;
  results: StepResult[];
  running: boolean;
  onChange: (test: InteractionTest) => void;
  onRun: () => void;
  onSave: () => void | Promise<void>;
}

const STEP_TYPES: InteractionStep["type"][] = ["click", "type", "wait", "assert"];
const TARGET_BYS: StepTarget["by"][] = ["role", "text", "testid", "css"];
const MATCHERS: AssertMatcher[] = ["exists", "absent", "text", "value", "checked", "disabled"];

const CLI_COMMANDS = `tide test    # runs a11y + interaction tests`;

function defaultStep(type: InteractionStep["type"]): InteractionStep {
  const target: StepTarget = { by: "role", value: "" };
  switch (type) {
    case "click":
      return { type, target };
    case "type":
      return { type, target, value: "" };
    case "wait":
      return { type, ms: 500 };
    case "assert":
      return { type, target, matcher: "exists" };
  }
}

export function TestsPanel({
  componentName,
  test,
  results,
  running,
  onChange,
  onRun,
  onSave,
}: TestsPanelProps) {
  const steps = test.steps;

  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => clearTimeout(saveTimer.current ?? undefined), []);

  const handleSave = async () => {
    clearTimeout(saveTimer.current ?? undefined);
    setSaveState("saving");
    try {
      await onSave();
      setSaveState("saved");
    } catch {
      setSaveState("error");
    }
    saveTimer.current = setTimeout(() => setSaveState("idle"), 2500);
  };

  // A single status line for the toolbar: a transient save state takes
  // precedence, otherwise the live/finished run result.
  const firstFail = results.find((r) => !r.ok);
  let status: { kind: "info" | "pass" | "fail"; text: string } | null = null;
  if (saveState === "saving") status = { kind: "info", text: "Saving…" };
  else if (saveState === "saved") status = { kind: "pass", text: "Saved ✓" };
  else if (saveState === "error") status = { kind: "fail", text: "Save failed" };
  else if (running) status = { kind: "info", text: `Running… ${results.length}/${steps.length}` };
  else if (results.length > 0)
    status = firstFail
      ? { kind: "fail", text: `Failed at step ${firstFail.index >= 0 ? firstFail.index + 1 : "?"}` }
      : { kind: "pass", text: `All ${steps.length} step${steps.length === 1 ? "" : "s"} passed` };

  const setSteps = (next: InteractionStep[]) => onChange({ ...test, steps: next });
  const updateStep = (index: number, step: InteractionStep) =>
    setSteps(steps.map((s, i) => (i === index ? step : s)));
  const removeStep = (index: number) => setSteps(steps.filter((_, i) => i !== index));
  const addStep = () => setSteps([...steps, defaultStep("click")]);

  const setTarget = (index: number, patch: Partial<StepTarget>) => {
    const step = steps[index]!;
    if (step.type === "wait") return;
    updateStep(index, { ...step, target: { ...step.target, ...patch } });
  };

  return (
    <div className="bb-tests">
      <div className="bb-tests__toolbar">
        <button
          type="button"
          className="bb-tests__btn bb-tests__btn--primary"
          onClick={onRun}
          disabled={running || steps.length === 0}
        >
          {running ? "Running…" : "Run"}
        </button>
        <button
          type="button"
          className="bb-tests__btn"
          onClick={handleSave}
          disabled={running || saveState === "saving"}
        >
          Save
        </button>
        {status && (
          <span className="bb-tests__statusline" data-kind={status.kind} role="status">
            {status.text}
          </span>
        )}
        <span className="bb-tests__spacer" />
        <button type="button" className="bb-tests__btn bb-tests__btn--ghost" onClick={addStep}>
          + Add step
        </button>
      </div>

      {steps.length === 0 ? (
        <p className="bb-tests__empty">
          No steps yet. Add steps to interact with{" "}
          <strong>{formatDisplayName(componentName)}</strong> and assert on the result.
        </p>
      ) : (
        <ol className="bb-tests__list">
          {steps.map((step, index) => {
            const result = results.find((r) => r.index === index);
            const status = result ? (result.ok ? "pass" : "fail") : undefined;
            return (
              <li key={index} className="bb-tests__row" data-status={status}>
                <span className="bb-tests__status" data-status={status} aria-hidden="true">
                  {result ? (result.ok ? "✓" : "✗") : index + 1}
                </span>

                <select
                  className="bb-tests__select"
                  value={step.type}
                  onChange={(e) =>
                    updateStep(index, defaultStep(e.target.value as InteractionStep["type"]))
                  }
                >
                  {STEP_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>

                {step.type === "wait" ? (
                  <label className="bb-tests__ms">
                    <input
                      type="number"
                      className="bb-tests__input bb-tests__input--ms"
                      value={step.ms}
                      onChange={(e) =>
                        updateStep(index, { ...step, ms: Number(e.target.value) || 0 })
                      }
                    />
                    ms
                  </label>
                ) : (
                  <>
                    <select
                      className="bb-tests__select"
                      value={step.target.by}
                      onChange={(e) => setTarget(index, { by: e.target.value as StepTarget["by"] })}
                    >
                      {TARGET_BYS.map((b) => (
                        <option key={b} value={b}>
                          {b}
                        </option>
                      ))}
                    </select>
                    <input
                      className="bb-tests__input"
                      placeholder="value"
                      value={step.target.value}
                      onChange={(e) => setTarget(index, { value: e.target.value })}
                    />
                    {step.target.by === "role" && (
                      <input
                        className="bb-tests__input"
                        placeholder="name (optional)"
                        value={step.target.name ?? ""}
                        onChange={(e) => setTarget(index, { name: e.target.value || undefined })}
                      />
                    )}
                    {step.type === "type" && (
                      <input
                        className="bb-tests__input"
                        placeholder="text to type"
                        value={step.value}
                        onChange={(e) => updateStep(index, { ...step, value: e.target.value })}
                      />
                    )}
                    {step.type === "assert" && (
                      <>
                        <select
                          className="bb-tests__select"
                          value={step.matcher}
                          onChange={(e) =>
                            updateStep(index, {
                              ...step,
                              matcher: e.target.value as AssertMatcher,
                            })
                          }
                        >
                          {MATCHERS.map((m) => (
                            <option key={m} value={m}>
                              {m}
                            </option>
                          ))}
                        </select>
                        {(step.matcher === "text" || step.matcher === "value") && (
                          <input
                            className="bb-tests__input"
                            placeholder="expected"
                            value={String(step.expected ?? "")}
                            onChange={(e) =>
                              updateStep(index, { ...step, expected: e.target.value })
                            }
                          />
                        )}
                        {(step.matcher === "checked" || step.matcher === "disabled") && (
                          <select
                            className="bb-tests__select"
                            value={String(step.expected ?? true)}
                            onChange={(e) =>
                              updateStep(index, { ...step, expected: e.target.value === "true" })
                            }
                          >
                            <option value="true">true</option>
                            <option value="false">false</option>
                          </select>
                        )}
                      </>
                    )}
                  </>
                )}

                <button
                  type="button"
                  className="bb-tests__remove"
                  aria-label="Remove step"
                  onClick={() => removeStep(index)}
                >
                  ✕
                </button>

                {result && !result.ok && result.message && (
                  <p className="bb-tests__message">{result.message}</p>
                )}
              </li>
            );
          })}
        </ol>
      )}

      <p className="bb-tests__hint">
        Tests are saved to <code>.tide/tests/{componentName}.json</code> and run headlessly:
      </p>
      <CodeBlock code={CLI_COMMANDS} language="bash" />
    </div>
  );
}
