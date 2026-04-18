import { useEffect, useState } from "react";

type Toast = { id: number; kind: "error" | "success" | "info"; message: string };

let counter = 0;
const listeners = new Set<(t: Toast) => void>();

export function toast(message: string, kind: Toast["kind"] = "info") {
  const t = { id: ++counter, kind, message };
  listeners.forEach((l) => l(t));
}

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
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
      {items.map((t) => (
        <div
          key={t.id}
          role="status"
          className={`px-4 py-3 text-sm border ${
            t.kind === "error"
              ? "bg-paper border-accent text-accent"
              : t.kind === "success"
              ? "bg-paper border-ink text-ink"
              : "bg-paper border-rule text-ink"
          }`}
        >
          {t.message}
        </div>
      ))}
    </div>
  );
}
