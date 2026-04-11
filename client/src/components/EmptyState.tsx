import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description: string;
  hint?: string;
  action?: ReactNode;
  className?: string;
}

export default function EmptyState({
  icon,
  title,
  description,
  hint,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-primary/15 bg-gradient-to-br from-background via-card to-background/90 px-6 py-10 text-center shadow-[0_0_0_1px_rgba(0,255,255,0.03),0_0_24px_rgba(0,255,255,0.06)]",
        className,
      )}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.12),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(168,85,247,0.1),transparent_30%)]" />
      <div className="relative mx-auto flex max-w-md flex-col items-center">
        <div className="mb-4 rounded-2xl border border-primary/20 bg-primary/10 p-4 text-primary shadow-[0_0_22px_rgba(34,211,238,0.15)]">
          {icon}
        </div>
        <div className="mb-2 inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.24em] text-primary/90">
          Quantum Guidance
        </div>
        <p className="text-base font-semibold text-foreground">{title}</p>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
        {hint && (
          <p className="mt-3 rounded-xl border border-border/60 bg-background/60 px-4 py-3 text-xs leading-5 text-muted-foreground">
            {hint}
          </p>
        )}
        {action && <div className="mt-5 flex flex-wrap items-center justify-center gap-2">{action}</div>}
      </div>
    </div>
  );
}
