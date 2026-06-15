export type WidgetProps = {
  when: Date;
  tags: Set<string>;
};

export function Widget({ when, tags }: WidgetProps) {
  return (
    <div>
      {when.toISOString()}
      {[...tags].join(",")}
    </div>
  );
}
