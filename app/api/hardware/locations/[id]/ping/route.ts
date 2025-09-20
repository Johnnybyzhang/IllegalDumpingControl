import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

const CAMERA_STATUSES = ["active", "inactive", "maintenance"] as const

type CameraStatus = (typeof CAMERA_STATUSES)[number]

type HeartbeatPayload = {
  camera_status?: CameraStatus
  settings?: Record<string, unknown>
  metadata?: Record<string, unknown>
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value)
}

// POST /api/hardware/locations/{id}/ping - 设备心跳
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    let parsedBody: unknown = {}

    if (request.headers.get("content-length") !== "0") {
      try {
        parsedBody = await request.json()
      } catch {
        return NextResponse.json({ error: "请求体必须为JSON格式" }, { status: 400 })
      }
    }

    if (parsedBody && typeof parsedBody !== "object") {
      return NextResponse.json({ error: "请求体格式不正确" }, { status: 400 })
    }

    const body = (parsedBody ?? {}) as HeartbeatPayload
    const supabase = await createClient()

    const { data: location, error: fetchError } = await supabase
      .from("monitoring_locations")
      .select("settings")
      .eq("id", params.id)
      .single()

    if (fetchError) {
      if (fetchError.code === "PGRST116") {
        return NextResponse.json({ error: "未找到监控点" }, { status: 404 })
      }

      console.error("查询监控点失败:", fetchError)
      return NextResponse.json({ error: "查询监控点失败" }, { status: 500 })
    }

    const updates: Record<string, unknown> = {
      last_ping: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    if (body.camera_status) {
      if (!CAMERA_STATUSES.includes(body.camera_status)) {
        return NextResponse.json({ error: "camera_status 无效" }, { status: 400 })
      }
      updates.camera_status = body.camera_status
    }

    let settingsChanged = false
    const baseSettings = isRecord(location?.settings) ? { ...location!.settings } : {}

    if (body.settings) {
      if (!isRecord(body.settings)) {
        return NextResponse.json({ error: "settings 必须为对象" }, { status: 400 })
      }
      Object.assign(baseSettings, body.settings)
      settingsChanged = true
    }

    if (body.metadata) {
      if (!isRecord(body.metadata)) {
        return NextResponse.json({ error: "metadata 必须为对象" }, { status: 400 })
      }
      const telemetryBase = isRecord((baseSettings as Record<string, unknown>).telemetry)
        ? ((baseSettings as Record<string, unknown>).telemetry as Record<string, unknown>)
        : {}
      const telemetry: Record<string, unknown> = {
        ...telemetryBase,
        ...body.metadata,
        last_heartbeat_at: updates.last_ping,
      }
      const deviceId = request.headers.get("x-device-id")
      if (deviceId) {
        telemetry.device_id = deviceId
      }
      ;(baseSettings as Record<string, unknown>).telemetry = telemetry
      settingsChanged = true
    }

    if (settingsChanged) {
      updates.settings = baseSettings
    }

    const { data: updatedLocation, error: updateError } = await supabase
      .from("monitoring_locations")
      .update(updates)
      .eq("id", params.id)
      .select("*")
      .single()

    if (updateError) {
      console.error("更新监控点失败:", updateError)
      return NextResponse.json({ error: "更新监控点失败" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: "已接收设备心跳",
      data: updatedLocation,
    })
  } catch (error) {
    console.error("API错误:", error)
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 })
  }
}
