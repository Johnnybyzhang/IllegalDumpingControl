import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

// POST /api/hardware/events - 硬件设备上报废物倾倒事件
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()

    // 验证必需字段
    const { location_id, event_type, coordinates, confidence_score, image_url, video_url, metadata } = body

    if (!location_id || !event_type || !coordinates) {
      return NextResponse.json({ error: "缺少必需字段: location_id, event_type, coordinates" }, { status: 400 })
    }

    // 获取监控点信息
    const { data: location } = await supabase
      .from("monitoring_locations")
      .select("name, address")
      .eq("id", location_id)
      .single()

    // 创建废物事件记录
    const { data: event, error } = await supabase
      .from("waste_events")
      .insert({
        location_id,
        location_name: location?.name || "未知位置",
        event_type,
        coordinates,
        confidence_score: confidence_score || 0.8,
        image_url,
        video_url,
        status: "pending",
        detected_at: new Date().toISOString(),
        metadata: {
          ...metadata,
          source: "hardware_device",
          device_id: request.headers.get("x-device-id") || "unknown",
        },
      })
      .select()
      .single()

    if (error) {
      console.error("创建事件失败:", error)
      return NextResponse.json({ error: "创建事件失败" }, { status: 500 })
    }

    // 创建警报
    await supabase.from("alerts").insert({
      event_id: event.id,
      alert_type: "waste_detected",
      message: `检测到${event_type}事件在${location?.name || location_id}`,
      status: "active",
      sent_at: new Date().toISOString(),
      metadata: {
        location_id,
        confidence_score,
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

// GET /api/hardware/events - 查询事件列表
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)

    const location_id = searchParams.get("location_id")
    const status = searchParams.get("status")
    const limit = Number.parseInt(searchParams.get("limit") || "50")
    const offset = Number.parseInt(searchParams.get("offset") || "0")

    let query = supabase
      .from("waste_events")
      .select("*")
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1)

    if (location_id) {
      query = query.eq("location_id", location_id)
    }

    if (status) {
      query = query.eq("status", status)
    }

    const { data: events, error } = await query

    if (error) {
      return NextResponse.json({ error: "查询事件失败" }, { status: 500 })
    }

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
