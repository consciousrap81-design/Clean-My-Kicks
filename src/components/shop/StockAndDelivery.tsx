import { useEffect, useState } from "react";
import { CheckCircle2, Clock, XCircle, Truck, Zap } from "lucide-react";

type Props = {
  isSold: boolean;
  isReserved: boolean;
  reservedByMe: boolean;
  reservedUntil?: string | null;
};

function addBusinessDays(days: number) {
  const d = new Date();
  let added = 0;
  while (added < days) {
    d.setDate(d.getDate() + 1);
    if (d.getDay() !== 0 && d.getDay() !== 6) added++;
  }
  return d;
}

const fmtDate = (d: Date) =>
  d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });

function useCountdown(target?: string | null) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!target) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [target]);
  if (!target) return null;
  const ms = new Date(target).getTime() - now;
  if (ms <= 0) return null;
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function StockAndDelivery({ isSold, isReserved, reservedByMe, reservedUntil }: Props) {
  const countdown = useCountdown(reservedUntil);
  const standard = `${fmtDate(addBusinessDays(5))} – ${fmtDate(addBusinessDays(7))}`;
  const express = `${fmtDate(addBusinessDays(1))} – ${fmtDate(addBusinessDays(3))}`;
  const orderByCutoff = (() => {
    const d = new Date();
    d.setHours(15, 0, 0, 0); // 3pm CT-ish; shop ships next business morning
    return d;
  })();
  const beforeCutoff = Date.now() < orderByCutoff.getTime() && new Date().getDay() !== 0 && new Date().getDay() !== 6;

  let pill: { icon: JSX.Element; label: string; cls: string };
  if (isSold) {
    pill = {
      icon: <XCircle className="w-4 h-4" />,
      label: "Sold — no longer available",
      cls: "bg-muted text-muted-foreground border-border",
    };
  } else if (isReserved && !reservedByMe) {
    pill = {
      icon: <Clock className="w-4 h-4" />,
      label: countdown ? `Reserved by another shopper · frees in ${countdown}` : "Reserved — checkout in progress",
      cls: "bg-amber-50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200 border-amber-200 dark:border-amber-900",
    };
  } else if (isReserved && reservedByMe) {
    pill = {
      icon: <Clock className="w-4 h-4" />,
      label: countdown ? `Held for you · ${countdown}` : "Held for you",
      cls: "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-200 border-emerald-200 dark:border-emerald-900",
    };
  } else {
    pill = {
      icon: <CheckCircle2 className="w-4 h-4" />,
      label: "In stock · ready to ship",
      cls: "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-200 border-emerald-200 dark:border-emerald-900",
    };
  }

  return (
    <div className="mt-6 rounded-lg border border-border bg-card p-4 space-y-3">
      <div className={`inline-flex items-center gap-2 text-sm font-medium border rounded-full px-3 py-1 ${pill.cls}`}>
        {pill.icon}
        <span>{pill.label}</span>
      </div>

      {!isSold && (
        <>
          <div className="flex items-start gap-2 text-sm">
            <Truck className="w-4 h-4 mt-0.5 text-foreground/70 shrink-0" />
            <div>
              <div className="text-foreground">
                Free US standard shipping · arrives{" "}
                <strong className="text-foreground">{standard}</strong>
              </div>
              {beforeCutoff && (
                <div className="text-xs text-emerald-700 dark:text-emerald-400 mt-0.5">
                  Order in the next few hours to ship today.
                </div>
              )}
            </div>
          </div>
          <div className="flex items-start gap-2 text-sm">
            <Zap className="w-4 h-4 mt-0.5 text-foreground/70 shrink-0" />
            <div className="text-foreground">
              Express at checkout · arrives{" "}
              <strong className="text-foreground">{express}</strong>
            </div>
          </div>
        </>
      )}
    </div>
  );
}