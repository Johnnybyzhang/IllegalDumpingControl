import { redirect } from "next/navigation"

import { getDefaultLocalePath } from "@/lib/i18n/routing"

export default function DevicesRedirectPage() {
  redirect(getDefaultLocalePath("devices"))
}
