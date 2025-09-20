import { redirect } from "next/navigation"

import { getDefaultLocalePath } from "@/lib/i18n/routing"

export default function IndexRedirectPage() {
  redirect(getDefaultLocalePath())
}
