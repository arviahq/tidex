import React from "react";

// No explicit meta.title — Tide derives the title from the path. The trailing
// folder repeats the file name, which should be de-duplicated.
export default {
  component: (props: { value: number }) => React.createElement("div", null, props.value),
};

export const Playground = {
  args: { value: 50 },
};
