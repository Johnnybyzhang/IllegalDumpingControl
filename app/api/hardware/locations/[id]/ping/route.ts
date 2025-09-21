
import { type NextRequest, NextResponse } from "next/server"
import { recordLocationPing } from "@/lib/store/store"
import type { Coordinates } from "@/lib/store/types"

export const dynamic = "force-dynamic"

type PingPayload = {
  camera_status?: string
  settings?: Record<string, unknown>
  metadata?: Record<string, unknown>
  coordinates?: Coordinates
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = (await request.json()) as PingPayload

    const location = recordLocationPing(params.id, {
      camera_status: body.camera_status,
      settings: body.settings,
      metadata: {
        ...(body.metadata ?? {}),
        last_device_id: request.headers.get("x-device-id") || "unknown",
      },
    })

    return NextResponse.json({
      success: true,
      message: "心跳已记录",
      data: location,
    })
  } catch (error) {
    console.error("API错误:", error)
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 })
  }
}
