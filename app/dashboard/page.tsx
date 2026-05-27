import { requireAuth } from "../lib/auth";

import DashboardContent from "./components/DashboardContent";

export default async function Dashboard() {
  const user = await requireAuth();

  return <DashboardContent userId={user.id} userName={user.name} />;
}
