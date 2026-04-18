import { ReactNode } from "react";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";

type Props = Readonly<{
  title: ReactNode;
  trailing?: ReactNode;
  children: ReactNode;
  // When true, the AppShell renders without the sidebar and with a
  // print-clean footer — used by the "Present to client" mode on the
  // simulation report so the advisor can turn the laptop and not expose
  // CRM chrome.
  focus?: boolean;
}>;

export default function AppShell({ title, trailing, children, focus = false }: Props) {
  const year = new Date().getFullYear();
  return (
    <div className="min-h-screen flex bg-surface">
      {!focus && <Sidebar />}
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar title={title} trailing={trailing} />
        <main className="flex-1 px-8 py-6 overflow-y-auto">{children}</main>
        <footer className="py-3 text-center text-xs text-muted print:hidden">
          © {year}, Developed by{" "}
          <span className="text-primary-500 font-medium">Marsa</span>
        </footer>
      </div>
    </div>
  );
}
