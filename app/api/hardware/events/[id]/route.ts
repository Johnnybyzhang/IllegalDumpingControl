import { type NextRequest, NextResponse } from "next/server"
import {
  getAlert,
  getAlertsByEventId,
  getEvent,
  updateAlert,
  updateEvent,
} from "@/lib/store/store"
import type { EventStatus } from "@/lib/store/types"

export const dynamic = "force-dynamic"

const EVENT_STATUSES: EventStatus[] = ["active", "investigating", "resolved", "false_positive", "pending"]

// GET /api/hardware/events/{id}
export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const event = getEvent(params.id)
    if (!event) {
      return NextResponse.json({ error: "未找到事件" }, { status: 404 })
    }

    const alerts = getAlertsByEventId(event.id)

    return NextResponse.json({
      success: true,
      data: {
        ...event,
        alerts,
      },
    })
  } catch (error) {
    console.error("API错误:", error)
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 })
  }
}

// PUT /api/hardware/events/{id}
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const event = getEvent(params.id)
    if (!event) {
      return NextResponse.json({ error: "未找到事件" }, { status: 404 })
    }

    const body = (await request.json()) as Record<string, unknown>

    const updates: Record<string, unknown> = {}

    if (body.status) {
      const status = body.status as EventStatus
      if (!EVENT_STATUSES.includes(status)) {
        return NextResponse.json({ error: "事件状态无效" }, { status: 400 })
      }
      updates.status = status
      if (status === "resolved" && !body.resolved_at) {
        updates.resolved_at = new Date().toISOString()
      }
    }

    if (body.resolved_at) {
      const resolvedAt = Date.parse(body.resolved_at as string)
      if (Number.isNaN(resolvedAt)) {
        return NextResponse.json({ error: "resolved_at 时间格式无效" }, { status: 400 })
      }
      updates.resolved_at = new Date(resolvedAt).toISOString()
    }

    if (body.confidence_score !== undefined) {
      const confidence = Number(body.confidence_score)
      if (Number.isNaN(confidence) || confidence < 0 || confidence > 1) {
        return NextResponse.json({ error: "confidence_score 必须在 0 和 1 之间" }, { status: 400 })
      }
      updates.confidence_score = confidence
    }

    if (body.coordinates) {
      const coords = body.coordinates as { lat?: unknown; lng?: unknown }
      if (typeof coords.lat !== "number" || typeof coords.lng !== "number") {
        return NextResponse.json({ error: "coordinates 格式无效" }, { status: 400 })
      }
      updates.coordinates = { lat: coords.lat, lng: coords.lng }
    }

    if (body.image_url !== undefined) {
      updates.image_url = body.image_url === null ? null : String(body.image_url)
    }

    if (body.video_url !== undefined) {
      updates.video_url = body.video_url === null ? null : String(body.video_url)
    }

    if (body.metadata !== undefined) {
      const metadata = body.metadata as Record<string, unknown> | null
      if (metadata !== null && typeof metadata !== "object") {
        return NextResponse.json({ error: "metadata 必须为对象" }, { status: 400 })
      }
      updates.metadata = {
        ...(event.metadata ?? {}),
        ...(metadata ?? {}),
      }
    }

    const updatedEvent = updateEvent(event.id, updates)

    if (!updatedEvent) {
      return NextResponse.json({ error: "更新事件失败" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: "事件已更新",
      data: updatedEvent,
    })
  } catch (error) {
    console.error("API错误:", error)
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 })
  }
}
