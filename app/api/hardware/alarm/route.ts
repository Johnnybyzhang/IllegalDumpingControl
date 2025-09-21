import { NextResponse, type NextRequest } from "next/server"

const EDGE_BASE_URL = process.env.EDGE_CONTROL_URL || "http://127.0.0.1:8000"

export async function GET() {
  try {
    const res = await fetch(`${EDGE_BASE_URL}/alarm`, { cache: "no-store" })
    if (!res.ok) {
      throw new Error(`Edge alarm status failed with ${res.status}`)
    }
    const data = await res.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error("Failed to read alarm status", error)
    return NextResponse.json({ error: "Failed to read alarm status" }, { status: 502 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const res = await fetch(`${EDGE_BASE_URL}/alarm`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body ?? { action: "trigger" }),
    })

    if (!res.ok) {
      const text = await res.text()
      throw new Error(`Edge alarm request failed ${res.status}: ${text}`)
    }

    const data = await res.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error("Failed to control alarm", error)
    return NextResponse.json({ error: "Failed to control alarm" }, { status: 502 })
  }
}
