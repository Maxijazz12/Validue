import LoginPageClient from "./LoginPageClient";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const params = await searchParams;

  return <LoginPageClient rawNext={params.next ?? null} />;
}
