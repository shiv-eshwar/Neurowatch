import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "./components/AppShell";
import { RequireAuth } from "./routes/RequireAuth";
import { DashboardPage } from "./pages/Dashboard";
import { LandingPage } from "./pages/Landing";
import { LoginPage } from "./pages/Login";
import { NotFoundPage } from "./pages/NotFound";
import { SessionPage } from "./pages/Session";
import { SessionResultPage } from "./pages/SessionResult";
import { SignupPage } from "./pages/Signup";

export default function App() {
  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route element={<RequireAuth />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/session" element={<SessionPage />} />
          <Route path="/session/:id" element={<SessionResultPage />} />
        </Route>
        <Route path="*" element={<NotFoundPage />} />
        <Route path="/home" element={<Navigate to="/" replace />} />
      </Routes>
    </AppShell>
  );
}
