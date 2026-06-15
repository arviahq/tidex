import React from "react";

// CSF2-style: a Template.bind() story with args attached afterward. Tide only
// needs the export names statically; composeStory normalizes CSF2 at runtime.
const Template = (args: { tone: string }) => React.createElement("div", null, args.tone);

export default {
  title: "Legacy/Banner",
  component: Template,
};

export const Info = Template.bind({});
Info.args = { tone: "info" };

export const Warning = Template.bind({});
Warning.args = { tone: "warning" };
