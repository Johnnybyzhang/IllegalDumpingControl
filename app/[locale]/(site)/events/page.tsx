import { Suspense } from "react"
import { EventManagement } from "@/components/event-management"
import { DashboardSkeleton } from "@/components/dashboard-skeleton"

export default function EventsPage() {
  return (
    <div className="min-h-screen bg-background">
      <Suspense fallback={<DashboardSkeleton />}>
        <EventManagement />
      </Suspense>
    </div>
  )
}
