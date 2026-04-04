import { redirect } from "next/navigation";

export default function EarningsRedirect() {
  redirect("/dashboard/my-responses");
}
