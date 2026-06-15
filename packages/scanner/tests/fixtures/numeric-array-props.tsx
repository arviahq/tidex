export type GridProps = {
  columns: 1 | 2 | 3 | 4;
  tags: string[];
};

export function Grid({ columns, tags }: GridProps) {
  return (
    <div>
      {columns}
      {tags.join(",")}
    </div>
  );
}
