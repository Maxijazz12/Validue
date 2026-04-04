import SignupPageClient from "./SignupPageClient";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const params = await searchParams;

  return <SignupPageClient rawNext={params.next ?? null} />;
}
