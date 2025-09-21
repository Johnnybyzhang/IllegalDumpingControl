import { NextResponse } from "next/server"
import { eventBus } from "@/lib/store/store"

export const dynamic = "force-dynamic"

export async function GET() {
  const stream = new ReadableStream({
    start(controller) {
      function send(event: string, payload: unknown) {
        controller.enqueue(`event: ${event}\n`)
        controller.enqueue(`data: ${JSON.stringify(payload)}\n\n`)
      }

      const events = ["event_created", "event_updated", "alert_created", "alert_updated", "location_updated"] as const

      const handlers = events.map((event) => {
        const handler = (payload: unknown) => send(event, payload)
        eventBus.on(event, handler)
        return { event, handler }
      })

      send("stream_ready", { ok: true })

      controller.enqueue(`: keep-alive\n\n`)

      const interval = setInterval(() => {
        controller.enqueue(`: ping ${Date.now()}\n\n`)
      }, 15000)

      controller.signal.addEventListener("abort", () => {
        handlers.forEach(({ event, handler }) => eventBus.off(event, handler))
        clearInterval(interval)
      })
    },
  })

  return new NextResponse(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  })
}
