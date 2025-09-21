import { AlertSystemClient, type AlertRecord, type WasteEvent } from "@/components/alert-system-client"
import { getSummary } from "@/lib/store/store"

export async function AlertSystem() {
  const { alerts, events } = getSummary()

  const eventsMap = new Map(events.map((event) => [event.id, event]))

  const formattedAlerts: AlertRecord[] = alerts
    .sort((a, b) => (a.sent_at < b.sent_at ? 1 : -1))
    .slice(0, 50)
    .map((alert) => ({
      ...alert,
      waste_events: alert.event_id ? (eventsMap.get(alert.event_id) as WasteEvent | undefined) ?? null : null,
    })) as AlertRecord[]

  const activeEvents: WasteEvent[] = events
    .filter((event) => event.status === "active" && event.event_type === "illegal_dumping")
    .map((event) => ({ ...event })) as WasteEvent[]

  return <AlertSystemClient initialAlerts={formattedAlerts} initialActiveEvents={activeEvents} />
}
