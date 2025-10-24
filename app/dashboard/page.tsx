import { requireAuth } from "../lib/auth";
import DashboardContent from "./components/DashboardContent";

export default async function Dashboard() {
  const user = await requireAuth();

  return <DashboardContent userName={user.name} />;
}
