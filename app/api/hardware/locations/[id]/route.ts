import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

const CAMERA_STATUSES = ["active", "inactive", "maintenance"] as const

type CameraStatus = (typeof CAMERA_STATUSES)[number]

type Coordinates = {
  lat: number
  lng: number
}

type LocationUpdatePayload = {
  name?: string
  address?: string
  coordinates?: Coordinates | null
  camera_status?: CameraStatus
  settings?: Record<string, unknown>
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

// GET /api/hardware/locations/{id} - 获取监控点详情
export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient()

    const { data: location, error } = await supabase
      .from("monitoring_locations")
      .select("*")
      .eq("id", params.id)
      .single()

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json({ error: "未找到监控点" }, { status: 404 })
      }

      console.error("查询监控点失败:", error)
      return NextResponse.json({ error: "查询监控点失败" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: location,
    })
  } catch (error) {
    console.error("API错误:", error)
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 })
  }
}

// PATCH /api/hardware/locations/{id} - 更新监控点信息
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

    const body = parsedBody as LocationUpdatePayload

    if (
      body.name === undefined &&
      body.address === undefined &&
      body.coordinates === undefined &&
      body.camera_status === undefined &&
      body.settings === undefined
    ) {
      return NextResponse.json({ error: "请提供需要更新的字段" }, { status: 400 })
    }

    const supabase = await createClient()

    const { data: existingLocation, error: fetchError } = await supabase
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
      updated_at: new Date().toISOString(),
    }

    if (body.name !== undefined) {
      updates.name = body.name
    }

    if (body.address !== undefined) {
      updates.address = body.address
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

    if (body.camera_status) {
      if (!CAMERA_STATUSES.includes(body.camera_status)) {
        return NextResponse.json({ error: "camera_status 无效" }, { status: 400 })
      }
      updates.camera_status = body.camera_status
    }

    if (body.settings) {
      if (!isRecord(body.settings)) {
        return NextResponse.json({ error: "settings 必须为对象" }, { status: 400 })
      }
      const mergedSettings = isRecord(existingLocation?.settings)
        ? { ...(existingLocation!.settings as Record<string, unknown>), ...body.settings }
        : { ...body.settings }
      updates.settings = mergedSettings
    }

    if (Object.keys(updates).length === 1) {
      return NextResponse.json({ error: "没有可更新的字段" }, { status: 400 })
    }

    const { data: location, error: updateError } = await supabase
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
      message: "监控点已更新",
      data: location,
    })
  } catch (error) {
    console.error("API错误:", error)
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 })
  }
}
