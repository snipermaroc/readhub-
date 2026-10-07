import { getAuthHeader } from '@/lib/postgres'

export interface TrafficOverview {
  totalPageviews: number
  uniqueVisitors: number
  totalSessions: number
  liveActiveVisitors: number
  bounceRate: string
  avgSessionDuration: string
  loginSuccessRate: string
}

export interface PageStat {
  url: string
  type: string
  siteName: string
  views: number
  uniqueCount: number
}

export interface CountryStat {
  code: string
  name: string
  flag: string
  count: number
  percentage: number
}

export interface DeviceDistribution {
  desktop: number
  mobile: number
  tablet: number
}

export interface SecurityThreat {
  ip: string
  type: string
  failedAttempts: number
  isBlocked: boolean
  lastAttempt: string
  country: string
  flag: string
}

export interface TimelinePoint {
  label: string
  timestamp: string
  views: number
  visitors: number
  logins: number
}

export interface TrafficEvent {
  id: string
  page_url: string
  page_type: string
  site_id: string | null
  site_name: string | null
  manga_slug: string | null
  ip: string
  country_code: string
  country_name: string
  country_flag: string
  city: string
  browser: string
  device_type: string
  referrer: string
  session_id: string
  user_id: string | null
  user_name: string | null
  user_role: string
  status: 'success' | 'failed' | 'blocked'
  failure_reason?: string | null
  is_live?: boolean
  timestamp: string
}

export interface TrafficStatsResponse {
  overview: TrafficOverview
  topPages: PageStat[]
  topCountries: CountryStat[]
  deviceDistribution: DeviceDistribution
  browserDistribution: Record<string, number>
  authAnalytics: {
    totalLogins: number
    successfulLogins: number
    failedLogins: number
    blockedAttempts: number
    recentLogins: TrafficEvent[]
  }
  securityThreats: SecurityThreat[]
  timeline: TimelinePoint[]
  liveSessions: TrafficEvent[]
  blockedIpsList: string[]
}

export interface EventsQueryResponse {
  total: number
  events: TrafficEvent[]
  limit: number
  offset: number
}

export const trafficApi = {
  async getStats(params: { site_id?: string; time_range?: string; role?: string } = {}): Promise<TrafficStatsResponse> {
    const query = new URLSearchParams()
    if (params.site_id) query.append('site_id', params.site_id)
    if (params.time_range) query.append('time_range', params.time_range)
    if (params.role) query.append('role', params.role)

    const res = await fetch(`/api/traffic/stats?${query.toString()}`, {
      headers: getAuthHeader(),
      credentials: 'include',
    })
    if (!res.ok) throw new Error('Failed to fetch traffic statistics')
    return res.json()
  },

  async getEvents(params: {
    site_id?: string
    page_type?: string
    time_range?: string
    country?: string
    ip?: string
    status?: string
    search?: string
    limit?: number
    offset?: number
  } = {}): Promise<EventsQueryResponse> {
    const query = new URLSearchParams()
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') query.append(k, String(v))
    })

    const res = await fetch(`/api/traffic/events?${query.toString()}`, {
      headers: getAuthHeader(),
      credentials: 'include',
    })
    if (!res.ok) throw new Error('Failed to fetch traffic events')
    return res.json()
  },

  async logEvent(data: Partial<TrafficEvent>): Promise<{ success: boolean; eventId?: string }> {
    try {
      const res = await fetch('/api/traffic/log', {
        method: 'POST',
        headers: getAuthHeader(),
        credentials: 'include',
        body: JSON.stringify(data),
      })
      return res.json()
    } catch {
      return { success: false }
    }
  },

  async blockIp(ip: string, reason?: string): Promise<{ success: boolean; message: string; blockedIps: string[] }> {
    const res = await fetch('/api/traffic/block-ip', {
      method: 'POST',
      headers: getAuthHeader(),
      credentials: 'include',
      body: JSON.stringify({ ip, reason }),
    })
    if (!res.ok) throw new Error('Failed to block IP')
    return res.json()
  },

  async unblockIp(ip: string): Promise<{ success: boolean; message: string; blockedIps: string[] }> {
    const res = await fetch('/api/traffic/unblock-ip', {
      method: 'POST',
      headers: getAuthHeader(),
      credentials: 'include',
      body: JSON.stringify({ ip }),
    })
    if (!res.ok) throw new Error('Failed to unblock IP')
    return res.json()
  },

  async clearLogs(): Promise<{ success: boolean; message: string }> {
    const res = await fetch('/api/traffic/clear', {
      method: 'POST',
      headers: getAuthHeader(),
      credentials: 'include',
    })
    if (!res.ok) throw new Error('Failed to clear traffic logs')
    return res.json()
  },

  getExportUrl(format: 'csv' | 'json', site_id?: string): string {
    const query = new URLSearchParams()
    query.append('format', format)
    if (site_id && site_id !== 'all' && site_id !== 'global') {
      query.append('site_id', site_id)
    }
    return `/api/traffic/export?${query.toString()}`
  },
}
