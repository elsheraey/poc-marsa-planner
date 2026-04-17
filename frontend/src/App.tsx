import { Navigate, Route, Routes } from "react-router-dom";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import ClientsList from "./pages/ClientsList";
import NewClientLayout from "./pages/NewClient/NewClientLayout";
import ProfileStep from "./pages/NewClient/ProfileStep";
import GoalsStep from "./pages/NewClient/GoalsStep";
import ScenarioStep from "./pages/NewClient/ScenarioStep";
import SimulationReport from "./pages/SimulationReport";
import ClientSummary from "./pages/ClientSummary";
import { useAppSelector } from "./store";

function RequireAuth({ children }: { children: JSX.Element }) {
  const token = useAppSelector((s) => s.auth.token);
  return token ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />

      <Route
        path="/overview"
        element={
          <RequireAuth>
            <Navigate to="/clients" replace />
          </RequireAuth>
        }
      />
      <Route
        path="/clients"
        element={
          <RequireAuth>
            <ClientsList />
          </RequireAuth>
        }
      />
      <Route
        path="/clients/new"
        element={
          <RequireAuth>
            <NewClientLayout />
          </RequireAuth>
        }
      >
        <Route index element={<Navigate to="profile" replace />} />
        <Route path="profile" element={<ProfileStep />} />
        <Route path="goals" element={<GoalsStep />} />
        <Route path="scenario" element={<ScenarioStep />} />
      </Route>
      <Route
        path="/clients/new/report"
        element={
          <RequireAuth>
            <SimulationReport />
          </RequireAuth>
        }
      />
      <Route
        path="/clients/:id"
        element={
          <RequireAuth>
            <ClientSummary />
          </RequireAuth>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
