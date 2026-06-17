import type { CSSProperties } from "react";

export type GadgetProps = {
  /** Accepts a px number or any CSS length string. */
  width: number | string;
  /** Indexed access into an external lib type — unresolvable, falls back to string. */
  radius: CSSProperties["borderRadius"];
};

export const Gadget = (props: GadgetProps) => <div style={{ width: props.width }} />;
