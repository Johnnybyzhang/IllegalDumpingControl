import type { Dictionary } from "@/lib/i18n/types"

const dictionary: Dictionary = {
  metadata: {
    title: "AI智能垃圾监管系统",
    description: "AI 驱动的垃圾管理和监测系统",
  },
  common: {
    languageName: "简体中文",
  },
  navigation: {
    dashboard: "智慧总览",
    alerts: "告警中心",
    analytics: "数据分析",
    devices: "设备管理",
    events: "事件记录",
    rules: "规则配置",
    login: "登录",
  },
  auth: {
    login: "登录",
    logout: "退出登录",
  },
  clientSelector: {
    heading: "请选择体验模式",
    prompt: "根据角色选择最适合的系统界面。",
    government: "政府部门",
    community: "社区运营",
  },
}

export default dictionary
