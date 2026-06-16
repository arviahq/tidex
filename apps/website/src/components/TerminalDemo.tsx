import { useEffect, useState } from "react";

const COMMANDS = [
  { prompt: "$", text: "pnpm exec tidex init" },
  { prompt: "$", text: "pnpm exec tidex generate" },
  { prompt: "$", text: "pnpm exec tidex dev" },
  { prompt: "✓", text: "Manager ready at http://localhost:6006", success: true },
];

export function TerminalDemo() {
  const [visibleLines, setVisibleLines] = useState(0);
  const [currentChar, setCurrentChar] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (done) return;

    const line = COMMANDS[visibleLines];
    if (!line) {
      setDone(true);
      return;
    }

    if (currentChar < line.text.length) {
      const timer = setTimeout(() => setCurrentChar((c) => c + 1), 38);
      return () => clearTimeout(timer);
    }

    const pause = setTimeout(() => {
      setVisibleLines((l) => l + 1);
      setCurrentChar(0);
    }, 420);
    return () => clearTimeout(pause);
  }, [visibleLines, currentChar, done]);

  return (
    <div className="terminal">
      <div className="terminal__chrome">
        <span className="terminal__dot terminal__dot--red" />
        <span className="terminal__dot terminal__dot--yellow" />
        <span className="terminal__dot terminal__dot--green" />
        <span className="terminal__title">bash</span>
      </div>
      <div className="terminal__body">
        {COMMANDS.slice(0, visibleLines).map((line, i) => (
          <div key={i} className="terminal__line">
            <span className={`terminal__prompt${line.success ? " terminal__prompt--success" : ""}`}>
              {line.prompt}
            </span>
            <span className={line.success ? "terminal__success" : "terminal__cmd"}>
              {line.text}
            </span>
          </div>
        ))}
        {visibleLines < COMMANDS.length && (
          <div className="terminal__line">
            <span className="terminal__prompt">{COMMANDS[visibleLines].prompt}</span>
            <span className="terminal__cmd">
              {COMMANDS[visibleLines].text.slice(0, currentChar)}
              <span className="terminal__cursor" aria-hidden="true" />
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
