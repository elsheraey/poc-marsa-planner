import { useEffect, useState } from "react";

type Toast = { id: number; kind: "error" | "success" | "info"; message: string };

let counter = 0;
const listeners = new Set<(t: Toast) => void>();

export function toast(message: string, kind: Toast["kind"] = "info") {
  const t = { id: ++counter, kind, message };
  listeners.forEach((l) => l(t));
}

/**
 * Azimut-style toaster. White card, hairline ring, soft shadow, a 4px
 * start-side colour stripe indicating kind.
 *   error   — rose-300 ring, rose-600 stripe
 *   success — emerald-300 ring, emerald-600 stripe
 *   info    — az-separator ring, az-black stripe
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
        let stripe = "bg-az-black";
        let ring = "ring-az-separator";
        if (t.kind === "error") {
          stripe = "bg-rose-600";
          ring = "ring-rose-300";
        } else if (t.kind === "success") {
          stripe = "bg-emerald-600";
          ring = "ring-emerald-300";
        }
        return (
          <div
            key={t.id}
            role="status"
            className={`relative overflow-hidden bg-az-white rounded-xl ring-1 ${ring} shadow-[0_4px_12px_rgba(0,0,0,0.08)] px-4 py-3 text-sm text-az-ink`}
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
