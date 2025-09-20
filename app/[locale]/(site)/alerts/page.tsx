import { Suspense } from "react"
import { AlertSystem } from "@/components/alert-system"
import { DashboardSkeleton } from "@/components/dashboard-skeleton"

export default function AlertsPage() {
  return (
    <div className="min-h-screen bg-background">
      <Suspense fallback={<DashboardSkeleton />}>
        <AlertSystem />
      </Suspense>
    </div>
  )
}
