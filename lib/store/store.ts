import { randomUUID } from "crypto"
import { EventEmitter } from "events"
import { DatabaseState, StoredAlert, StoredEvent, StoredLocation, EventStatus, AlertStatus, Coordinates } from "./types"

const db: DatabaseState = {
  events: [],
  alerts: [],
  locations: [],
}

export const eventBus = new EventEmitter()

function now(): string {
  return new Date().toISOString()
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value))
}

export function listEvents(params?: {
  status?: EventStatus
  location_id?: string
  limit?: number
  offset?: number
}): StoredEvent[] {
  const { status, location_id, limit = 50, offset = 0 } = params || {}
  let result = db.events.slice().sort((a, b) => (a.detected_at < b.detected_at ? 1 : -1))
  if (status) {
    result = result.filter((event) => event.status === status)
  }
  if (location_id) {
    result = result.filter((event) => event.location_id === location_id)
  }
  return clone(result.slice(offset, offset + limit))
}

export function getEvent(id: string): StoredEvent | undefined {
  const event = db.events.find((item) => item.id === id)
  return event ? clone(event) : undefined
}

export function createEvent(data: {
  location_id: string
  location_name: string
  event_type: string
  coordinates?: Coordinates | null
  confidence_score?: number
  image_url?: string | null
  video_url?: string | null
  status?: EventStatus
  metadata?: Record<string, unknown> | null
}): StoredEvent {
  const timestamp = now()
  const event: StoredEvent = {
    id: randomUUID(),
    location_id: data.location_id,
    location_name: data.location_name,
    event_type: data.event_type,
    coordinates: data.coordinates ?? null,
    confidence_score: data.confidence_score ?? 0.5,
    image_url: data.image_url ?? null,
    video_url: data.video_url ?? null,
    status: data.status ?? "active",
    detected_at: timestamp,
    resolved_at: null,
    metadata: data.metadata ?? null,
    created_at: timestamp,
    updated_at: timestamp,
  }

  db.events.push(event)
  eventBus.emit("event_created", clone(event))
  return clone(event)
}

export function updateEvent(id: string, updates: Partial<StoredEvent>): StoredEvent | undefined {
  const index = db.events.findIndex((event) => event.id === id)
  if (index === -1) {
    return undefined
  }

  const existing = db.events[index]
  const updated: StoredEvent = {
    ...existing,
    ...updates,
    updated_at: now(),
  }
  db.events[index] = updated
  eventBus.emit("event_updated", clone(updated))
  return clone(updated)
}

export function listAlerts(params?: {
  status?: AlertStatus
  location_id?: string
  limit?: number
}): StoredAlert[] {
  const { status, location_id, limit = 20 } = params || {}
  let result = db.alerts.slice().sort((a, b) => (a.sent_at < b.sent_at ? 1 : -1))
  if (status) {
    result = result.filter((alert) => alert.status === status)
  }
  if (location_id) {
    const relatedEventIds = db.events.filter((event) => event.location_id === location_id).map((event) => event.id)
    result = result.filter((alert) => alert.event_id && relatedEventIds.includes(alert.event_id))
  }
  return clone(result.slice(0, limit))
}

export function getAlert(id: string): StoredAlert | undefined {
  const alert = db.alerts.find((item) => item.id === id)
  return alert ? clone(alert) : undefined
}

export function createAlert(data: {
  event_id: string | null
  alert_type: string
  message: string
  status?: AlertStatus
  metadata?: Record<string, unknown> | null
}): StoredAlert {
  const timestamp = now()
  const alert: StoredAlert = {
    id: randomUUID(),
    event_id: data.event_id,
    alert_type: data.alert_type,
    message: data.message,
    status: data.status ?? "active",
    sent_at: timestamp,
    metadata: data.metadata ?? null,
    created_at: timestamp,
    updated_at: timestamp,
  }

  db.alerts.push(alert)
  eventBus.emit("alert_created", clone(alert))
  return clone(alert)
}

export function updateAlert(id: string, updates: Partial<StoredAlert>): StoredAlert | undefined {
  const index = db.alerts.findIndex((alert) => alert.id === id)
  if (index === -1) {
    return undefined
  }

  const existing = db.alerts[index]
  const updated: StoredAlert = {
    ...existing,
    ...updates,
    updated_at: now(),
  }
  db.alerts[index] = updated
  eventBus.emit("alert_updated", clone(updated))
  return clone(updated)
}

export function listLocations(): StoredLocation[] {
  const result = db.locations.slice().sort((a, b) => a.name.localeCompare(b.name))
  return clone(result)
}

export function getLocation(id: string): StoredLocation | undefined {
  const location = db.locations.find((item) => item.id === id)
  return location ? clone(location) : undefined
}

export function upsertLocation(data: {
  id: string
  name: string
  address?: string | null
  coordinates?: Coordinates | null
  camera_status?: string | null
  settings?: Record<string, unknown> | null
  metadata?: Record<string, unknown> | null
}): StoredLocation {
  const existingIndex = db.locations.findIndex((loc) => loc.id === data.id)
  const timestamp = now()

  if (existingIndex !== -1) {
    const existing = db.locations[existingIndex]
    const updated: StoredLocation = {
      ...existing,
      name: data.name ?? existing.name,
      address: data.address ?? existing.address,
      coordinates: data.coordinates ?? existing.coordinates,
      camera_status: data.camera_status ?? existing.camera_status,
      settings: data.settings ?? existing.settings,
      metadata: data.metadata ?? existing.metadata,
      updated_at: timestamp,
    }
    db.locations[existingIndex] = updated
    eventBus.emit("location_updated", clone(updated))
    return clone(updated)
  }

  const location: StoredLocation = {
    id: data.id,
    name: data.name,
    address: data.address ?? null,
    coordinates: data.coordinates ?? null,
    camera_status: data.camera_status ?? "active",
    settings: data.settings ?? null,
    metadata: data.metadata ?? null,
    created_at: timestamp,
    updated_at: timestamp,
  }

  db.locations.push(location)
  eventBus.emit("location_created", clone(location))
  return clone(location)
}

export function recordLocationPing(
  id: string,
  payload: {
    camera_status?: string
    settings?: Record<string, unknown>
    metadata?: Record<string, unknown>
  },
): StoredLocation | undefined {
  const existing = db.locations.find((loc) => loc.id === id)
  const timestamp = now()
  if (!existing) {
    const location = upsertLocation({
      id,
      name: id,
      camera_status: payload.camera_status ?? "active",
      metadata: payload.metadata ?? null,
      settings: payload.settings ?? null,
    })
    return location
  }

  const updated: StoredLocation = {
    ...existing,
    camera_status: payload.camera_status ?? existing.camera_status,
    settings: payload.settings ?? existing.settings,
    metadata: {
      ...(existing.metadata ?? {}),
      ...(payload.metadata ?? {}),
      last_ping: timestamp,
    },
    updated_at: timestamp,
  }

  const index = db.locations.findIndex((loc) => loc.id === id)
  db.locations[index] = updated
  eventBus.emit("location_updated", clone(updated))
  return clone(updated)
}

export function getAlertsByEventId(eventId: string): StoredAlert[] {
  return clone(db.alerts.filter((alert) => alert.event_id === eventId))
}

export function getSummary(): {
  events: StoredEvent[]
  locations: StoredLocation[]
  alerts: StoredAlert[]
} {
  return {
    events: clone(db.events),
    locations: clone(db.locations),
    alerts: clone(db.alerts),
  }
}

export function resetStore() {
  db.events = []
  db.alerts = []
  db.locations = []
}
