interface User {
  name: string;
  role: "admin" | "editor";
}

type Avatar = { type: "image"; src: string } | { type: "initials"; text: string };

export interface PanelProps {
  /** @min(0) @max(100) @step(5) @slider */
  opacity: number;
  /** @color */
  accent: string;
  /** @multiline @maxLength(280) */
  bio: string;
  position: [number, number];
  named: [x: number, y: number];
  theme: Map<string, string>;
  users: Record<string, User>;
  avatar: Avatar;
}

export function Panel(_props: PanelProps) {
  return <div />;
}
