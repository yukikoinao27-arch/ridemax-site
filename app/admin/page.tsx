import { AdminScreen } from "@/components/admin-screen";

export default async function AdminPage({
  searchParams,
}: {
  searchParams?: Promise<{ error?: string }>;
}) {
  const resolvedSearchParams = await searchParams;
  return <AdminScreen view="overview" error={resolvedSearchParams?.error} />;
}
