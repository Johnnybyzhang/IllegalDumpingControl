"use client"

import { useState } from "react"
import { Suspense } from "react"
import { MonitoringDashboard } from "@/components/monitoring-dashboard"
import { CommunityPanel } from "@/components/community-panel"
import { DashboardSkeleton } from "@/components/dashboard-skeleton"
import { AuthGuard } from "@/components/auth-guard"
import { ClientSelector } from "@/components/client-selector"

export default function HomePage() {
  const [clientType, setClientType] = useState<"government" | "community" | null>(null)

  const handleClientSelect = (type: "government" | "community") => {
    setClientType(type)
  }

  const handleBackToSelector = () => {
    setClientType(null)
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-background">
        {!clientType ? (
          <ClientSelector onClientSelect={handleClientSelect} />
        ) : (
          <Suspense fallback={<DashboardSkeleton />}>
            {clientType === "government" ? (
              <MonitoringDashboard onBackToSelector={handleBackToSelector} />
            ) : (
              <CommunityPanel onBackToSelector={handleBackToSelector} />
            )}
          </Suspense>
        )}
      </div>
    </AuthGuard>
  )
}
