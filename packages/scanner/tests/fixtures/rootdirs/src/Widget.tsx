import { type WidgetProps as GenWidgetProps } from "./widget.schema.graphql";

// Aliased import of a generated type, intersected with local props — a common
// shape for components built on codegen output.
export type WidgetProps = GenWidgetProps & {
  label?: string;
};

export const Widget = (props: WidgetProps) => <div>{props.label}</div>;
