import { Outlet } from "react-router-dom";
import AppShell from "../../components/AppShell";
import WizardTabs from "../../components/WizardTabs";
import { t } from "../../i18n";

/**
 * New-client wizard layout.
 *
 * Large Title at the top, iOS segmented control for the three steps,
 * then the route outlet. Each step itself composes the grouped-list /
 * card sections inside a `px-6` column.
 */
export default function NewClientLayout() {
  return (
    <AppShell>
      <header className="px-6 pt-10 pb-6">
        <h1 className="text-4xl font-bold tracking-tight">
          {t("wizard.layout.title")}
        </h1>
        <p className="mt-1 text-base text-az-ink-muted">
          {t("wizard.layout.subtitle")}
        </p>
      </header>
      <div className="px-6 space-y-6">
        <WizardTabs basePath="/clients/new" />
        <Outlet />
      </div>
    </AppShell>
  );
}
