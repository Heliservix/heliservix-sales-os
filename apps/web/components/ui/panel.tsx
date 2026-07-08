import { memo } from "react";
import { cn } from "@/lib/utils";

type PanelProps = {
  children: React.ReactNode;
  className?: string;
};

function PanelComponent({ children, className }: PanelProps) {
  return (
    <section
      className={cn(
        "hsv-panel",
        className
      )}
    >
      {children}
    </section>
  );
}

export const Panel = memo(PanelComponent);
