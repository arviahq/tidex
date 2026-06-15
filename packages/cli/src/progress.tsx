import { useEffect, useState } from "react";
import { render, Box, Text, type Instance } from "ink";

const BAR_WIDTH = 24;

function bar(pct: number): string {
  const filled = Math.max(0, Math.min(BAR_WIDTH, Math.round((pct / 100) * BAR_WIDTH)));
  return "█".repeat(filled) + "░".repeat(BAR_WIDTH - filled);
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  const s = ms / 1000;
  if (s < 60) return `${s.toFixed(1)}s`;
  const m = Math.floor(s / 60);
  return `${m}m ${Math.round(s % 60)}s`;
}

interface ViewProps {
  title: string;
  done: number;
  total: number;
  label?: string;
  finished?: boolean;
  startedAt: number;
  endedAt?: number;
}

function ProgressView({ title, done, total, label, finished, startedAt, endedAt }: ViewProps) {
  // Tick while running so the elapsed time updates live; freeze once finished.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (endedAt) return;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [endedAt]);

  const pct = total > 0 ? Math.round((done / total) * 100) : finished ? 100 : 0;
  const elapsed = formatDuration((endedAt ?? now) - startedAt);

  return (
    <Box>
      <Text color={finished ? "green" : "magenta"}>{finished ? "✓" : "▸"} </Text>
      <Text>{title} </Text>
      <Text color={finished ? "green" : "cyan"}>{bar(pct)} </Text>
      <Text bold>{String(pct).padStart(3)}%</Text>
      <Text dimColor>
        {" "}
        {done}/{total}
      </Text>
      <Text dimColor> ({elapsed})</Text>
      {label && !finished ? <Text dimColor> · {label}</Text> : null}
    </Box>
  );
}

export interface ProgressHandle {
  update: (done: number, total: number, label?: string) => void;
  stop: () => void;
}

/**
 * Render a live Ink progress bar for a long-running, element-by-element command
 * (generate / visual / test), with elapsed time. Drive it from an
 * `onProgress(done, total, label)` callback; call `stop()` when finished. When
 * stdout is not a TTY (CI, pipes) the bar is suppressed but a one-line
 * completion + duration is still logged.
 */
export function startProgress(title: string): ProgressHandle {
  const startedAt = Date.now();

  if (!process.stdout.isTTY) {
    let stopped = false;
    return {
      update: () => {},
      stop() {
        if (stopped) return;
        stopped = true;
        console.log(`✓ ${title} in ${formatDuration(Date.now() - startedAt)}`);
      },
    };
  }

  const state: ViewProps = { title, done: 0, total: 0, startedAt };
  const instance: Instance = render(<ProgressView {...state} />);
  let stopped = false;

  return {
    update(done, total, label) {
      if (stopped) return;
      state.done = done;
      state.total = total;
      state.label = label;
      instance.rerender(<ProgressView {...state} />);
    },
    stop() {
      if (stopped) return;
      stopped = true;
      instance.rerender(
        <ProgressView {...state} done={state.total} finished endedAt={Date.now()} />,
      );
      instance.unmount();
    },
  };
}
