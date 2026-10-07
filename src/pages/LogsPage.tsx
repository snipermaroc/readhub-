import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowLeft,
  Check,
  FileText,
  Filter,
  Loader2,
  RefreshCw,
  Search,
  ShieldAlert,
  Terminal,
  Trash2,
} from 'lucide-react'
import { projects, type LogEntry } from '@/lib/api'
import { LanguageToggle } from '@/components/LanguageToggle'
import { ThemeToggle } from '@/components/ThemeToggle'

export default function LogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [filter, setFilter] = useState<'ALL' | 'ERROR' | 'WARN' | 'INFO'>('ALL')
  const [search, setSearch] = useState<string>('')
  const [clearing, setClearing] = useState<boolean>(false)

  const fetchLogs = () => {
    setLoading(true)
    projects
      .getLogs()
      .then(setLogs)
      .catch(() => setLogs([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchLogs()
  }, [])

  const handleClearCache = async () => {
    if (!window.confirm('Are you sure you want to clear system cache and log history?')) return
    setClearing(true)
    try {
      await projects.clearCache()
      fetchLogs()
    } catch (e: any) {
      alert(e.message || 'Failed to clear cache')
    } finally {
      setClearing(false)
    }
  }

  const filteredLogs = logs.filter((log) => {
    if (filter !== 'ALL' && log.level !== filter) return false
    if (search.trim()) {
      const q = search.toLowerCase()
      return (
        log.message.toLowerCase().includes(q) ||
        (log.filename && log.filename.toLowerCase().includes(q))
      )
    }
    return true
  })

  return (
    <div className="min-h-screen bg-background text-foreground pb-20">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-border/80 bg-background/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Link
              to="/admin"
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground transition shadow-sm"
              title="Return to Admin"
            >
              <ArrowLeft size={18} />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold tracking-tight text-foreground font-headline">READHUB</span>
                <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-bold text-primary border border-primary/20">
                  SYSTEM LOGS & AUDIT
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Structured execution logs and chapter import events
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <LanguageToggle />
            <button
              type="button"
              onClick={handleClearCache}
              disabled={clearing}
              className="flex items-center gap-1.5 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-1.5 text-xs font-semibold text-destructive hover:bg-destructive/20 transition"
            >
              {clearing ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
              Clear Cache
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="mx-auto max-w-6xl px-4 sm:px-6 pt-8 space-y-6">
        {/* Banner */}
        <div className="rounded-2xl border border-border bg-card p-6 md:p-8 shadow-sm">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3 text-primary">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 border border-primary/20">
                <Terminal size={22} />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-extrabold font-headline tracking-tight text-foreground">
                  📋 Application Audit Logs
                </h1>
                <p className="text-xs text-muted-foreground mt-1">
                  Real-time structured logging output from <code>import-errors.log</code> and system execution.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={fetchLogs}
              disabled={loading}
              className="flex items-center gap-1.5 rounded-xl border border-border bg-card px-4 py-2 text-xs font-bold text-foreground hover:border-primary transition shadow-sm"
            >
              {loading ? <Loader2 size={14} className="animate-spin text-primary" /> : <RefreshCw size={14} />}
              Refresh Logs
            </button>
          </div>
        </div>

        {/* Filters and Search Bar */}
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm flex flex-wrap items-center justify-between gap-4">
          {/* Level Filter Buttons */}
          <div className="flex items-center gap-1.5 text-xs font-bold">
            {(['ALL', 'ERROR', 'WARN', 'INFO'] as const).map((lvl) => (
              <button
                key={lvl}
                type="button"
                onClick={() => setFilter(lvl)}
                className={`px-3 py-1.5 rounded-lg border transition ${
                  filter === lvl
                    ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                    : 'bg-card text-muted-foreground border-border hover:text-foreground'
                }`}
              >
                {lvl}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-64">
            <Search size={14} className="absolute left-3 top-2.5 text-muted-foreground pointer-events-none" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search log messages..."
              className="w-full rounded-xl border border-input bg-card pl-8 pr-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none"
            />
          </div>
        </div>

        {/* Logs Table */}
        <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
          {loading ? (
            <div className="text-center py-20">
              <Loader2 size={24} className="animate-spin text-primary mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">Loading log entries...</p>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="text-center py-20 text-xs text-muted-foreground space-y-1">
              <p className="font-bold text-foreground">No log entries match your filter.</p>
              <p>Try switching level filters or clearing the search box.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left font-mono text-xs border-collapse">
                <thead>
                  <tr className="border-b border-border bg-muted/40 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                    <th className="px-4 py-3">Timestamp</th>
                    <th className="px-4 py-3">Level</th>
                    <th className="px-4 py-3">Message</th>
                    <th className="px-4 py-3">Source File</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredLogs.map((log, idx) => (
                    <tr key={idx} className="hover:bg-muted/30 transition">
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap text-[11px]">
                        {log.timestamp ? new Date(log.timestamp).toLocaleString() : 'N/A'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {log.level === 'ERROR' && (
                          <span className="rounded-md bg-destructive/10 text-destructive border border-destructive/20 px-2 py-0.5 text-[10px] font-bold">
                            ERROR
                          </span>
                        )}
                        {log.level === 'WARN' && (
                          <span className="rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 px-2 py-0.5 text-[10px] font-bold">
                            WARN
                          </span>
                        )}
                        {log.level === 'INFO' && (
                          <span className="rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 px-2 py-0.5 text-[10px] font-bold">
                            INFO
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-foreground font-semibold leading-relaxed">
                        {log.message}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-[11px] truncate max-w-xs">
                        {log.filename || 'system'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
