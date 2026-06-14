import type { TidePlugin } from "@tide/core";

const examplePlugin: TidePlugin = {
  name: "example-plugin",
  setup(ctx) {
    ctx.addPanel({
      id: "example",
      title: "Example",
      component: "./ExamplePanel",
    });
    ctx.onGenerate(async () => {
      // runs after each scan
    });
  },
};

export default examplePlugin;
