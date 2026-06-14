import { formatDisplayName } from "@tide/core";
import { CodeBlock } from "./CodeBlock";

interface TestsPanelProps {
  componentName: string;
}

const CLI_COMMANDS = `tide test      # accessibility
tide visual    # visual regression
tide visual --update  # update baselines`;

export function TestsPanel({ componentName }: TestsPanelProps) {
  return (
    <div style={{ fontSize: 14 }}>
      <p style={{ color: "#64748b", margin: "0 0 12px" }}>Run tests from the CLI:</p>
      <CodeBlock code={CLI_COMMANDS} language="bash" />
      <p style={{ color: "#64748b", marginTop: 12, fontSize: 13 }}>
        Reports are written to <code>.tide/reports/</code> for{" "}
        <strong>{formatDisplayName(componentName)}</strong> and all components.
      </p>
    </div>
  );
}
