import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

const EVENT_SELECT = `
  *,
  alerts (
    id,
    alert_type,
    status,
    sent_at
  )
`

const EVENT_STATUSES = ["active", "investigating", "resolved", "false_positive"] as const

type EventStatus = (typeof EVENT_STATUSES)[number]

type Coordinates = {
  lat: number
  lng: number
}

type EventUpdatePayload = {
  status?: EventStatus
  confidence_score?: number
  image_url?: string | null
  video_url?: string | null
  metadata?: Record<string, unknown> | null
  resolved_at?: string | null
  coordinates?: Coordinates | null
}

function isCoordinates(value: unknown): value is Coordinates {
  if (!value || typeof value !== "object") {
    return false
  }

  const { lat, lng } = value as { lat?: unknown; lng?: unknown }
  return typeof lat === "number" && typeof lng === "number"
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value)
}

// GET /api/hardware/events/{id} - 获取事件详情
export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient()

    const { data: event, error } = await supabase
      .from("waste_events")
      .select(EVENT_SELECT)
      .eq("id", params.id)
      .single()

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json({ error: "未找到事件" }, { status: 404 })
      }

      console.error("查询事件失败:", error)
      return NextResponse.json({ error: "查询事件失败" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: event,
    })
  } catch (error) {
    console.error("API错误:", error)
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 })
  }
}

// PUT /api/hardware/events/{id} - 更新事件状态/信息
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
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

    const body = parsedBody as EventUpdatePayload

    if (
      body.status === undefined &&
      body.confidence_score === undefined &&
      body.image_url === undefined &&
      body.video_url === undefined &&
      body.metadata === undefined &&
      body.resolved_at === undefined &&
      body.coordinates === undefined
    ) {
      return NextResponse.json({ error: "请提供需要更新的字段" }, { status: 400 })
    }

    const supabase = await createClient()

    const { data: existingEvent, error: fetchError } = await supabase
      .from("waste_events")
      .select("metadata, resolved_at")
      .eq("id", params.id)
      .single()

    if (fetchError) {
      if (fetchError.code === "PGRST116") {
        return NextResponse.json({ error: "未找到事件" }, { status: 404 })
      }

      console.error("查询事件失败:", fetchError)
      return NextResponse.json({ error: "查询事件失败" }, { status: 500 })
    }

    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    if (body.status) {
      if (!EVENT_STATUSES.includes(body.status)) {
        return NextResponse.json({ error: "事件状态无效" }, { status: 400 })
      }

      updates.status = body.status

      if (body.status === "resolved" && body.resolved_at === undefined) {
        updates.resolved_at = new Date().toISOString()
      }
    }

    if (body.resolved_at !== undefined) {
      if (body.resolved_at === null) {
        updates.resolved_at = null
      } else {
        const resolvedAt = Date.parse(body.resolved_at)
        if (Number.isNaN(resolvedAt)) {
          return NextResponse.json({ error: "resolved_at 时间格式无效" }, { status: 400 })
        }
        updates.resolved_at = new Date(resolvedAt).toISOString()
      }
    }

    if (body.confidence_score !== undefined) {
      if (typeof body.confidence_score !== "number" || body.confidence_score < 0 || body.confidence_score > 1) {
        return NextResponse.json({ error: "confidence_score 必须在 0 和 1 之间" }, { status: 400 })
      }
      updates.confidence_score = body.confidence_score
    }

    if (body.image_url !== undefined) {
      if (body.image_url !== null && typeof body.image_url !== "string") {
        return NextResponse.json({ error: "image_url 必须为字符串或 null" }, { status: 400 })
      }
      updates.image_url = body.image_url
    }

    if (body.video_url !== undefined) {
      if (body.video_url !== null && typeof body.video_url !== "string") {
        return NextResponse.json({ error: "video_url 必须为字符串或 null" }, { status: 400 })
      }
      updates.video_url = body.video_url
    }

    if (body.coordinates !== undefined) {
      if (body.coordinates === null) {
        updates.coordinates = null
      } else if (!isCoordinates(body.coordinates)) {
        return NextResponse.json({ error: "coordinates 格式无效" }, { status: 400 })
      } else {
        updates.coordinates = body.coordinates
      }
    }

    if (body.metadata !== undefined) {
      if (body.metadata === null) {
        updates.metadata = null
      } else if (!isRecord(body.metadata)) {
        return NextResponse.json({ error: "metadata 必须为对象" }, { status: 400 })
      } else {
        const baseMetadata = isRecord(existingEvent?.metadata)
          ? (existingEvent!.metadata as Record<string, unknown>)
          : {}
        updates.metadata = {
          ...baseMetadata,
          ...body.metadata,
        }
      }
    }

    if (Object.keys(updates).length === 1) {
      return NextResponse.json({ error: "没有可更新的字段" }, { status: 400 })
    }

    const { data: event, error: updateError } = await supabase
      .from("waste_events")
      .update(updates)
      .eq("id", params.id)
      .select(EVENT_SELECT)
      .single()

    if (updateError) {
      console.error("更新事件失败:", updateError)
      return NextResponse.json({ error: "更新事件失败" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: "事件已更新",
      data: event,
    })
  } catch (error) {
    console.error("API错误:", error)
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 })
  }
}
