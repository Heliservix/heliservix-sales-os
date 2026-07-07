import { cn } from "@/lib/utils";

type PanelProps = {
  children: React.ReactNode;
  className?: string;
};

export function Panel({ children, className }: PanelProps) {
  return (
    <section
      className={cn(
        "min-w-0 rounded-xl border border-line bg-white p-5 shadow-panel backdrop-blur-xl dark:bg-canvas-muted/72",
        className
      )}
    >
      {children}
    </section>
  );
}
