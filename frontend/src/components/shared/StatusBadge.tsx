import { cn } from "@/utils/cn";

export type StatusType = 
  | 'pending' | 'in_progress' | 'completed' | 'failed'
  | 'pending_review' | 'approved' | 'rejected'
  | 'ready_for_generation' | 'to_do' | 'done';

const STATUS_CONFIG: Record<string, { label: string, classes: string }> = {
  pending: { label: 'Pending', classes: 'bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300' },
  in_progress: { label: 'In Progress', classes: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300' },
  completed: { label: 'Completed', classes: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300' },
  failed: { label: 'Failed', classes: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300' },
  pending_review: { label: 'Pending Review', classes: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300' },
  approved: { label: 'Approved', classes: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300' },
  rejected: { label: 'Rejected', classes: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300' },
  ready_for_generation: { label: 'Ready', classes: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300' },
  to_do: { label: 'To Do', classes: 'bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300' },
  // defaults out-of-box fallback
};

interface StatusBadgeProps {
  status: StatusType | string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status.toLowerCase()] || {
    label: status.replace(/_/g, ' '),
    classes: 'bg-muted text-muted-foreground'
  };

  return (
    <span className={cn(
      "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize whitespace-nowrap",
      config.classes,
      className
    )}>
      {config.label}
    </span>
  );
}
