"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { AlertTriangle, Siren, Lightbulb, Volume2, Phone, Shield } from "lucide-react"

interface WasteEvent {
  id: string
  location_name: string
  event_type: string
  confidence_score: number
  detected_at: string
}

interface EmergencyControlsProps {
  activeEvents: WasteEvent[]
}

export function EmergencyControls({ activeEvents }: EmergencyControlsProps) {
  const [emergencyMode, setEmergencyMode] = useState(false)
  const [isTriggering, setIsTriggering] = useState(false)

  const triggerEmergencyAlert = async (type: string, locationName?: string) => {
    setIsTriggering(true)
    console.log("[v0] Triggering emergency alert:", type, locationName || "all locations")

    try {
      await fetch("/api/hardware/alarm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "trigger" }),
      })
    } catch (error) {
      console.error("Failed to trigger alarm", error)
    } finally {
      void new Audio("/assets/audio/alarm.m4a").play().catch((err) => {
        console.warn("Alarm audio playback blocked", err)
      })
      setTimeout(() => setIsTriggering(false), 1500)
    }
  }

  const activateEmergencyMode = () => {
    setEmergencyMode(true)
    console.log("[v0] Emergency mode activated - all systems on high alert")
    triggerEmergencyAlert("full_alert")
  }

  const deactivateEmergencyMode = () => {
    setEmergencyMode(false)
    console.log("[v0] Emergency mode deactivated")
  }

  return (
    <Card className={`glass ${emergencyMode ? "border-red-500 bg-red-500/5" : ""}`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            紧急控制中心
          </CardTitle>
          <div className="flex items-center gap-2">
            {emergencyMode && (
              <Badge variant="destructive" className="animate-pulse">
                <Siren className="w-3 h-3 mr-1" />
                紧急模式
              </Badge>
            )}
            <Badge variant={activeEvents.length > 0 ? "destructive" : "outline"}>{activeEvents.length} 紧急事件</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Emergency Mode Toggle */}
        <div className="flex items-center justify-between p-4 rounded-lg border-2 border-dashed border-red-500/50 bg-red-500/5">
          <div>
            <h4 className="font-medium text-red-400">紧急模式</h4>
            <p className="text-sm text-muted-foreground">激活所有警报系统，最高优先级响应</p>
          </div>
          <Button
            variant={emergencyMode ? "destructive" : "outline"}
            onClick={emergencyMode ? deactivateEmergencyMode : activateEmergencyMode}
            disabled={isTriggering}
          >
            {emergencyMode ? "停用" : "激活"}
          </Button>
        </div>

        {/* Quick Action Buttons */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Button
            variant="outline"
            className="h-20 flex-col gap-2 bg-transparent"
            onClick={() => triggerEmergencyAlert("voice_all")}
            disabled={isTriggering}
          >
            <Volume2 className="w-6 h-6" />
            <span className="text-xs">全局语音</span>
          </Button>
          <Button
            variant="outline"
            className="h-20 flex-col gap-2 bg-transparent"
            onClick={() => triggerEmergencyAlert("light_all")}
            disabled={isTriggering}
          >
            <Lightbulb className="w-6 h-6" />
            <span className="text-xs">全局闪光</span>
          </Button>
          <Button
            variant="outline"
            className="h-20 flex-col gap-2 bg-transparent"
            onClick={() => triggerEmergencyAlert("siren")}
            disabled={isTriggering}
          >
            <Siren className="w-6 h-6" />
            <span className="text-xs">警报声</span>
          </Button>
          <Button
            variant="outline"
            className="h-20 flex-col gap-2 bg-transparent"
            onClick={() => triggerEmergencyAlert("call_security")}
            disabled={isTriggering}
          >
            <Phone className="w-6 h-6" />
            <span className="text-xs">呼叫保安</span>
          </Button>
        </div>

        {/* Active Events */}
        {activeEvents.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400" />
              当前紧急事件
            </h4>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {activeEvents.map((event) => (
                <div
                  key={event.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-red-500/5 border-red-500/20"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-red-400" />
                      <span className="font-medium text-sm">{event.location_name}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      置信度: {(event.confidence_score * 100).toFixed(0)}% •
                      {new Date(event.detected_at).toLocaleTimeString("zh-CN")}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => triggerEmergencyAlert("voice", event.location_name)}
                      disabled={isTriggering}
                    >
                      <Volume2 className="w-3 h-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => triggerEmergencyAlert("light", event.location_name)}
                      disabled={isTriggering}
                    >
                      <Lightbulb className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Status Indicator */}
        {isTriggering && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/10 border border-primary/20">
            <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
            <span className="text-sm text-primary">正在执行紧急响应...</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
