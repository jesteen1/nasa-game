import { redirect } from "next/navigation";

// The briefing now lives at "/". Keep the old URL working for bookmarks.
export default function InstructionsRedirect() {
  redirect("/");
}
