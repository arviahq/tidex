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
      <header className="bb-tests__header">
        <div className="bb-tests__title-row">
          <div className="bb-tests__title-block">
            <h2 className="bb-tests__name">{formatDisplayName(componentName)}</h2>
            <p className="bb-tests__subtitle">
              Interaction test · saved to .tide/tests/{componentName}.json
            </p>
          </div>
          <div className="bb-tests__actions">
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
              className="bb-tests__btn bb-tests__btn--secondary"
              onClick={handleSave}
              disabled={running || saveState === "saving"}
            >
              Save
            </button>
            {status && (
              <span className="bb-tests__pill" data-kind={status.kind} role="status">
                {status.text}
              </span>
            )}
          </div>
        </div>
      </header>

      <section className="bb-tests__section">
        <div className="bb-tests__section-head">
          <div className="bb-tests__section-head-left">
            <h3 className="bb-tests__section-title">Steps</h3>
            {steps.length > 0 && <span className="bb-tests__section-count">{steps.length}</span>}
          </div>
          <button type="button" className="bb-tests__btn bb-tests__btn--add" onClick={addStep}>
            + Add step
          </button>
        </div>

        {steps.length === 0 ? (
          <div className="bb-tests__empty">
            <p className="bb-tests__empty-text">
              No steps yet. Add steps to interact with{" "}
              <strong>{formatDisplayName(componentName)}</strong> and assert on the result.
            </p>
            <button type="button" className="bb-tests__btn bb-tests__btn--dashed" onClick={addStep}>
              + Add step
            </button>
          </div>
        ) : (
          <ol className="bb-tests__list">
            {steps.map((step, index) => {
              const result = results.find((r) => r.index === index);
              const stepStatus = result ? (result.ok ? "pass" : "fail") : undefined;
              const isRunningStep = running && results.length === index;
              return (
                <li
                  key={index}
                  className="bb-tests__row"
                  data-status={stepStatus}
                  data-running={isRunningStep ? "true" : undefined}
                >
                  <span className="bb-tests__status" data-status={stepStatus} aria-hidden="true">
                    {result ? (result.ok ? "✓" : "✗") : index + 1}
                  </span>

                  <div className="bb-tests__pipeline">
                    <select
                      className="bb-tests__select bb-tests__select--type"
                      data-kind={step.type}
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
                      <div className="bb-tests__segment">
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
                      </div>
                    ) : (
                      <>
                        <span className="bb-tests__arrow" aria-hidden="true">
                          →
                        </span>
                        <div className="bb-tests__segment">
                          <select
                            className="bb-tests__select bb-tests__select--by"
                            data-kind={step.target.by}
                            value={step.target.by}
                            onChange={(e) =>
                              setTarget(index, { by: e.target.value as StepTarget["by"] })
                            }
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
                              onChange={(e) =>
                                setTarget(index, { name: e.target.value || undefined })
                              }
                            />
                          )}
                        </div>
                        {step.type === "type" && (
                          <>
                            <span className="bb-tests__arrow" aria-hidden="true">
                              →
                            </span>
                            <div className="bb-tests__segment">
                              <input
                                className="bb-tests__input bb-tests__input--wide"
                                placeholder="text to type"
                                value={step.value}
                                onChange={(e) =>
                                  updateStep(index, { ...step, value: e.target.value })
                                }
                              />
                            </div>
                          </>
                        )}
                        {step.type === "assert" && (
                          <>
                            <span className="bb-tests__arrow" aria-hidden="true">
                              →
                            </span>
                            <div className="bb-tests__segment">
                              <select
                                className="bb-tests__select bb-tests__select--matcher"
                                data-kind={step.matcher}
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
                                  className="bb-tests__select bb-tests__select--matcher"
                                  data-kind={String(step.expected ?? true)}
                                  value={String(step.expected ?? true)}
                                  onChange={(e) =>
                                    updateStep(index, {
                                      ...step,
                                      expected: e.target.value === "true",
                                    })
                                  }
                                >
                                  <option value="true">true</option>
                                  <option value="false">false</option>
                                </select>
                              )}
                            </div>
                          </>
                        )}
                      </>
                    )}
                  </div>

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
      </section>

      <section className="bb-tests__cli">
        <span className="bb-tests__cli-label">CLI</span>
        <p className="bb-tests__hint">Run headlessly in CI or locally:</p>
        <CodeBlock code={CLI_COMMANDS} language="bash" />
      </section>
    </div>
  );
}
