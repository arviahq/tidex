import { forwardRef, type HTMLAttributes, type ReactNode } from "react";

export type TabsProps = HTMLAttributes<HTMLDivElement> & {
  value?: string;
};

const TabsRoot = forwardRef<HTMLDivElement, TabsProps>(function Tabs({ value, children }, ref) {
  return (
    <div ref={ref} data-value={value}>
      {children}
    </div>
  );
});

function TabsList({ children }: { children: ReactNode }) {
  return <div role="tablist">{children}</div>;
}

// Compound component via Object.assign with a forwardRef root.
export const Tabs = Object.assign(TabsRoot, { List: TabsList });

export type DialogProps = { open?: boolean; children?: ReactNode };

function DialogRoot({ open, children }: DialogProps) {
  return open ? <div role="dialog">{children}</div> : null;
}

function DialogClose() {
  return <button type="button">×</button>;
}

// Compound component via Object.assign with a plain function-declaration root.
export const Dialog = Object.assign(DialogRoot, { Close: DialogClose });
