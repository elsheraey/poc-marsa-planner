type Props = { variant?: "light" | "dark"; className?: string };

export default function Logo({ variant = "dark", className = "" }: Props) {
  const textColor = variant === "light" ? "text-white" : "text-ink";
  const subColor = variant === "light" ? "text-white/70" : "text-muted";
  return (
    <div className={`inline-flex flex-col items-center ${className}`}>
      <div className={`flex items-center gap-1 ${textColor}`}>
        <span className="text-lg font-extrabold tracking-[0.22em]">OPT</span>
        <span className="inline-block w-5 h-5 rounded-full border-2 border-current" />
        <span className="text-lg font-extrabold tracking-[0.22em]">FOLIO</span>
      </div>
      <span className={`mt-1 text-[9px] font-semibold tracking-[0.28em] ${subColor}`}>
        FINANCIAL PLANNING TOOL
      </span>
    </div>
  );
}
