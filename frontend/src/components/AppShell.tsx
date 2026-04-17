import { ReactNode } from "react";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";

type Props = { title: ReactNode; trailing?: ReactNode; children: ReactNode };

export default function AppShell({ title, trailing, children }: Props) {
  return (
    <div className="min-h-screen flex bg-surface">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar title={title} trailing={trailing} />
        <main className="flex-1 px-8 py-6 overflow-y-auto">{children}</main>
        <footer className="py-3 text-center text-xs text-muted">
          © 2021, Developed by <span className="text-primary-500 font-medium">Marsa</span>
        </footer>
      </div>
    </div>
  );
}
