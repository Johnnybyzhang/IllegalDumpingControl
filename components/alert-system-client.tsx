"use client"

import { useEffect, useRef, useState } from "react"
import { AlertHistory } from "@/components/alert-history"
import { AlertSettings } from "@/components/alert-settings"
import { EmergencyControls } from "@/components/emergency-controls"
import { VoiceControls } from "@/components/voice-controls"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Bell, Zap } from "lucide-react"
import Link from "next/link"
import Image from "next/image"

export interface WasteEvent {
  id: string
  location_name: string
  event_type: string
  confidence_score: number
  detected_at: string
  status?: string
}

export interface AlertRecord {
  id: string
  alert_type: string
  message: string
  status: string
  sent_at: string
  metadata: Record<string, unknown> | null
  waste_events?: WasteEvent | null
}

interface AlertSystemClientProps {
  initialAlerts: AlertRecord[]
  initialActiveEvents: WasteEvent[]
}

export function AlertSystemClient({ initialAlerts, initialActiveEvents }: AlertSystemClientProps) {
  const [alerts, setAlerts] = useState<AlertRecord[]>(initialAlerts)
  const [activeEvents, setActiveEvents] = useState<WasteEvent[]>(initialActiveEvents)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    const source = new EventSource("/api/hardware/stream")

    source.addEventListener("alert_created", (event) => {
      try {
        const data = JSON.parse((event as MessageEvent<string>).data) as AlertRecord
        setAlerts((prev) => [data, ...prev].slice(0, 100))
        void triggerAlarm()
      } catch (error) {
        console.error("Failed to parse alert_created event", error)
      }
    })

    source.addEventListener("alert_updated", (event) => {
      try {
        const data = JSON.parse((event as MessageEvent<string>).data) as AlertRecord
        setAlerts((prev) => {
          const existingIndex = prev.findIndex((item) => item.id === data.id)
          if (existingIndex === -1) {
            return prev
          }
          const next = [...prev]
          next[existingIndex] = data
          return next
        })
      } catch (error) {
        console.error("Failed to parse alert_updated event", error)
      }
    })

    source.addEventListener("event_created", (event) => {
      try {
        const data = JSON.parse((event as MessageEvent<string>).data) as WasteEvent
        handleEventChange(data)
      } catch (error) {
        console.error("Failed to parse event_created event", error)
      }
    })

    source.addEventListener("event_updated", (event) => {
      try {
        const data = JSON.parse((event as MessageEvent<string>).data) as WasteEvent
        handleEventChange(data)
      } catch (error) {
        console.error("Failed to parse event_updated event", error)
      }
    })

    return () => {
      source.close()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleEventChange = (event: WasteEvent) => {
    setActiveEvents((prev) => {
      const withoutExisting = prev.filter((item) => item.id !== event.id)
      if (event.status === "active" && event.event_type === "illegal_dumping") {
        return [event, ...withoutExisting]
      }
      return withoutExisting
    })
  }

  const triggerAlarm = async () => {
    try {
      await fetch("/api/hardware/alarm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "trigger" }),
      })
    } catch (error) {
      console.error("Failed to trigger alarm", error)
    } finally {
      const audio = audioRef.current
      if (audio) {
        void audio.play().catch((err) => {
          console.warn("Alarm audio playback blocked", err)
        })
      }
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <audio ref={audioRef} src="/assets/audio/alarm.m4a" preload="auto" />
      <header className="border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Image
                src="/assets/logo.png"
                alt="Illegal Dumping Control"
                width={48}
                height={48}
                priority
                className="rounded-lg shadow-md"
              />
              <Link href="/">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  返回监控台
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold">警报与语音系统</h1>
                <p className="text-sm text-muted-foreground">实时警报控制和语音警告管理</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="text-primary border-primary/50">
                <Bell className="w-3 h-3 mr-1" />
                {alerts.length} 条警报
              </Badge>
              <Badge variant="destructive" className={activeEvents.length ? "animate-pulse" : ""}>
                <Zap className="w-3 h-3 mr-1" />
                {activeEvents.length} 紧急事件
              </Badge>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-6">
        <div className="space-y-6">
          <EmergencyControls activeEvents={activeEvents} />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <VoiceControls />
            <AlertSettings />
          </div>

          <AlertHistory alerts={alerts} />
        </div>
      </div>
    </div>
  )
}
