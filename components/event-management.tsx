import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { EventsTable } from "@/components/events-table"
import { EventStats } from "@/components/event-stats"
import { ArrowLeft, Search, Filter, Download } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { getSummary } from "@/lib/store/store"

export async function EventManagement() {
  const { events } = getSummary()

  const sortedEvents = [...events].sort((a, b) => (a.detected_at < b.detected_at ? 1 : -1))
  const limitedEvents = sortedEvents.slice(0, 50)

  const eventStats = {
    total: events.length,
    active: events.filter((event) => event.status === "active").length,
    resolved: events.filter((event) => event.status === "resolved").length,
    investigating: events.filter((event) => event.status === "investigating").length,
    illegalDumping: events.filter((event) => event.event_type === "illegal_dumping").length,
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Image
                src="/assets/logo.png"
                alt="Illegal Dumping Control"
                width={48}
                height={48}
                className="rounded-lg shadow-md"
                priority
              />
              <Link href="/">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  返回监控台
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold">事件管理</h1>
                <p className="text-sm text-muted-foreground">查看和管理所有检测事件</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                导出数据
              </Button>
              <Badge variant="outline" className="text-primary border-primary/50">
                {eventStats.total} 总事件
              </Badge>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-6">
        <div className="space-y-6">
          {/* Statistics Cards */}
          <EventStats stats={eventStats} />

          {/* Filters and Search */}
          <Card className="glass">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="w-5 h-5" />
                筛选和搜索
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input placeholder="搜索事件、位置或描述..." className="pl-10" />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Select defaultValue="all">
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="事件类型" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">所有类型</SelectItem>
                      <SelectItem value="illegal_dumping">非法倾倒</SelectItem>
                      <SelectItem value="normal_disposal">正常投放</SelectItem>
                      <SelectItem value="bin_full">垃圾桶满</SelectItem>
                      <SelectItem value="maintenance">设备维护</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select defaultValue="all">
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="状态" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">所有状态</SelectItem>
                      <SelectItem value="active">活跃</SelectItem>
                      <SelectItem value="investigating">调查中</SelectItem>
                      <SelectItem value="resolved">已解决</SelectItem>
                      <SelectItem value="false_positive">误报</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select defaultValue="7d">
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="时间范围" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1d">今天</SelectItem>
                      <SelectItem value="7d">最近7天</SelectItem>
                      <SelectItem value="30d">最近30天</SelectItem>
                      <SelectItem value="90d">最近90天</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Events Table */}
          <EventsTable events={limitedEvents} />
        </div>
      </div>
    </div>
  )
}
