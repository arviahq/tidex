import { Link } from "@tanstack/react-router";
import { CodeBlock } from "../../components/docs/CodeBlock";
import { DocPage } from "../../components/docs/DocPage";

export function ComponentAuthoringPage() {
  return (
    <DocPage
      title="Component authoring"
      description="How to write components so Tide discovers them, extracts props, and builds controls."
    >
      <section className="doc-section">
        <h2>Stable component ids</h2>
        <p>Each component gets a stable <strong>id</strong> used for stories, tests, baselines, and wiring:</p>
        <div className="doc-table-wrap">
          <table className="doc-table">
            <thead>
              <tr>
                <th>File</th>
                <th>Id</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <code>src/components/Button.tsx</code>
                </td>
                <td>
                  <code>Button</code>
                </td>
              </tr>
              <tr>
                <td>
                  <code>src/components/forms/Checkbox.tsx</code>
                </td>
                <td>
                  <code>forms/Checkbox</code>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p>
          Ids are <code>{"{folderPath}/{ComponentName}"}</code> relative to{" "}
          <code>scan.componentsDir</code>. Two components named Button in different folders no longer
          collide.
        </p>
      </section>

      <section className="doc-section">
        <h2>Supported export patterns</h2>
        <CodeBlock
          filename="Button.tsx"
          code={`// Named function
export function Button(props: ButtonProps) {
  return <button {...props} />;
}

// Arrow function
export const Card = (props: CardProps) => <div {...props} />;

// Default export
export default function Modal(props: ModalProps) {
  return <dialog open>{props.children}</dialog>;
}

// forwardRef / memo (inner function must contain JSX)
export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(props, ref) {
  return <input ref={ref} {...props} />;
});`}
        />
      </section>

      <section className="doc-section">
        <h2>Opt out of discovery</h2>
        <p>
          Add <code>@tide-skip</code> in a JSDoc comment on the export:
        </p>
        <CodeBlock
          code={`/** @tide-skip — internal layout shell, not a catalog component */
export function TideShell({ children }: { children: React.ReactNode }) {
  return <div className="shell">{children}</div>;
}`}
        />
      </section>

      <section className="doc-section">
        <h2>Props naming</h2>
        <p>Tide looks for, in order:</p>
        <ol>
          <li>
            <code>{"{ComponentName}Props"}</code> (e.g. <code>ButtonProps</code>)
          </li>
          <li>
            <code>Props</code>
          </li>
          <li>
            <code>{"I{ComponentName}Props"}</code>
          </li>
          <li>The first parameter type on the component function</li>
        </ol>

        <h3>Same-file props (best)</h3>
        <CodeBlock
          code={`export type ButtonProps = {
  variant: "primary" | "secondary";
  disabled?: boolean;
};

export function Button({ variant, disabled }: ButtonProps) {
  return <button data-variant={variant} disabled={disabled} />;
}`}
        />

        <h3>Local shared types (supported)</h3>
        <p>Types imported from another file <strong>in the same package</strong> are resolved:</p>
        <CodeBlock
          code={`// types/label.ts
export type LabelProps = { label: string };

// Checkbox.tsx
import type { LabelProps } from "../types/label";
export type CheckboxProps = LabelProps & { checked: boolean };`}
        />
        <p>
          Types from <code>node_modules</code> stay <code>unknown</code> (no controls) by design —
          keeps scans fast.
        </p>

        <h3>Intersections and extends</h3>
        <CodeBlock
          code={`export interface ButtonProps extends BaseProps {
  variant: "primary" | "secondary";
}

export type CheckboxProps = LabelProps & { checked: boolean };`}
        />
        <p>Both patterns merge prop fields when types resolve locally.</p>
      </section>

      <section className="doc-section">
        <h2>JSDoc descriptions</h2>
        <p>Prop descriptions from TSDoc appear in the Docs panel:</p>
        <CodeBlock
          code={`export type AlertProps = {
  /** Severity controls color and icon */
  tone: "info" | "warning" | "error";
  message: string;
};`}
        />
      </section>

      <section className="doc-section">
        <h2>Controls vs skipped props</h2>
        <div className="doc-table-wrap">
          <table className="doc-table">
            <thead>
              <tr>
                <th>Prop</th>
                <th>Behavior</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <code>boolean</code>, <code>string</code>, <code>number</code>
                </td>
                <td>Text/number/toggle control</td>
              </tr>
              <tr>
                <td>
                  <code>"a" | "b"</code> union
                </td>
                <td>Segmented control</td>
              </tr>
              <tr>
                <td>
                  <code>onClick</code>, <code>onChange</code>, etc.
                </td>
                <td>Interactions tab (callback wiring)</td>
              </tr>
              <tr>
                <td>
                  <code>children</code>, <code>className</code>, <code>style</code>, <code>ref</code>
                </td>
                <td>Skipped</td>
              </tr>
              <tr>
                <td>Imported / unresolved types</td>
                <td>
                  <code>unknown</code> — no control
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="doc-section">
        <h2>Default args</h2>
        <p>
          Tide generates sensible defaults (first union value, heuristic strings for{" "}
          <code>label</code>/<code>title</code>, etc.).
        </p>
        <p>Override per component in config:</p>
        <CodeBlock
          code={`defaults: {
  "forms/Checkbox": { label: "Accept terms", checked: false },
},`}
        />
        <p>
          See the <Link to="/docs/config-reference">configuration reference</Link> for details.
        </p>
      </section>
    </DocPage>
  );
}
