import { useEffect, useState, useMemo, useCallback } from 'react'
import {
  Activity,
  ArrowDown,
  ArrowUp,
  ArrowUpRight,
  Ban,
  CheckCircle2,
  Clock,
  Download,
  Eye,
  FileCode,
  FileSpreadsheet,
  Filter,
  Globe2,
  Laptop,
  Layers,
  Lock,
  Radio,
  RefreshCw,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  Tablet,
  UserCheck,
  Users,
  XCircle,
  Zap,
  ExternalLink,
  Trash2,
} from 'lucide-react'
import { trafficApi, type TrafficStatsResponse, type TrafficEvent } from '@/lib/traffic-api'
import { supabase } from '@/lib/mangahub-db'

type TabType = 'overview' | 'live' | 'geo' | 'auth' | 'security' | 'logs'
type RoleView = 'admin' | 'manager'

export default function TrafficControlPage({
  initialSiteId = 'global',
  onSiteChange,
}: {
  initialSiteId?: string
  onSiteChange?: (siteId: string) => void
} = {}) {
  // Navigation & Role Views
  const [activeTab, setActiveTab] = useState<TabType>('overview')
  const [roleView, setRoleView] = useState<RoleView>('admin')
  const [selectedSiteId, setSelectedSiteId] = useState<string>(initialSiteId)
  const [timeRange, setTimeRange] = useState<string>('24h')

  // Sites list for dropdown
  const [sites, setSites] = useState<Array<{ id: string; name: string; slug: string; subdomain: string }>>([])

  // Traffic Stats & Raw Events
  const [stats, setStats] = useState<TrafficStatsResponse | null>(null)
  const [events, setEvents] = useState<TrafficEvent[]>([])
  const [totalEventsCount, setTotalEventsCount] = useState<number>(0)
  const [loading, setLoading] = useState<boolean>(true)
  const [refreshing, setRefreshing] = useState<boolean>(false)
  const [autoRefresh, setAutoRefresh] = useState<boolean>(true)

  // Filtering for Raw Logs
  const [logPageType, setLogPageType] = useState<string>('all')
  const [logCountry, setLogCountry] = useState<string>('all')
  const [logStatus, setLogStatus] = useState<string>('all')
  const [logSearch, setLogSearch] = useState<string>('')
  const [logLimit] = useState<number>(50)
  const [logOffset, setLogOffset] = useState<number>(0)

  // Quick Action feedback
  const [actionNotice, setActionNotice] = useState<string>('')
  const [manualBlockIpInput, setManualBlockIpInput] = useState<string>('')

  // 1. Fetch available sites for the niche selector
  useEffect(() => {
    supabase
      .from('manga_sites')
      .select('id,name,slug,subdomain')
      .order('name')
      .then(({ data }: { data: any }) => {
        if (data) setSites(data as any)
      })
  }, [])

  // 2. Fetch traffic data
  const loadData = useCallback(async (showSpinner = false) => {
    if (showSpinner) setRefreshing(true)
    try {
      const effectiveSiteId = roleView === 'manager' && selectedSiteId === 'global' && sites[0] ? sites[0].id : selectedSiteId

      const [statsData, eventsData] = await Promise.all([
        trafficApi.getStats({
          site_id: effectiveSiteId,
          time_range: timeRange,
          role: roleView,
        }),
        trafficApi.getEvents({
          site_id: effectiveSiteId,
          time_range: timeRange,
          page_type: logPageType !== 'all' ? logPageType : undefined,
          country: logCountry !== 'all' ? logCountry : undefined,
          status: logStatus !== 'all' ? logStatus : undefined,
          search: logSearch.trim() || undefined,
          limit: logLimit,
          offset: logOffset,
        }),
      ])

      setStats(statsData)
      setEvents(eventsData.events)
      setTotalEventsCount(eventsData.total)
    } catch (err: any) {
      console.warn('Failed to load traffic stats:', err.message)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [roleView, selectedSiteId, timeRange, sites, logPageType, logCountry, logStatus, logSearch, logLimit, logOffset])

  useEffect(() => {
    void loadData(true)
  }, [loadData])

  // 3. Auto-refresh polling every 12 seconds
  useEffect(() => {
    if (!autoRefresh) return
    const timer = setInterval(() => {
      void loadData(false)
    }, 12000)
    return () => clearInterval(timer)
  }, [autoRefresh, loadData])

  const flash = (msg: string) => {
    setActionNotice(msg)
    setTimeout(() => setActionNotice(''), 4000)
  }

  // Handle IP Blocking / Unblocking
  const handleBlockIp = async (ip: string) => {
    if (!confirm(`Voulez-vous bloquer immédiatement l'adresse IP ${ip} de l'ensemble du réseau ?`)) return
    try {
      const res = await trafficApi.blockIp(ip, 'Blocked from Traffic Control UI')
      flash(`✓ ${res.message}`)
      void loadData(false)
    } catch (e: any) {
      flash(`Erreur: ${e.message}`)
    }
  }

  const handleUnblockIp = async (ip: string) => {
    try {
      const res = await trafficApi.unblockIp(ip)
      flash(`✓ ${res.message}`)
      void loadData(false)
    } catch (e: any) {
      flash(`Erreur: ${e.message}`)
    }
  }

  const handleManualBlock = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!manualBlockIpInput.trim()) return
    await handleBlockIp(manualBlockIpInput.trim())
    setManualBlockIpInput('')
  }

  // Clear all real traffic logs
  const handleClearLogs = async () => {
    if (!confirm("Voulez-vous vraiment effacer l'intégralité de l'historique du trafic ? Cette action est irréversible et réinitialisera les statistiques à zéro.")) {
      return
    }
    try {
      setRefreshing(true)
      const res = await trafficApi.clearLogs()
      flash(`✓ ${res.message || 'Historique de trafic effacé avec succès.'}`)
      void loadData(true)
    } catch (err: any) {
      flash(`Erreur: ${err.message}`)
    } finally {
      setRefreshing(false)
    }
  }

  // Max value in timeline for sparkline scaling
  const maxViews = useMemo(() => {
    if (!stats?.timeline || stats.timeline.length === 0) return 1
    return Math.max(...stats.timeline.map(p => p.views), 1)
  }, [stats?.timeline])

  return (
    <section className="space-y-6">
      {/* ── Top Header & Context Control Bar ── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-card border border-border p-5 rounded-2xl shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-primary/10 text-primary">
              <Radio size={18} className="animate-pulse" />
            </span>
            <span className="text-xs uppercase font-extrabold tracking-widest text-primary font-headline">
              System Monitoring
            </span>
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 text-[10px] font-black tracking-wider uppercase">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
              Live Traffic Radar
            </span>
          </div>

          <h2 className="mt-1 text-2xl font-black font-headline text-foreground tracking-tight">
            Traffic Control & Network Operations
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Surveillance en direct des visites, sessions actives, requêtes par pays, audits de connexion et sécurité réseau.
          </p>
        </div>

        {/* Global Controls: Role Switcher + Site Scope + Time Range + Export */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Role-Based Mode Selector */}
          <div className="flex items-center bg-muted/60 p-1 rounded-xl border border-border text-xs font-bold">
            <button
              type="button"
              onClick={() => {
                setRoleView('admin')
                setSelectedSiteId('global')
              }}
              className={`px-3 py-1.5 rounded-lg transition ${
                roleView === 'admin' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              👑 Admin (Réseau Global)
            </button>
            <button
              type="button"
              onClick={() => {
                setRoleView('manager')
                if (selectedSiteId === 'global' && sites[0]) setSelectedSiteId(sites[0].id)
              }}
              className={`px-3 py-1.5 rounded-lg transition ${
                roleView === 'manager' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              👤 Manager (Édition Niche)
            </button>
          </div>

          {/* Site / Niche Selector */}
          <select
            value={selectedSiteId}
            onChange={e => {
              setSelectedSiteId(e.target.value)
              if (onSiteChange) onSiteChange(e.target.value)
            }}
            className="h-9 px-3 rounded-xl border border-input bg-card text-xs font-bold text-foreground outline-none focus:border-primary shadow-sm"
          >
            {roleView === 'admin' && <option value="global">🌐 Réseau Global (Tous les Sites)</option>}
            {sites.map(s => (
              <option key={s.id} value={s.id}>
                📖 {s.name} ({s.subdomain || s.slug})
              </option>
            ))}
          </select>

          {/* Time Range Selector */}
          <select
            value={timeRange}
            onChange={e => setTimeRange(e.target.value)}
            className="h-9 px-3 rounded-xl border border-input bg-card text-xs font-bold text-foreground outline-none focus:border-primary shadow-sm"
          >
            <option value="30m">⚡ 30 Dernières Minutes</option>
            <option value="24h">⏱️ Dernières 24 Heures</option>
            <option value="7d">📅 7 Derniers Jours</option>
            <option value="all">♾️ Tout l'Historique (30J)</option>
          </select>

          {/* Auto Refresh Toggle */}
          <button
            type="button"
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`p-2 rounded-xl border text-xs font-bold transition flex items-center gap-1 ${
              autoRefresh
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500'
                : 'bg-card border-border text-muted-foreground'
            }`}
            title={autoRefresh ? 'Actualisation automatique active (12s)' : 'Actualisation automatique en pause'}
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
          </button>

          {/* Clear Traffic Logs Button */}
          <button
            type="button"
            onClick={handleClearLogs}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-destructive/30 bg-destructive/10 hover:bg-destructive/20 text-destructive text-xs font-bold shadow-sm transition disabled:opacity-50"
            title="Effacer tout l'historique et réinitialiser les compteurs à 0"
          >
            <Trash2 size={13} />
            <span>Effacer Données</span>
          </button>

          {/* Export Dropdown / Buttons */}
          <div className="flex items-center gap-1">
            <a
              href={trafficApi.getExportUrl('csv', selectedSiteId)}
              download
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border bg-card hover:bg-muted text-xs font-bold text-foreground shadow-sm transition"
              title="Exporter les données complètes au format CSV"
            >
              <FileSpreadsheet size={14} className="text-emerald-500" />
              <span>CSV</span>
            </a>
            <a
              href={trafficApi.getExportUrl('json', selectedSiteId)}
              download
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border bg-card hover:bg-muted text-xs font-bold text-foreground shadow-sm transition"
              title="Exporter au format JSON"
            >
              <FileCode size={14} className="text-blue-500" />
              <span>JSON</span>
            </a>
          </div>
        </div>
      </div>

      {actionNotice && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold text-xs flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 size={16} />
          <span>{actionNotice}</span>
        </div>
      )}

      {/* ── Security Alert Spike Banner (If threats detected) ── */}
      {stats && stats.securityThreats.length > 0 && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3 animate-in slide-in-from-top-2">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-500 shrink-0">
              <ShieldAlert size={20} />
            </div>
            <div>
              <p className="font-extrabold text-amber-600 dark:text-amber-400 text-sm">
                ⚠️ {stats.securityThreats.length} Menace(s) de Connexion / Activité Suspecte Détectée(s)
              </p>
              <p className="text-muted-foreground text-xs mt-0.5">
                Plusieurs tentatives de connexion échouées ou pics de requêtes anormaux ont été identifiés.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setActiveTab('security')}
              className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition shadow-sm"
            >
              Inspecter les Menaces & Bloquer
            </button>
          </div>
        </div>
      )}

      {/* ── Metric Cards Grid ── */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
          {/* Live Readers Beacon */}
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-4 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span className="font-bold text-foreground">Lecteurs en Direct</span>
              <span className="flex h-2.5 w-2.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
              </span>
            </div>
            <p className="text-3xl font-black text-emerald-500 font-mono">
              {stats.overview.liveActiveVisitors}
            </p>
            <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5">
              Actifs sur les 10 dernières min
            </p>
          </div>

          {/* Total Pageviews */}
          <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span>Pages Vues</span>
              <Eye size={14} className="text-primary" />
            </div>
            <p className="text-3xl font-black text-foreground font-mono">
              {stats.overview.totalPageviews.toLocaleString()}
            </p>
            <p className="text-[10px] text-muted-foreground font-semibold mt-0.5">
              Impressions totales
            </p>
          </div>

          {/* Unique Visitors */}
          <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span>Visiteurs Uniques</span>
              <Users size={14} className="text-blue-500" />
            </div>
            <p className="text-3xl font-black text-foreground font-mono">
              {stats.overview.uniqueVisitors.toLocaleString()}
            </p>
            <p className="text-[10px] text-muted-foreground font-semibold mt-0.5">
              Adresses IP distinctes
            </p>
          </div>

          {/* Total Sessions */}
          <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span>Sessions de Lecture</span>
              <Layers size={14} className="text-teal-500" />
            </div>
            <p className="text-3xl font-black text-foreground font-mono">
              {stats.overview.totalSessions.toLocaleString()}
            </p>
            <p className="text-[10px] text-muted-foreground font-semibold mt-0.5">
              Durée moy: {stats.overview.avgSessionDuration}
            </p>
          </div>

          {/* Login Success Rate */}
          <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span>Succès Logins</span>
              <UserCheck size={14} className="text-emerald-500" />
            </div>
            <p className="text-3xl font-black text-foreground font-mono">
              {stats.overview.loginSuccessRate}
            </p>
            <p className="text-[10px] text-muted-foreground font-semibold mt-0.5">
              {stats.authAnalytics.failedLogins} échec(s) enregistré(s)
            </p>
          </div>

          {/* Blocked Threats */}
          <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span>IPs Bloquées</span>
              <Ban size={14} className="text-destructive" />
            </div>
            <p className="text-3xl font-black text-foreground font-mono">
              {stats.blockedIpsList.length}
            </p>
            <p className="text-[10px] text-destructive font-semibold mt-0.5">
              Pare-feu actif
            </p>
          </div>
        </div>
      )}

      {/* ── Section Tabs Navigation ── */}
      <div className="flex items-center gap-2 border-b border-border pb-1 overflow-x-auto scrollbar-none">
        <button
          type="button"
          onClick={() => setActiveTab('overview')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
            activeTab === 'overview'
              ? 'bg-primary text-primary-foreground shadow-md'
              : 'bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground'
          }`}
        >
          <Activity size={14} />
          <span>Vue d'Ensemble & Tendances</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('live')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
            activeTab === 'live'
              ? 'bg-primary text-primary-foreground shadow-md'
              : 'bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground'
          }`}
        >
          <Radio size={14} className="text-emerald-400" />
          <span>Sessions en Direct ({stats?.overview.liveActiveVisitors || 0})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('geo')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
            activeTab === 'geo'
              ? 'bg-primary text-primary-foreground shadow-md'
              : 'bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground'
          }`}
        >
          <Globe2 size={14} />
          <span>Géolocalisation & Pays</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('auth')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
            activeTab === 'auth'
              ? 'bg-primary text-primary-foreground shadow-md'
              : 'bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground'
          }`}
        >
          <Lock size={14} />
          <span>Audits de Connexion ({stats?.authAnalytics.totalLogins || 0})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('security')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
            activeTab === 'security'
              ? 'bg-primary text-primary-foreground shadow-md'
              : 'bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground'
          }`}
        >
          <Shield size={14} />
          <span>Sécurité & IPs ({stats?.blockedIpsList.length || 0})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('logs')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
            activeTab === 'logs'
              ? 'bg-primary text-primary-foreground shadow-md'
              : 'bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground'
          }`}
        >
          <FileCode size={14} />
          <span>Journal d'Audit Détaillé ({totalEventsCount})</span>
        </button>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* TAB 1: OVERVIEW & TIMELINE CHARTS                                       */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'overview' && stats && (
        <div className="space-y-6">
          {/* Timeline Visual Chart Container */}
          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-4">
              <div>
                <h3 className="font-headline font-bold text-base text-foreground">
                  Courbe d'Activité & Volume de Trafic
                </h3>
                <p className="text-xs text-muted-foreground">
                  Évolution des pages vues et visiteurs uniques sur la période sélectionnée ({timeRange}).
                </p>
              </div>

              <div className="flex items-center gap-4 text-xs font-bold">
                <span className="flex items-center gap-1.5 text-primary">
                  <span className="h-3 w-3 rounded-full bg-primary" /> Pages Vues
                </span>
                <span className="flex items-center gap-1.5 text-blue-400">
                  <span className="h-3 w-3 rounded-full bg-blue-400" /> Visiteurs Uniques
                </span>
              </div>
            </div>

            {/* Interactive Timeline Bar Graph */}
            <div className="pt-4">
              <div className="h-48 flex items-end gap-2 sm:gap-3 px-2 border-b border-border">
                {stats.timeline.map((point, idx) => {
                  const heightPercent = Math.max(8, Math.round((point.views / maxViews) * 100))
                  const visitorPercent = Math.max(4, Math.round((point.visitors / maxViews) * 100))

                  return (
                    <div key={idx} className="flex-1 flex flex-col items-center gap-1 group relative h-full justify-end">
                      {/* Tooltip on hover */}
                      <div className="absolute -top-14 opacity-0 group-hover:opacity-100 transition pointer-events-none z-30 bg-slate-950 text-white border border-border p-2 rounded-xl text-[11px] shadow-2xl whitespace-nowrap text-center">
                        <p className="font-bold">{point.label}</p>
                        <p className="text-primary font-mono">{point.views} vues · {point.visitors} visiteurs</p>
                      </div>

                      {/* Bar columns */}
                      <div className="w-full flex items-end justify-center gap-0.5 h-full">
                        <div
                          style={{ height: `${heightPercent}%` }}
                          className="w-1/2 bg-primary/80 hover:bg-primary rounded-t-md transition-all duration-300 shadow-sm"
                        />
                        <div
                          style={{ height: `${visitorPercent}%` }}
                          className="w-1/2 bg-blue-500/70 hover:bg-blue-400 rounded-t-md transition-all duration-300 shadow-sm"
                        />
                      </div>

                      <span className="text-[10px] text-muted-foreground font-mono truncate w-full text-center mt-1">
                        {point.label}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Breakdown Grid: Top Pages & Device Distribution */}
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Top Visited Pages & Niche Editions */}
            <div className="lg:col-span-2 bg-card border border-border rounded-2xl p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <h3 className="font-headline font-bold text-base text-foreground">
                  Top Pages & Éditions les Plus Fréquentées
                </h3>
                <span className="text-xs text-muted-foreground font-mono">
                  {stats.topPages.length} pages actives
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-border text-muted-foreground font-bold">
                    <tr>
                      <th className="py-2.5 px-3">Page / URL</th>
                      <th className="py-2.5 px-3">Édition / Site</th>
                      <th className="py-2.5 px-3">Type</th>
                      <th className="py-2.5 px-3 text-right">Vues</th>
                      <th className="py-2.5 px-3 text-right">Uniques</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {stats.topPages.map((page, i) => (
                      <tr key={i} className="hover:bg-muted/30 transition">
                        <td className="py-2.5 px-3 font-mono font-bold text-foreground">
                          <a
                            href={page.url}
                            target="_blank"
                            rel="noreferrer"
                            className="hover:text-primary flex items-center gap-1 truncate max-w-xs"
                          >
                            <span>{page.url}</span>
                            <ExternalLink size={10} className="shrink-0 opacity-60" />
                          </a>
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="px-2 py-0.5 rounded bg-muted font-bold text-[10px]">
                            {page.siteName}
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            page.type === 'chapter_reader'
                              ? 'bg-purple-500/10 text-purple-400'
                              : page.type === 'niche_home'
                              ? 'bg-teal-500/10 text-teal-400'
                              : page.type === 'login'
                              ? 'bg-amber-500/10 text-amber-400'
                              : 'bg-blue-500/10 text-blue-400'
                          }`}>
                            {page.type.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-foreground">
                          {page.views.toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-muted-foreground">
                          {page.uniqueCount.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Devices & Technology breakdown */}
            <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-5">
              <h3 className="font-headline font-bold text-base text-foreground border-b border-border pb-3">
                Appareils & Navigateurs
              </h3>

              {/* Devices Distribution */}
              <div className="space-y-3">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">
                  Types d'Écrans
                </span>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 font-bold">
                      <Smartphone size={14} className="text-primary" /> Mobile
                    </span>
                    <span className="font-mono font-bold">{stats.deviceDistribution.mobile}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      style={{ width: `${stats.deviceDistribution.mobile}%` }}
                      className="h-full bg-primary rounded-full"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 font-bold">
                      <Laptop size={14} className="text-blue-400" /> Desktop
                    </span>
                    <span className="font-mono font-bold">{stats.deviceDistribution.desktop}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      style={{ width: `${stats.deviceDistribution.desktop}%` }}
                      className="h-full bg-blue-400 rounded-full"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 font-bold">
                      <Tablet size={14} className="text-purple-400" /> Tablette
                    </span>
                    <span className="font-mono font-bold">{stats.deviceDistribution.tablet}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      style={{ width: `${stats.deviceDistribution.tablet}%` }}
                      className="h-full bg-purple-400 rounded-full"
                    />
                  </div>
                </div>
              </div>

              {/* Browser Breakdown Chips */}
              <div className="space-y-3 border-t border-border pt-4">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">
                  Navigateurs Détectés
                </span>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(stats.browserDistribution).map(([browser, count]) => (
                    <div key={browser} className="px-3 py-1.5 rounded-xl bg-muted/40 border border-border text-xs flex items-center justify-between gap-2">
                      <span className="font-bold">{browser}</span>
                      <span className="font-mono text-muted-foreground">({count})</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* TAB 2: LIVE REAL-TIME ACTIVE SESSIONS                                   */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'live' && stats && (
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-emerald-500 animate-ping" />
                <h3 className="font-headline font-bold text-base text-foreground">
                  Sessions de Lecture Actives en Direct
                </h3>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Utilisateurs et lecteurs actuellement connectés sur les pages du portail ou les lecteurs de scans.
              </p>
            </div>

            <span className="px-3 py-1 rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 text-xs font-extrabold font-mono">
              ⚡ {stats.overview.liveActiveVisitors} sessions live
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-border text-muted-foreground font-bold">
                <tr>
                  <th className="py-2.5 px-3">Statut</th>
                  <th className="py-2.5 px-3">IP / Session</th>
                  <th className="py-2.5 px-3">Localisation</th>
                  <th className="py-2.5 px-3">Page Actuelle</th>
                  <th className="py-2.5 px-3">Appareil</th>
                  <th className="py-2.5 px-3">Source / Référent</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {stats.liveSessions.map((session, i) => (
                  <tr key={i} className="hover:bg-muted/30 transition">
                    <td className="py-3 px-3">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 text-[10px] font-bold">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live
                      </span>
                    </td>
                    <td className="py-3 px-3 font-mono font-bold text-foreground">
                      <p>{session.ip}</p>
                      <p className="text-[10px] text-muted-foreground font-normal">{session.session_id}</p>
                    </td>
                    <td className="py-3 px-3">
                      <span className="flex items-center gap-1.5 text-xs font-medium">
                        <span>{session.country_flag}</span>
                        <span>{session.city}, {session.country_code}</span>
                      </span>
                    </td>
                    <td className="py-3 px-3 font-mono">
                      <p className="font-bold text-foreground truncate max-w-xs">{session.page_url}</p>
                      <p className="text-[10px] text-muted-foreground">{session.site_name || 'Portal'}</p>
                    </td>
                    <td className="py-3 px-3 text-muted-foreground">
                      {session.browser} · {session.device_type}
                    </td>
                    <td className="py-3 px-3 text-muted-foreground truncate max-w-[150px]" title={session.referrer}>
                      {session.referrer}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleBlockIp(session.ip)}
                        className="px-2.5 py-1 rounded-lg border border-destructive/30 text-destructive hover:bg-destructive/10 text-xs font-bold transition"
                        title="Bloquer cette adresse IP"
                      >
                        Bloquer IP
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* TAB 3: GEOLOCATION & COUNTRIES BREAKDOWN                                */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'geo' && stats && (
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-border pb-4">
            <div>
              <h3 className="font-headline font-bold text-base text-foreground">
                Distribution Géographique du Trafic
              </h3>
              <p className="text-xs text-muted-foreground">
                Provenance internationale des lecteurs et volume de visites par pays.
              </p>
            </div>
            <span className="text-xs font-mono font-bold text-primary">
              {stats.topCountries.length} pays enregistrés
            </span>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {stats.topCountries.map((c, idx) => (
              <div
                key={c.code}
                className="p-4 rounded-xl border border-border bg-muted/20 flex items-center justify-between gap-4 hover:border-border/90 transition"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-2xl">{c.flag}</span>
                  <div className="min-w-0">
                    <p className="font-bold text-foreground text-sm truncate">{c.name}</p>
                    <p className="text-[10px] text-muted-foreground font-mono">Code: {c.code}</p>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <p className="font-mono font-black text-foreground text-sm">
                    {c.count.toLocaleString()} <span className="text-xs font-normal text-muted-foreground">visites</span>
                  </p>
                  <div className="flex items-center justify-end gap-2 mt-1">
                    <div className="w-20 h-1.5 rounded-full bg-muted overflow-hidden">
                      <div style={{ width: `${c.percentage}%` }} className="h-full bg-primary rounded-full" />
                    </div>
                    <span className="text-[11px] font-bold font-mono text-primary">{c.percentage}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* TAB 4: AUTH & LOGIN ACTIVITY AUDITS                                     */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'auth' && stats && (
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-border pb-4">
            <div>
              <h3 className="font-headline font-bold text-base text-foreground">
                Historique des Tentatives de Connexion & Authentification
              </h3>
              <p className="text-xs text-muted-foreground">
                Surveillance des connexions d'administrateurs et détection des accès non autorisés.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 text-xs font-bold">
                ✓ {stats.authAnalytics.successfulLogins} Succès
              </span>
              <span className="px-3 py-1 rounded-xl bg-destructive/10 text-destructive border border-destructive/20 text-xs font-bold">
                ✕ {stats.authAnalytics.failedLogins} Échecs
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-border text-muted-foreground font-bold">
                <tr>
                  <th className="py-2.5 px-3">Date & Heure</th>
                  <th className="py-2.5 px-3">Utilisateur / Email</th>
                  <th className="py-2.5 px-3">Rôle</th>
                  <th className="py-2.5 px-3">Adresse IP</th>
                  <th className="py-2.5 px-3">Localisation</th>
                  <th className="py-2.5 px-3">Statut</th>
                  <th className="py-2.5 px-3">Détails</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {stats.authAnalytics.recentLogins.map((evt, idx) => (
                  <tr key={idx} className="hover:bg-muted/30 transition">
                    <td className="py-3 px-3 font-mono text-muted-foreground">
                      {new Date(evt.timestamp).toLocaleString()}
                    </td>
                    <td className="py-3 px-3 font-bold text-foreground">
                      {evt.user_name || 'Visiteur anonyme'}
                    </td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-muted">
                        {evt.user_role}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-mono font-bold text-foreground">
                      {evt.ip}
                    </td>
                    <td className="py-3 px-3">
                      <span className="flex items-center gap-1">
                        <span>{evt.country_flag}</span>
                        <span>{evt.city}, {evt.country_code}</span>
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        evt.status === 'success'
                          ? 'bg-emerald-500/10 text-emerald-500'
                          : evt.status === 'blocked'
                          ? 'bg-destructive/10 text-destructive'
                          : 'bg-amber-500/10 text-amber-500'
                      }`}>
                        {evt.status === 'success' ? 'Connexion Réussie' : evt.status === 'blocked' ? 'IP Bloquée' : 'Échec Connexion'}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-muted-foreground text-[11px]">
                      {evt.failure_reason || 'Authentification validée'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* TAB 5: SECURITY & BLOCKED IPS                                           */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'security' && stats && (
        <div className="space-y-6">
          {/* Manual IP Block Form */}
          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-4">
            <h3 className="font-headline font-bold text-base text-foreground">
              🛡️ Bloquer Manuellement une Adresse IP
            </h3>
            <p className="text-xs text-muted-foreground">
              L'adresse IP bloquée sera immédiatement rejetée (Code 403 Forbidden) sur le portail et l'ensemble des sites de lecture.
            </p>

            <form onSubmit={handleManualBlock} className="flex flex-col sm:flex-row gap-3 max-w-xl">
              <input
                type="text"
                required
                value={manualBlockIpInput}
                onChange={e => setManualBlockIpInput(e.target.value)}
                placeholder="Ex: 192.168.1.100 ou 185.220.101.5"
                className="flex-1 h-10 px-3 rounded-xl border border-input bg-muted/20 font-mono text-xs text-foreground outline-none focus:border-primary"
              />
              <button
                type="submit"
                className="h-10 px-5 rounded-xl bg-destructive hover:opacity-90 text-destructive-foreground font-bold text-xs shadow-md transition shrink-0"
              >
                Bloquer cette IP
              </button>
            </form>
          </div>

          {/* List of Blocked IPs */}
          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-4">
            <h3 className="font-headline font-bold text-base text-foreground">
              Liste des Adresses IP Bloquées ({stats.blockedIpsList.length})
            </h3>

            {stats.blockedIpsList.length === 0 ? (
              <p className="py-8 text-center text-xs text-muted-foreground">
                Aucune adresse IP bloquée pour le moment.
              </p>
            ) : (
              <div className="divide-y divide-border">
                {stats.blockedIpsList.map(ip => (
                  <div key={ip} className="py-3 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <Ban size={16} className="text-destructive shrink-0" />
                      <div>
                        <p className="font-mono font-bold text-foreground text-sm">{ip}</p>
                        <p className="text-[10px] text-muted-foreground">Règle de blocage pare-feu active</p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleUnblockIp(ip)}
                      className="px-3 py-1.5 rounded-lg border border-border bg-card hover:bg-muted text-xs font-bold transition text-emerald-500"
                    >
                      Débloquer
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* TAB 6: RAW AUDIT LOG TABLE & DRILL-DOWN FILTERS                         */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'logs' && (
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-border pb-4">
            <div>
              <h3 className="font-headline font-bold text-base text-foreground">
                Journal d'Audit Détaillé des Requêtes
              </h3>
              <p className="text-xs text-muted-foreground">
                Historique complet des requêtes, statuts, géolocalisations et sessions.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <a
                href={trafficApi.getExportUrl('csv', selectedSiteId)}
                download
                className="px-3 py-1.5 rounded-xl border border-border bg-card hover:bg-muted text-xs font-bold text-foreground flex items-center gap-1.5 shadow-sm transition"
              >
                <Download size={13} />
                <span>Télécharger Rapport</span>
              </a>
            </div>
          </div>

          {/* Filtering Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="relative sm:col-span-2">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <input
                type="search"
                value={logSearch}
                onChange={e => setLogSearch(e.target.value)}
                placeholder="Rechercher par IP, URL, Utilisateur ou Ville..."
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-input bg-muted/20 text-xs text-foreground outline-none focus:border-primary shadow-sm"
              />
            </div>

            <select
              value={logPageType}
              onChange={e => setLogPageType(e.target.value)}
              className="h-9 px-3 rounded-xl border border-input bg-card text-xs font-bold text-foreground outline-none focus:border-primary shadow-sm"
            >
              <option value="all">Tous les types de page</option>
              <option value="portal_home">Portail Accueil</option>
              <option value="niche_home">Éditions Niche</option>
              <option value="chapter_reader">Lecteur de Chapitres</option>
              <option value="login">Connexions / Auth</option>
              <option value="admin">Administration</option>
            </select>

            <select
              value={logStatus}
              onChange={e => setLogStatus(e.target.value)}
              className="h-9 px-3 rounded-xl border border-input bg-card text-xs font-bold text-foreground outline-none focus:border-primary shadow-sm"
            >
              <option value="all">Tous les statuts</option>
              <option value="success">Succès (200 OK)</option>
              <option value="failed">Échecs / Erreurs</option>
              <option value="blocked">Bloqués (403)</option>
            </select>
          </div>

          {/* Table of Events */}
          <div className="overflow-x-auto pt-2">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-border text-muted-foreground font-bold">
                <tr>
                  <th className="py-2.5 px-3">Date & Heure</th>
                  <th className="py-2.5 px-3">IP Visiteur</th>
                  <th className="py-2.5 px-3">Pays</th>
                  <th className="py-2.5 px-3">Page / URL</th>
                  <th className="py-2.5 px-3">Appareil</th>
                  <th className="py-2.5 px-3">Statut</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {events.map(evt => (
                  <tr key={evt.id} className="hover:bg-muted/30 transition">
                    <td className="py-2.5 px-3 font-mono text-muted-foreground">
                      {new Date(evt.timestamp).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 font-mono font-bold text-foreground">
                      {evt.ip}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="flex items-center gap-1.5">
                        <span>{evt.country_flag}</span>
                        <span>{evt.country_code}</span>
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-mono">
                      <span className="font-bold text-foreground">{evt.page_url}</span>
                    </td>
                    <td className="py-2.5 px-3 text-muted-foreground">
                      {evt.browser} · {evt.device_type}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        evt.status === 'success'
                          ? 'bg-emerald-500/10 text-emerald-500'
                          : evt.status === 'blocked'
                          ? 'bg-destructive/10 text-destructive'
                          : 'bg-amber-500/10 text-amber-500'
                      }`}>
                        {evt.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleBlockIp(evt.ip)}
                        className="px-2 py-0.5 rounded border border-destructive/30 text-destructive hover:bg-destructive/10 text-[10px] font-bold"
                      >
                        Bloquer
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  )
}
