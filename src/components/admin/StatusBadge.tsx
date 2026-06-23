import { cn } from "@/lib/utils";

const JOB_LABELS: Record<string, string> = {
  new_request: "New Request",
  awaiting_shoes: "Awaiting Shoes",
  received: "Received",
  in_progress: "In Progress",
  ready_for_payment: "Ready for Payment",
  completed: "Completed",
  shipped: "Shipped",
  picked_up: "Picked Up",
  cancelled: "Cancelled",
};

const JOB_STYLES: Record<string, string> = {
  new_request: "bg-primary/15 text-primary border-primary/30",
  awaiting_shoes: "bg-muted text-muted-foreground border-border",
  received: "bg-secondary text-secondary-foreground border-border",
  in_progress: "bg-primary/20 text-primary border-primary/40",
  ready_for_payment: "bg-destructive/15 text-destructive border-destructive/30",
  completed: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30 dark:text-emerald-400",
  shipped: "bg-blue-500/15 text-blue-600 border-blue-500/30 dark:text-blue-400",
  picked_up: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30 dark:text-emerald-400",
  cancelled: "bg-muted text-muted-foreground border-border line-through",
};

const PAY_LABELS: Record<string, string> = {
  unpaid: "Unpaid",
  partial: "Partial",
  paid: "Paid",
  refunded: "Refunded",
};
const PAY_STYLES: Record<string, string> = {
  unpaid: "bg-destructive/15 text-destructive border-destructive/30",
  partial: "bg-primary/15 text-primary border-primary/30",
  paid: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30 dark:text-emerald-400",
  refunded: "bg-muted text-muted-foreground border-border",
};

export function JobStatusBadge({ status }: { status: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium", JOB_STYLES[status] || "")}>
      {JOB_LABELS[status] || status}
    </span>
  );
}

export function PaymentBadge({ status }: { status: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium", PAY_STYLES[status] || "")}>
      {PAY_LABELS[status] || status}
    </span>
  );
}

export const JOB_STATUS_OPTIONS = Object.entries(JOB_LABELS).map(([value, label]) => ({ value, label }));
export const PAYMENT_STATUS_OPTIONS = Object.entries(PAY_LABELS).map(([value, label]) => ({ value, label }));