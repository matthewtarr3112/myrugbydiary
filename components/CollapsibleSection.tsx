"use client";
import { ReactNode, useState } from "react";
import { ChevronDown } from "lucide-react";

export function CollapsibleSection({
  title,
  icon,
  defaultOpen = false,
  headerExtra,
  children,
}: {
  title: string;
  icon?: ReactNode;
  defaultOpen?: boolean;
  headerExtra?: ReactNode;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className="rounded-2xl border border-neutral-800 bg-neutral-900/60">
      <div className="flex items-center justify-between gap-3 p-4">
        <button
          type="button"
          onClick={() => setOpen((current) => !current)}
          className="flex flex-1 items-center gap-2 text-left"
        >
          <ChevronDown className={`h-4 w-4 shrink-0 text-neutral-500 transition-transform ${open ? "rotate-180" : ""}`} />
          <span className="flex items-center gap-2 text-lg font-semibold">
            {icon} {title}
          </span>
        </button>
        {open && headerExtra}
      </div>
      {open && <div className="border-t border-neutral-800 p-4">{children}</div>}
    </section>
  );
}
