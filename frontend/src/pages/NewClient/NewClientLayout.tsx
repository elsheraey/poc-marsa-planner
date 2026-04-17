import { Outlet } from "react-router-dom";
import AppShell from "../../components/AppShell";
import WizardTabs from "../../components/WizardTabs";

export default function NewClientLayout() {
  return (
    <AppShell title="New Client">
      <WizardTabs basePath="/clients/new" />
      <Outlet />
    </AppShell>
  );
}
