import { type NextRequest, NextResponse } from "next/server"
import { listLocations, upsertLocation } from "@/lib/store/store"
import type { Coordinates } from "@/lib/store/types"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const activeOnly = searchParams.get("active_only") === "true"

    let locations = listLocations()

    if (activeOnly) {
      locations = locations.filter((location) => location.camera_status === "active")
    }

    return NextResponse.json({
      success: true,
      data: locations,
      count: locations.length,
    })
  } catch (error) {
    console.error("API错误:", error)
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as {
      id?: string
      name?: string
      address?: string | null
      coordinates?: Coordinates
      camera_status?: string
      settings?: Record<string, unknown>
    }

    if (!body.id || !body.name || !body.coordinates) {
      return NextResponse.json({ error: "缺少必需字段: id, name, coordinates" }, { status: 400 })
    }

    const location = upsertLocation({
      id: body.id,
      name: body.name,
      address: body.address ?? null,
      coordinates: body.coordinates,
      camera_status: body.camera_status ?? "active",
      settings: {
        ...(body.settings ?? {}),
        registered_by: "hardware_device",
        device_id: request.headers.get("x-device-id") || "unknown",
      },
    })

    return NextResponse.json({
      success: true,
      message: "监控点注册成功",
      data: location,
    })
  } catch (error) {
    console.error("API错误:", error)
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 })
  }
}
