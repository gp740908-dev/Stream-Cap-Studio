import { cn } from "@/lib/utils";
import type { JobStatus } from "@/lib/types";

const STATUS_CONFIG: Record<
  JobStatus,
  { label: string; color: string; dotColor: string }
> = {
  queued: {
    label: "Queued",
    color: "text-[#888] bg-[#888]/10",
    dotColor: "bg-[#888]",
  },
  recording: {
    label: "Recording",
    color: "text-red-400 bg-red-500/10",
    dotColor: "bg-red-500 animate-pulse",
  },
  processing: {
    label: "Processing",
    color: "text-blue-400 bg-blue-500/10",
    dotColor: "bg-blue-500",
  },
  done: {
    label: "Done",
    color: "text-green-400 bg-green-500/10",
    dotColor: "bg-green-500",
  },
  failed: {
    label: "Failed",
    color: "text-red-400 bg-red-500/10",
    dotColor: "bg-red-500",
  },
  cancelled: {
    label: "Cancelled",
    color: "text-neutral-500 bg-neutral-700/20",
    dotColor: "bg-neutral-500",
  },
};

interface StatusBadgeProps {
  status: JobStatus;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.queued;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-mono font-medium uppercase tracking-wide",
        config.color,
        className
      )}
    >
      <span className={cn("w-1.5 h-1.5 rounded-full", config.dotColor)} />
      {config.label}
    </span>
  );
}
