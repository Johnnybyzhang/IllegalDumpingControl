import { type NextRequest, NextResponse } from "next/server"
import {
  createAlert,
  createEvent,
  getLocation,
  listEvents,
  upsertLocation,
} from "@/lib/store/store"

export const dynamic = "force-dynamic"

function validateCoordinates(value: unknown) {
  if (!value || typeof value !== "object") {
    return false
  }
  const { lat, lng } = value as { lat?: unknown; lng?: unknown }
  return typeof lat === "number" && typeof lng === "number"
}

// POST /api/hardware/events - hardware device reports an event
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { location_id, event_type, coordinates, confidence_score, image_url, video_url, metadata } = body ?? {}

    if (!location_id || !event_type || (coordinates && !validateCoordinates(coordinates))) {
      return NextResponse.json({ error: "缺少必需字段或坐标格式无效" }, { status: 400 })
    }

    const existingLocation = getLocation(location_id)
    const locationName = existingLocation?.name ?? location_id

    if (!existingLocation) {
      upsertLocation({
        id: location_id,
        name: locationName,
        coordinates: coordinates ?? null,
        metadata: metadata ?? null,
      })
    }

    const event = createEvent({
      location_id,
      location_name: locationName,
      event_type,
      coordinates: coordinates ?? null,
      confidence_score: confidence_score ?? 0.8,
      image_url: image_url ?? null,
      video_url: video_url ?? null,
      metadata: metadata ?? null,
      status: "active",
    })

    createAlert({
      event_id: event.id,
      alert_type: "waste_detected",
      message: `检测到${event_type}事件在${locationName}`,
      status: "active",
      metadata: {
        location_id,
        confidence_score: confidence_score ?? 0.8,
        ...(metadata ?? {}),
      },
    })

    return NextResponse.json({
      success: true,
      event_id: event.id,
      message: "事件上报成功",
      data: event,
    })
  } catch (error) {
    console.error("API错误:", error)
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 })
  }
}

// GET /api/hardware/events - query events
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const location_id = searchParams.get("location_id") ?? undefined
    const status = (searchParams.get("status") ?? undefined) as
      | "active"
      | "investigating"
      | "resolved"
      | "false_positive"
      | undefined
    const limit = Number.parseInt(searchParams.get("limit") || "50", 10)
    const offset = Number.parseInt(searchParams.get("offset") || "0", 10)

    const events = listEvents({ location_id, status, limit, offset })

    return NextResponse.json({
      success: true,
      data: events,
      count: events.length,
    })
  } catch (error) {
    console.error("API错误:", error)
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 })
  }
}
