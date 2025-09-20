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

const ALERT_STATUSES = ["pending", "sent", "failed", "acknowledged"] as const

type AlertStatus = (typeof ALERT_STATUSES)[number]

type AlertUpdatePayload = {
  status?: AlertStatus
  alert_type?: string
  message?: string
  sent_at?: string
  metadata?: Record<string, unknown> | null
  acknowledged_by?: string
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value)
}

// GET /api/hardware/alerts/{id} - 获取警报详情
export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient()

    const { data: alert, error } = await supabase
      .from("alerts")
      .select(ALERT_SELECT)
      .eq("id", params.id)
      .single()

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json({ error: "未找到警报" }, { status: 404 })
      }

      console.error("查询警报详情失败:", error)
      return NextResponse.json({ error: "查询警报详情失败" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: alert,
    })
  } catch (error) {
    console.error("API错误:", error)
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 })
  }
}

// PATCH /api/hardware/alerts/{id} - 更新警报信息 / 确认警报
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    let parsedBody: unknown

    try {
      parsedBody = await request.json()
    } catch {
      return NextResponse.json({ error: "请求体必须为JSON格式" }, { status: 400 })
    }

    if (!parsedBody || typeof parsedBody !== "object" || Array.isArray(parsedBody)) {
      return NextResponse.json({ error: "请求体格式不正确" }, { status: 400 })
    }

    const body = parsedBody as AlertUpdatePayload

    if (!body.status && !body.alert_type && !body.message && body.metadata === undefined && !body.sent_at) {
      return NextResponse.json({ error: "请提供需要更新的字段" }, { status: 400 })
    }

    const supabase = await createClient()

    const { data: existingAlert, error: fetchError } = await supabase
      .from("alerts")
      .select("metadata")
      .eq("id", params.id)
      .single()

    if (fetchError) {
      if (fetchError.code === "PGRST116") {
        return NextResponse.json({ error: "未找到警报" }, { status: 404 })
      }

      console.error("查询警报失败:", fetchError)
      return NextResponse.json({ error: "查询警报失败" }, { status: 500 })
    }

    const updates: Record<string, unknown> = {}
    let metadata = existingAlert?.metadata as Record<string, unknown> | null
    let metadataChanged = false

    if (body.status) {
      if (!ALERT_STATUSES.includes(body.status)) {
        return NextResponse.json({ error: "警报状态无效" }, { status: 400 })
      }

      updates.status = body.status
    }

    if (body.alert_type !== undefined) {
      if (typeof body.alert_type !== "string") {
        return NextResponse.json({ error: "alert_type 必须为字符串" }, { status: 400 })
      }
      updates.alert_type = body.alert_type
    }

    if (body.message !== undefined) {
      if (typeof body.message !== "string") {
        return NextResponse.json({ error: "message 必须为字符串" }, { status: 400 })
      }
      updates.message = body.message
    }

    if (body.sent_at) {
      const sentAt = Date.parse(body.sent_at)
      if (Number.isNaN(sentAt)) {
        return NextResponse.json({ error: "sent_at 时间格式无效" }, { status: 400 })
      }
      updates.sent_at = new Date(sentAt).toISOString()
    }

    if (body.metadata !== undefined) {
      if (body.metadata === null) {
        metadata = null
      } else if (!isRecord(body.metadata)) {
        return NextResponse.json({ error: "metadata 必须为对象" }, { status: 400 })
      } else {
        metadata = {
          ...(metadata ?? {}),
          ...body.metadata,
        }
      }
      metadataChanged = true
    }

    if (body.status === "acknowledged") {
      const acknowledgedBy =
        typeof body.acknowledged_by === "string" && body.acknowledged_by.trim().length > 0
          ? body.acknowledged_by
          : request.headers.get("x-device-id") || "edge_device"
      metadata = {
        ...(metadata ?? {}),
        acknowledged_at: new Date().toISOString(),
        acknowledged_by: acknowledgedBy,
      }
      metadataChanged = true
    }

    if (metadataChanged) {
      updates.metadata = metadata
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "没有可更新的字段" }, { status: 400 })
    }

    const { data: alert, error: updateError } = await supabase
      .from("alerts")
      .update(updates)
      .eq("id", params.id)
      .select(ALERT_SELECT)
      .single()

    if (updateError) {
      console.error("更新警报失败:", updateError)
      return NextResponse.json({ error: "更新警报失败" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: "警报已更新",
      data: alert,
    })
  } catch (error) {
    console.error("API错误:", error)
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 })
  }
}
