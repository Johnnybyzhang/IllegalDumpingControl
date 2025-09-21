import { type NextRequest, NextResponse } from "next/server"
import { createAlert, getEvent, listAlerts } from "@/lib/store/store"

export const dynamic = "force-dynamic"

// GET /api/hardware/alerts
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const location_id = searchParams.get("location_id") ?? undefined
    const status = searchParams.get("status") ?? undefined
    const limit = Number.parseInt(searchParams.get("limit") || "20", 10)

    const alerts = listAlerts({ status: status as any, location_id, limit })

    const result = alerts.map((alert) => ({
      ...alert,
      waste_events: alert.event_id ? getEvent(alert.event_id) ?? null : null,
    }))

    return NextResponse.json({
      success: true,
      data: result,
      count: result.length,
    })
  } catch (error) {
    console.error("API错误:", error)
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 })
  }
}
