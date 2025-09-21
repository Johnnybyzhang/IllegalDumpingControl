export type Coordinates = {
  lat: number
  lng: number
}

export type EventStatus = "active" | "investigating" | "resolved" | "false_positive" | "pending"

export interface StoredEvent {
  id: string
  location_id: string
  location_name: string
  event_type: string
  coordinates: Coordinates | null
  confidence_score: number
  image_url: string | null
  video_url: string | null
  status: EventStatus
  detected_at: string
  resolved_at: string | null
  metadata: Record<string, unknown> | null
  created_at: string
  updated_at: string
}

export type AlertStatus = "pending" | "sent" | "failed" | "acknowledged" | "active"

export interface StoredAlert {
  id: string
  event_id: string | null
  alert_type: string
  message: string
  status: AlertStatus
  sent_at: string
  metadata: Record<string, unknown> | null
  created_at: string
  updated_at: string
}

export interface StoredLocation {
  id: string
  name: string
  address: string | null
  coordinates: Coordinates | null
  camera_status: string | null
  settings: Record<string, unknown> | null
  metadata: Record<string, unknown> | null
  created_at: string
  updated_at: string
}

export interface DatabaseState {
  events: StoredEvent[]
  alerts: StoredAlert[]
  locations: StoredLocation[]
}

export interface ListParams {
  offset?: number
  limit?: number
}
