import { cn } from "@/utils/cn";

export type PriorityType = 'high' | 'medium' | 'low';

const PRIORITY_CONFIG: Record<PriorityType, string> = {
  high: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
  medium: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  low: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
};

export function PriorityBadge({ priority, className }: { priority: PriorityType | string, className?: string }) {
  const normalized = priority.toLowerCase() as PriorityType;
  const classes = PRIORITY_CONFIG[normalized] || PRIORITY_CONFIG.medium;
  
  return (
    <span className={cn(
      "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium uppercase tracking-wider",
      classes,
      className
    )}>
      {priority}
    </span>
  );
}
