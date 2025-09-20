import { Suspense } from "react"
import { AnalyticsDashboard } from "@/components/analytics-dashboard"
import { DashboardSkeleton } from "@/components/dashboard-skeleton"

export default function AnalyticsPage() {
  return (
    <div className="min-h-screen bg-background">
      <Suspense fallback={<DashboardSkeleton />}>
        <AnalyticsDashboard />
      </Suspense>
    </div>
  )
}
