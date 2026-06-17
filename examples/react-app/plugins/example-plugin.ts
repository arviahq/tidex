import type { TidexPlugin } from "@tidex/cli/config";

const examplePlugin: TidexPlugin = {
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
