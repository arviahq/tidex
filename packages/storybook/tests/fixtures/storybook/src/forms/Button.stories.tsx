import type { Meta, StoryObj } from "@storybook/react";
import { Button } from "./Button";

const meta = {
  title: "Forms/Button",
  component: Button,
  args: {
    label: "Click me",
    disabled: false,
  },
  argTypes: {
    variant: { control: "select", options: ["primary", "secondary", "ghost"] },
    size: { control: { type: "radio" }, options: ["sm", "md", "lg"] },
    disabled: { control: "boolean" },
    label: { control: "text" },
    onClick: { action: "clicked" },
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {
  args: { variant: "primary", size: "md" },
};

export const Secondary: Story = {
  name: "Secondary Button",
  args: { variant: "secondary", size: "lg", onClick: () => {} },
};

// Non-story export — should be ignored as a story.
export const helperValue = 42;
