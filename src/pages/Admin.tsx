import { useCallback, useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { Activity, ArrowUpRight, BookOpen, Bot, DownloadCloud, FileText, FolderDown, Globe2, LayoutDashboard, LogOut, Megaphone, Plus, Search, Settings2, Shield, Store, Users, Gauge, Menu, X, Terminal, Star, Radio, DollarSign } from "lucide-react"
import ExamplePrompt from "@/pages/ExamplePrompt"
import DriveToCSV from "@/pages/DriveToCSV"
import LogsPage from "@/pages/LogsPage"
import { useAuth } from "@/contexts/AuthContext"
import { supabase } from "@/lib/mangahub-db"
import SiteManager from "@/pages/admin/SiteManager"
import ContentManager from "@/pages/admin/ContentManager"
import MangaImporter from "@/pages/admin/MangaImporter"
import SettingsManager, { MonitoringPanel } from "@/pages/admin/SettingsManager"
import PortalManager from "@/pages/admin/PortalManager"
import TrafficControlPage from "@/pages/admin/TrafficControlPage"
import InvoicesManager from "@/pages/admin/InvoicesManager"
import { useTranslation } from 'react-i18next'
import { LanguageToggle } from "../components/LanguageToggle"
import { ThemeToggle } from "../components/ThemeToggle"

type Site = {
  id: string
  name: string
  subdomain: string
  description: string
  status: string
  language: string
  logo_url: string | null
  created_at: string
}

interface NavItem {
  id: string
  label: string
  icon: any
  group: 'main' | 'marketing' | 'system'
}

const navItems: NavItem[] = [
  { id: "overview", label: "Vue d'ensemble", icon: LayoutDashboard, group: 'main' },
  { id: "traffic", label: "Traffic Control", icon: Radio, group: 'main' },
  { id: "portal", label: "Portail", icon: BookOpen, group: 'main' },
  { id: "sites", label: "Sites manga", icon: Globe2, group: 'main' },
  { id: "content", label: "Contenu", icon: FileText, group: 'main' },
  { id: "importer", label: "Manga Importer", icon: DownloadCloud, group: 'main' },
  { id: "ai-prompt", label: "🤖 AI Prompt", icon: Bot, group: 'main' },
  { id: "drive-to-csv", label: "📂 Drive → CSV", icon: FolderDown, group: 'main' },
  { id: "analytics", label: "Analytique", icon: Activity, group: 'marketing' },
  { id: "invoices", label: "Facturation", icon: DollarSign, group: 'marketing' },
  { id: "seo", label: "SEO", icon: Search, group: 'marketing' },
  { id: "ads", label: "Publicités", icon: Megaphone, group: 'marketing' },
  { id: "merch", label: "Boutique", icon: Store, group: 'marketing' },
  { id: "monitoring", label: "Surveillance", icon: Gauge, group: 'system' },
  { id: "logs", label: "📋 Audit Logs", icon: Terminal, group: 'system' },
  { id: "system", label: "Système", icon: Settings2, group: 'system' },
]

export default function Admin({ initialSection = "overview" }: { initialSection?: string } = {}) {
  const { t } = useTranslation()
  const { user, signOut } = useAuth()
  const [section, setSection] = useState(initialSection)
  const [selectedSiteId, setSelectedSiteId] = useState("global")
  const [sites, setSites] = useState<Site[]>([])
  const [counts, setCounts] = useState({ manga: 0, chapters: 0, failed: 0 })
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const refresh = useCallback(async () => {
    setLoading(true)
    const [siteRows, mangaRows, chapterRows, jobRows] = await Promise.all([
      supabase.from("manga_sites").select("id,name,subdomain,description,status,language,logo_url,created_at").order("created_at", { ascending: false }).limit(100),
      supabase.from("manga").select("id", { count: "exact", head: true }),
      supabase.from("chapters").select("id", { count: "exact", head: true }),
      supabase.from("import_jobs").select("id", { count: "exact", head: true }).eq("status", "failed"),
    ])
    setSites((siteRows.data ?? []) as Site[])
    setCounts({ manga: mangaRows.count ?? 0, chapters: chapterRows.count ?? 0, failed: jobRows.count ?? 0 })
    setLoading(false)
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const active = sites.filter(site => site.status === "active").length
  const draft = sites.filter(site => site.status === "draft").length
  const archived = sites.filter(site => site.status === "archived").length
  const currentNav = navItems.find(item => item.id === section)
  const title = currentNav?.label ?? "READHUB"

  let panel
  if (section === "overview") panel = <Overview sites={sites} active={active} draft={draft} archived={archived} counts={counts} loading={loading} open={(sec) => { setSection(sec); setSidebarOpen(false); }} />
  else if (section === "traffic") panel = <TrafficControlPage initialSiteId={selectedSiteId} onSiteChange={(id) => setSelectedSiteId(id)} />
  else if (section === "invoices") panel = <InvoicesManager initialSiteId={selectedSiteId} onSiteChange={(id) => setSelectedSiteId(id)} />
  else if (section === "portal") panel = <PortalManager />
  else if (section === "sites") panel = <SiteManager onManageSite={(siteId) => { setSelectedSiteId(siteId); setSection("analytics"); setSidebarOpen(false); }} />
  else if (section === "content") panel = <ContentManager />
  else if (section === "importer") panel = <MangaImporter />
  else if (section === "ai-prompt") panel = <ExamplePrompt />
  else if (section === "drive-to-csv") panel = <DriveToCSV />
  else if (section === "logs") panel = <LogsPage />
  else if (section === "monitoring") panel = <MonitoringPanel initialSiteId={selectedSiteId} onSiteIdChange={(id) => setSelectedSiteId(id)} />
  else panel = <SettingsManager section={section} initialSiteId={selectedSiteId} onSiteIdChange={(id) => setSelectedSiteId(id)} />

  const selectNav = (id: string) => {
    setSection(id)
    setSidebarOpen(false)
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex">
      {/* ── Mobile Sidebar Overlay Backdrop ── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Left Sidebar Menu (Permanent on Desktop, Drawer on Mobile) ── */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-card border-r border-border flex flex-col justify-between transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:h-screen lg:z-auto ${
          sidebarOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"
        }`}
      >
        {/* Sidebar Header */}
        <div>
          <div className="flex h-16 items-center justify-between border-b border-border px-5">
            <Link to="/" className="flex items-center gap-3">
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary text-primary-foreground font-extrabold shadow-sm">
                <BookOpen size={18} />
              </span>
              <div>
                <b className="block text-sm tracking-wide font-headline">{t("READHUB")}</b>
                <small className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{t("Control room")}</small>
              </div>
            </Link>
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-1.5 text-muted-foreground hover:text-foreground rounded-md lg:hidden"
              aria-label="Close sidebar"
            >
              <X size={18} />
            </button>
          </div>

          {/* Sidebar Navigation Items */}
          <nav className="p-3 space-y-6 overflow-y-auto max-h-[calc(100vh-210px)]">
            {/* Main Section */}
            <div>
              <p className="px-3 mb-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
                {t("Gestion")}
              </p>
              <div className="space-y-1">
                {navItems.filter(i => i.group === 'main').map(item => {
                  const Icon = item.icon
                  const isActive = section === item.id
                  return (
                    <button
                      key={item.id}
                      onClick={() => selectNav(item.id)}
                      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
                        isActive
                          ? "bg-primary text-primary-foreground font-semibold shadow-sm"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      }`}
                    >
                      <Icon size={16} />
                      <span>{t(item.label)}</span>
                      {item.id === "sites" && (
                        <span className={`ml-auto text-xs px-1.5 py-0.5 rounded-full ${isActive ? "bg-primary-foreground/20 text-white" : "bg-muted text-muted-foreground"}`}>
                          {sites.length}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Marketing & Monetization */}
            <div>
              <p className="px-3 mb-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
                {t("Audience & Monétisation")}
              </p>
              <div className="space-y-1">
                {navItems.filter(i => i.group === 'marketing').map(item => {
                  const Icon = item.icon
                  const isActive = section === item.id
                  return (
                    <button
                      key={item.id}
                      onClick={() => selectNav(item.id)}
                      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
                        isActive
                          ? "bg-primary text-primary-foreground font-semibold shadow-sm"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      }`}
                    >
                      <Icon size={16} />
                      <span>{t(item.label)}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* System & Ops */}
            <div>
              <p className="px-3 mb-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
                {t("Opérations")}
              </p>
              <div className="space-y-1">
                {navItems.filter(i => i.group === 'system').map(item => {
                  const Icon = item.icon
                  const isActive = section === item.id
                  return (
                    <button
                      key={item.id}
                      onClick={() => selectNav(item.id)}
                      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
                        isActive
                          ? "bg-primary text-primary-foreground font-semibold shadow-sm"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      }`}
                    >
                      <Icon size={16} />
                      <span>{t(item.label)}</span>
                      {item.id === "monitoring" && counts.failed > 0 && (
                        <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded-full bg-destructive text-white font-bold">
                          {counts.failed}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          </nav>
        </div>

        {/* Sidebar Footer */}
        <div className="border-t border-border p-3 space-y-2 bg-card">
          <div className="flex items-center justify-between px-2 py-1">
            <span className="text-xs text-muted-foreground">{t("Langue")}</span>
            <LanguageToggle />
          </div>
          <div className="rounded-lg border border-border/60 bg-muted/40 p-2.5">
            <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
              <Shield size={13} className="text-primary" /> {t("Admin Console")}
            </div>
            <p className="mt-0.5 text-[11px] text-muted-foreground truncate">{user?.email || "admin@readhub.com"}</p>
          </div>
          <button
            onClick={() => void signOut()}
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors"
          >
            <LogOut size={14} /> {t("Déconnexion")}
          </button>
        </div>
      </aside>

      {/* ── Main Content Area ── */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
        {/* Top Header */}
        <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center justify-between border-b border-border/80 bg-background/90 px-5 md:px-8 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 text-muted-foreground hover:text-foreground rounded-lg lg:hidden hover:bg-muted"
              aria-label="Open sidebar menu"
            >
              <Menu size={20} />
            </button>
            <div>
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">{t("READHUB Control Room")}</p>
              <h1 className="text-base md:text-lg font-bold font-headline">{t(title)}</h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link
              to="/hub/create"
              className="flex items-center gap-1.5 rounded-lg bg-primary text-primary-foreground px-3.5 py-1.5 text-xs font-semibold shadow-sm hover:opacity-90 transition"
            >
              <Plus size={14} /> {t("Créer un site")}
            </Link>
            <Link
              to="/"
              className="text-xs text-muted-foreground font-medium hover:text-foreground flex items-center gap-1"
            >
              {t("Voir le portail")} <ArrowUpRight size={13} />
            </Link>
          </div>
        </header>

        {/* Dynamic Panel Content */}
        <main className="p-5 md:p-8 flex-1">
          <div className="mx-auto max-w-[1500px]">
            {panel}
          </div>
        </main>
      </div>
    </div>
  )
}

function Overview({
  sites,
  active,
  draft,
  archived,
  counts,
  loading,
  open,
}: {
  sites: Site[]
  active: number
  draft: number
  archived: number
  counts: { manga: number; chapters: number; failed: number }
  loading: boolean
  open: (section: string) => void
}) {
  const { t } = useTranslation()
  const stats = [
    { label: "Sites manga", value: sites.length, meta: t("{{active}} actifs · {{draft}} brouillons", { active: active, draft: draft }), icon: Globe2, color: "text-emerald-500 bg-emerald-500/10" },
    { label: "Mangas", value: counts.manga, meta: "Tous les sites", icon: BookOpen, color: "text-blue-500 bg-blue-500/10" },
    { label: "Chapitres", value: counts.chapters, meta: "Tous statuts", icon: FileText, color: "text-purple-500 bg-purple-500/10" },
    { label: "Imports en erreur", value: counts.failed, meta: "À examiner", icon: Activity, color: "text-rose-500 bg-rose-500/10" },
  ]

  return (
    <>
      {/* Overview Header Section */}
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[.18em] text-emerald-500 font-bold">{t("Vue d'ensemble")}</p>
          <h2 className="mt-2 text-3xl font-headline font-black">{t("Le réseau, d’un seul regard.")}</h2>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            {t("Supervisez vos éditions manga indépendantes, surveillez les statistiques de trafic, planifiez des importations et gérez les configurations publicitaires.")}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            to="/hub/create"
            className="flex items-center gap-2 rounded-xl bg-primary text-primary-foreground px-4 py-2.5 text-sm font-bold shadow-sm transition hover:opacity-95"
          >
            <Plus size={16} />
            {t("Ajouter un site")}
          </Link>
          <button
            onClick={() => open("sites")}
            className="flex items-center gap-2 rounded-xl border border-border bg-card text-card-foreground px-4 py-2.5 text-sm font-semibold shadow-sm transition hover:bg-muted"
          >
            {t("Gérer les sites")} <ArrowUpRight size={16} />
          </button>
        </div>
      </div>

      {/* Metric Cards Row */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map(({ label, value, meta, icon: Icon, color }) => (
          <article key={label} className="rounded-2xl border border-border bg-card p-5 shadow-sm hover:shadow-md transition duration-200">
            <div className="flex items-center justify-between text-sm text-muted-foreground font-semibold">
              <span>{label}</span>
              <div className={`p-2 rounded-lg ${color}`}>
                <Icon size={16} />
              </div>
            </div>
            <div className="mt-4 flex items-baseline gap-3">
              <strong className="font-display text-4xl font-extrabold tracking-tight">{loading ? "—" : value}</strong>
              <span className="text-xs text-muted-foreground font-medium">{meta}</span>
            </div>
          </article>
        ))}
      </div>

      {/* Quick Administration Actions Shortcuts Grid */}
      <div className="mt-8">
        <h3 className="text-xs uppercase tracking-[.15em] font-bold text-muted-foreground mb-4">{t("Actions de contrôle rapides")}</h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <button
            onClick={() => open("content")}
            className="p-4 rounded-xl border border-border bg-card hover:bg-muted/50 text-left space-y-2 transition shadow-sm group"
          >
            <div className="p-2.5 w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <FileText size={18} />
            </div>
            <h4 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">{t("Gestion du contenu")}</h4>
            <p className="text-xs text-muted-foreground leading-relaxed">{t("Ajoutez des mangas, gérez des chapitres et éditez les images de scans.")}</p>
          </button>

          <button
            onClick={() => open("drive-to-csv")}
            className="p-4 rounded-xl border border-border bg-card hover:bg-muted/50 text-left space-y-2 transition shadow-sm group"
          >
            <div className="p-2.5 w-10 h-10 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center">
              <FolderDown size={18} />
            </div>
            <h4 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">{t("Importateur Drive → CSV")}</h4>
            <p className="text-xs text-muted-foreground leading-relaxed">{t("Convertissez un dossier Google Drive contenant des scans d'images en index CSV.")}</p>
          </button>

          <button
            onClick={() => open("ads")}
            className="p-4 rounded-xl border border-border bg-card hover:bg-muted/50 text-left space-y-2 transition shadow-sm group"
          >
            <div className="p-2.5 w-10 h-10 rounded-lg bg-purple-500/10 text-purple-500 flex items-center justify-center">
              <Megaphone size={18} />
            </div>
            <h4 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">{t("Régies Publicitaires")}</h4>
            <p className="text-xs text-muted-foreground leading-relaxed">{t("Insérez et configurez des tags publicitaires (Google Ads, Adsterra, Exoclick) sur le réseau.")}</p>
          </button>

          <button
            onClick={() => open("logs")}
            className="p-4 rounded-xl border border-border bg-card hover:bg-muted/50 text-left space-y-2 transition shadow-sm group"
          >
            <div className="p-2.5 w-10 h-10 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center">
              <Terminal size={18} />
            </div>
            <h4 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">{t("Logs d'Audit Système")}</h4>
            <p className="text-xs text-muted-foreground leading-relaxed">{t("Examinez l'historique complet d'activité de l'équipe et les états de génération.")}</p>
          </button>
        </div>
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-[1.55fr_.85fr]">
        {/* Left Side: Recent Sites Added Table */}
        <section className="rounded-2xl border border-border bg-card p-5 md:p-6 shadow-sm">
          <div className="flex items-end justify-between border-b border-border pb-4">
            <div>
              <p className="text-xs uppercase tracking-[.16em] text-emerald-500 font-bold">{t("Réseau multi-sites")}</p>
              <h3 className="mt-2 text-xl font-bold font-headline">{t("Sites récemment configurés")}</h3>
            </div>
            <button onClick={() => open("sites")} className="text-xs font-bold text-primary hover:underline flex items-center gap-1">
              {t("Voir tous")} <ArrowUpRight size={14} />
            </button>
          </div>
          
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border/60 text-muted-foreground text-xs uppercase tracking-wider font-semibold">
                  <th className="pb-3">{t("Nom")}</th>
                  <th className="pb-3">{t("Subdomain")}</th>
                  <th className="pb-3">{t("Langue")}</th>
                  <th className="pb-3 text-right">{t("Statut")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {sites.slice(0, 6).map(site => (
                  <tr key={site.id} className="hover:bg-muted/20 transition-colors">
                    <td className="py-3 flex items-center gap-3">
                      <div className="grid h-8 w-8 place-items-center rounded-lg border border-border bg-muted overflow-hidden shrink-0">
                        {site.logo_url ? (
                          <img src={site.logo_url} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <Globe2 size={14} className="text-muted-foreground" />
                        )}
                      </div>
                      <span className="font-semibold text-foreground truncate max-w-xs">{t(site.name)}</span>
                    </td>
                    <td className="py-3 text-muted-foreground font-mono text-xs">{site.subdomain}</td>
                    <td className="py-3"><span className="text-xs px-2 py-0.5 rounded-md bg-muted text-foreground uppercase font-bold font-mono">{site.language || "FR"}</span></td>
                    <td className="py-3 text-right">
                      <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wider ${
                        site.status === "active" 
                          ? "bg-emerald-500/10 text-emerald-500" 
                          : site.status === "archived" 
                            ? "bg-slate-500/10 text-slate-500" 
                            : "bg-amber-500/10 text-amber-500"
                      }`}>
                        {site.status === "active" ? t("Actif") : site.status === "archived" ? t("Archivé") : t("Brouillon")}
                      </span>
                    </td>
                  </tr>
                ))}
                {!loading && sites.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-12 text-sm text-muted-foreground text-center">
                      {t("Aucun site créé. Ouvrez « Sites manga » pour commencer.")}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Right Side: Platform Health & Operational Status */}
        <section className="rounded-2xl border border-border bg-card p-5 md:p-6 shadow-sm flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[.16em] text-emerald-500 font-bold">{t("État opérationnel")}</p>
                <h3 className="mt-2 text-xl font-bold font-headline">{t("Diagnostic Système")}</h3>
              </div>
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
            </div>
            
            <p className="text-xs text-muted-foreground leading-relaxed leading-5">
              {t("Tous les sites du réseau sont propulsés par un socle Express & PostgreSQL commun, garantissant une cohérence globale des données et une distribution statique performante.")}
            </p>

            <div className="space-y-3 pt-3 border-t border-border text-xs">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">{t("Base de données SQL")}</span>
                <span className="font-bold text-emerald-500 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> PostgreSQL
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">{t("Sites Actifs")}</span>
                <span className="font-bold text-emerald-500 font-mono">{active} / {sites.length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">{t("Fichiers de Scans")}</span>
                <span className="font-bold text-foreground font-mono">OK</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">{t("Uptime Serveur")}</span>
                <span className="font-bold text-foreground font-mono">100.0%</span>
              </div>
            </div>
          </div>

          <div className="border-t border-border pt-4 flex items-center justify-between text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5 font-semibold text-slate-500">
              <Users size={14} className="text-primary" /> {t("Console Sécurisée RBAC")}
            </span>
            <span className="px-2 py-0.5 rounded bg-muted text-[10px] font-mono font-bold tracking-wider uppercase text-slate-500">
              {t("Super Admin")}
            </span>
          </div>
        </section>
      </div>
    </>
  )
}
