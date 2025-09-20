import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

// GET /api/hardware/locations - 获取监控点列表
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)

    const active_only = searchParams.get("active_only") === "true"

    let query = supabase.from("monitoring_locations").select("*").order("created_at", { ascending: false })

    if (active_only) {
      query = query.eq("camera_status", "active")
    }

    const { data: locations, error } = await query

    if (error) {
      return NextResponse.json({ error: "查询监控点失败" }, { status: 500 })
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

// POST /api/hardware/locations - 注册新监控点
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()

    const { id, name, address, coordinates, camera_status = "active", settings = {} } = body

    if (!id || !name || !coordinates) {
      return NextResponse.json({ error: "缺少必需字段: id, name, coordinates" }, { status: 400 })
    }

    const { data: location, error } = await supabase
      .from("monitoring_locations")
      .insert({
        id,
        name,
        address,
        coordinates,
        camera_status,
        settings: {
          ...settings,
          registered_by: "hardware_device",
          device_id: request.headers.get("x-device-id") || "unknown",
        },
        last_ping: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) {
      if (error.code === "23505") {
        // 唯一约束违反
        return NextResponse.json({ error: "监控点ID已存在" }, { status: 409 })
      }
      return NextResponse.json({ error: "创建监控点失败" }, { status: 500 })
    }

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
