import { type NextRequest, NextResponse } from "next/server"
import { AlertStatus } from "@/lib/store/types"
import { getAlert, getEvent, updateAlert } from "@/lib/store/store"

export const dynamic = "force-dynamic"

const ALERT_STATUSES: AlertStatus[] = ["pending", "sent", "failed", "acknowledged", "active"]

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const alert = getAlert(params.id)
    if (!alert) {
      return NextResponse.json({ error: "未找到警报" }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      data: {
        ...alert,
        waste_events: alert.event_id ? getEvent(alert.event_id) ?? null : null,
      },
    })
  } catch (error) {
    console.error("API错误:", error)
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const alert = getAlert(params.id)
    if (!alert) {
      return NextResponse.json({ error: "未找到警报" }, { status: 404 })
    }

    const body = (await request.json()) as Record<string, unknown>

    const updates: Record<string, unknown> = {}

    if (body.status) {
      const status = body.status as AlertStatus
      if (!ALERT_STATUSES.includes(status)) {
        return NextResponse.json({ error: "警报状态无效" }, { status: 400 })
      }
      updates.status = status
    }

    if (body.alert_type !== undefined) {
      updates.alert_type = String(body.alert_type)
    }

    if (body.message !== undefined) {
      updates.message = String(body.message)
    }

    if (body.sent_at) {
      const sentAt = Date.parse(body.sent_at as string)
      if (Number.isNaN(sentAt)) {
        return NextResponse.json({ error: "sent_at 时间格式无效" }, { status: 400 })
      }
      updates.sent_at = new Date(sentAt).toISOString()
    }

    if (body.metadata !== undefined) {
      const metadata = body.metadata as Record<string, unknown> | null
      if (metadata !== null && typeof metadata !== "object") {
        return NextResponse.json({ error: "metadata 必须为对象" }, { status: 400 })
      }
      updates.metadata = {
        ...(alert.metadata ?? {}),
        ...(metadata ?? {}),
      }
    }

    if (updates.status === "acknowledged") {
      updates.metadata = {
        ...(alert.metadata ?? {}),
        acknowledged_at: new Date().toISOString(),
        acknowledged_by:
          typeof body.acknowledged_by === "string" && body.acknowledged_by.trim().length > 0
            ? body.acknowledged_by
            : request.headers.get("x-device-id") || "edge_device",
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "没有可更新的字段" }, { status: 400 })
    }

    const updatedAlert = updateAlert(alert.id, updates)
    if (!updatedAlert) {
      return NextResponse.json({ error: "更新警报失败" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: "警报已更新",
      data: {
        ...updatedAlert,
        waste_events: updatedAlert.event_id ? getEvent(updatedAlert.event_id) ?? null : null,
      },
    })
  } catch (error) {
    console.error("API错误:", error)
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 })
  }
}
