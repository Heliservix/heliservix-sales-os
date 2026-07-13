import { memo } from "react";
import { cn } from "@/lib/utils";

type PanelProps = {
  children: React.ReactNode;
  className?: string;
  id?: string;
};

function PanelComponent({ children, className, id }: PanelProps) {
  return (
    <section
      id={id}
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
