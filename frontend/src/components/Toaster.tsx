import { useEffect, useState } from "react";

type Toast = { id: number; kind: "error" | "success" | "info"; message: string };

let counter = 0;
const listeners = new Set<(t: Toast) => void>();

export function toast(message: string, kind: Toast["kind"] = "info") {
  const t = { id: ++counter, kind, message };
  listeners.forEach((l) => l(t));
}

/**
 * Apple-style toaster. Rounded card surface, 1px separator ring, a soft
 * shadow. Three kinds:
 *   error   — system-red accent strip on the start edge
 *   success — system-green accent strip on the start edge
 *   info    — no strip, neutral surface
 */
export default function Toaster() {
  const [items, setItems] = useState<Toast[]>([]);
  useEffect(() => {
    const onToast = (t: Toast) => {
      setItems((prev) => [...prev, t]);
      setTimeout(() => setItems((prev) => prev.filter((p) => p.id !== t.id)), 4500);
    };
    listeners.add(onToast);
    return () => {
      listeners.delete(onToast);
    };
  }, []);

  return (
    <div className="fixed top-4 end-4 z-50 flex flex-col gap-2 max-w-sm">
      {items.map((t) => {
        let stripe = "bg-gray-3";
        if (t.kind === "error") stripe = "bg-system-red";
        else if (t.kind === "success") stripe = "bg-system-green";
        return (
          <div
            key={t.id}
            role="status"
            className="relative overflow-hidden bg-bg-primary rounded-xl ring-1 ring-separator shadow-[0_4px_12px_rgba(0,0,0,0.08)] px-4 py-3 text-sm text-label"
          >
            <span
              aria-hidden="true"
              className={`absolute start-0 inset-y-0 w-1 ${stripe}`}
            />
            <span className="ps-2 block">{t.message}</span>
          </div>
        );
      })}
    </div>
  );
}
