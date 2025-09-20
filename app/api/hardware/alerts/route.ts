import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

const ALERT_SELECT = `
  *,
  waste_events (
    location_id,
    location_name,
    event_type,
    coordinates
  )
`

// GET /api/hardware/alerts - 获取警报列表
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)

    const location_id = searchParams.get("location_id")
    const status = searchParams.get("status")
    const limit = Number.parseInt(searchParams.get("limit") || "20")

    let query = supabase.from("alerts").select(ALERT_SELECT).order("sent_at", { ascending: false }).limit(limit)

    if (status) {
      query = query.eq("status", status)
    }

    if (location_id) {
      query = query.eq("waste_events.location_id", location_id)
    }

    const { data: alerts, error } = await query

    if (error) {
      console.error("查询警报失败:", error)
      return NextResponse.json({ error: "查询警报失败" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: alerts,
      count: alerts.length,
    })
  } catch (error) {
    console.error("API错误:", error)
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 })
  }
}
