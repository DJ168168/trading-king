import { ReactNode } from "react";

interface StatCardProps {
  icon: ReactNode;
  iconColor?: string;
  label: string;
  value: string;
  sublabel?: string;
  className?: string;
}

export default function StatCard({ icon, iconColor = "text-neon-green", label, value, sublabel, className = "" }: StatCardProps) {
  return (
    <div className={`terminal-card p-4 ${className}`}>
      <div className="flex items-center gap-2 mb-2">
        <span className={iconColor}>{icon}</span>
        {sublabel && <span className="text-[10px] text-muted-foreground ml-auto">{sublabel}</span>}
      </div>
      <p className="text-2xl font-bold stat-number text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground mt-1">{label}</p>
    </div>
  );
}
