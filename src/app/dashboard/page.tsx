import { redirect } from "next/navigation";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ subscribed?: string }>;
}) {
  const params = await searchParams;
  const sub = params?.subscribed;
  const target = sub
    ? `/dashboard/the-wall?subscribed=${encodeURIComponent(sub)}`
    : "/dashboard/the-wall";
  redirect(target);
}
