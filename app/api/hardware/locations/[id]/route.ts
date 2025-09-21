
import { type NextRequest, NextResponse } from "next/server"
import { getLocation, upsertLocation } from "@/lib/store/store"
import type { Coordinates } from "@/lib/store/types"

export const dynamic = "force-dynamic"

const CAMERA_STATUSES = ["active", "inactive", "maintenance"] as const

type LocationUpdatePayload = {
  name?: string
  address?: string | null
  coordinates?: Coordinates | null
  camera_status?: string
  settings?: Record<string, unknown> | null
}

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const location = getLocation(params.id)
    if (!location) {
      return NextResponse.json({ error: "未找到监控点" }, { status: 404 })
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

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const existing = getLocation(params.id)
    if (!existing) {
      return NextResponse.json({ error: "未找到监控点" }, { status: 404 })
    }

    const body = (await request.json()) as LocationUpdatePayload

    if (
      body.name === undefined &&
      body.address === undefined &&
      body.coordinates === undefined &&
      body.camera_status === undefined &&
      body.settings === undefined
    ) {
      return NextResponse.json({ error: "请提供需要更新的字段" }, { status: 400 })
    }

    if (
      body.camera_status &&
      !CAMERA_STATUSES.includes(body.camera_status as (typeof CAMERA_STATUSES)[number])
    ) {
      return NextResponse.json({ error: "camera_status 无效" }, { status: 400 })
    }

    if (body.coordinates) {
      const { lat, lng } = body.coordinates
      if (typeof lat !== "number" || typeof lng !== "number") {
        return NextResponse.json({ error: "coordinates 格式无效" }, { status: 400 })
      }
    }

    const location = upsertLocation({
      id: existing.id,
      name: body.name ?? existing.name,
      address: body.address !== undefined ? body.address : existing.address,
      coordinates: body.coordinates !== undefined ? body.coordinates : existing.coordinates,
      camera_status: body.camera_status ?? existing.camera_status ?? "active",
      settings: body.settings ?? existing.settings,
    })

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
