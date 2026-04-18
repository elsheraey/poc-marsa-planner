import { Outlet } from "react-router-dom";
import AppShell from "../../components/AppShell";
import WizardTabs from "../../components/WizardTabs";

export default function NewClientLayout() {
  return (
    <AppShell>
      <h1 className="font-serif text-4xl tracking-tight mb-8">New Client</h1>
      <WizardTabs basePath="/clients/new" />
      <Outlet />
    </AppShell>
  );
}
