import { ReactNode } from "react";
import { useAppSelector } from "../store";

type Props = { title: ReactNode; trailing?: ReactNode };

export default function TopBar({ title, trailing }: Props) {
  const user = useAppSelector((s) => s.auth.user);
  const initials = (user?.name ?? "SG")
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <header className="h-16 bg-white flex items-center justify-between px-8 border-b border-border/70">
      <div className="text-lg font-bold">{title}</div>
      <div className="flex items-center gap-4">
        {trailing}
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium">{user?.name ?? "Samy Gamal"}</span>
          <div className="w-9 h-9 rounded-full bg-primary-500 text-white font-semibold text-sm flex items-center justify-center">
            {initials}
          </div>
        </div>
      </div>
    </header>
  );
}
