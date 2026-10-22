import { AdminShell } from "@/components/admin/AdminShell";
import { requireAdmin } from "@/lib/admin/auth";

// Authenticated area. The layout authorises, and every page below re-authorises on its own
// (layouts are not re-run on client navigations, so they can't be the only gate).
export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const { user } = await requireAdmin();
  return <AdminShell email={user.email}>{children}</AdminShell>;
}
