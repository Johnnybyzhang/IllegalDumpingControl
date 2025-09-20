"use client"

import { AuthGuard } from "@/components/auth-guard"
import { RuleConfigurationPanel } from "@/components/rule-configuration-panel"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Shield, Settings, ArrowLeft } from "lucide-react"
import Link from "next/link"

export default function RulesPage() {
  return (
    <AuthGuard>
      <div className="min-h-screen bg-background text-foreground">
        {/* Header */}
        <header className="border-b border-border bg-card/50 backdrop-blur-sm">
          <div className="container mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    返回主页
                  </Link>
                </Button>
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/20 neon-glow">
                    <Settings className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold neon-text">规则配置管理</h1>
                    <p className="text-sm text-muted-foreground">智能监控规则 · 时间窗口 · 阈值设置</p>
                  </div>
                </div>
              </div>
              <Badge variant="outline" className="text-primary border-primary/50">
                <Shield className="w-3 h-3 mr-1" />
                管理员模式
              </Badge>
            </div>
          </div>
        </header>

        <div className="container mx-auto px-6 py-6">
          <RuleConfigurationPanel />
        </div>
      </div>
    </AuthGuard>
  )
}
