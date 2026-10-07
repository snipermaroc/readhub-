import { useEffect, useState, useMemo, type FormEvent } from "react"
import DOMPurify from "dompurify"
import {
  Check,
  Save,
  Megaphone,
  ShieldAlert,
  FileText,
  AlertCircle,
  Bold,
  Italic,
  Heading,
  List,
  RotateCcw,
  Eye,
  EyeOff,
  Star,
  Flame,
  Pin,
  ArrowUp,
  ArrowDown,
  Search,
  Sparkles,
  Filter,
  RefreshCw,
  Layers,
  LayoutGrid,
  CheckCircle2,
  Sliders,
  BookOpen,
} from "lucide-react"
import { supabase } from "@/lib/mangahub-db"

export interface MangaPlacementControl {
  mangaId: string
  visible: boolean
  isSpotlight?: boolean
  isPinned?: boolean
  order?: number
  badge?: string
}

export interface HomepageConfig {
  brandName: string
  heroLabel: string
  heroTitle: string
  heroDescription: string
  pageSize: number
  seoEnabled: boolean
  seoTitle: string
  seoDescription: string
  popularFooterLinks: Array<{ title: string; slug: string }>

  // Custom Homepage Ads integration
  adTopEnabled?: boolean
  adTopCode?: string
  adSidebarEnabled?: boolean
  adSidebarCode?: string
  adSidebarBottomEnabled?: boolean
  adSidebarBottomCode?: string

  // WYSIWYG Legal pages integration
  legalPrivacy?: string
  legalTerms?: string
  legalDmca?: string
  legalCookies?: string
  legalContact?: string

  // Manga Placement & Visibility Control
  mangaControls?: Record<string, MangaPlacementControl>
}

export const defaultHomepageConfig: HomepageConfig = {
  brandName: "MangaReadHub",
  heroLabel: "Read Manga Online Free",
  heroTitle: "Popular Manga",
  heroDescription:
    "Discover the most-read manga series online. Read the latest chapters of One Piece, Naruto, Jujutsu Kaisen, and hundreds more — free, fast, and updated daily on MangaReadHub.",
  pageSize: 20,
  seoEnabled: true,
  seoTitle: "Read Manga Online — MangaReadHub",
  seoDescription:
    "MangaReadHub is your ultimate destination to read high quality manga online for free. Updated daily with the latest releases from top manga editions and scanlation groups.",
  popularFooterLinks: [
    { title: "One Piece", slug: "one-piece" },
    { title: "Naruto", slug: "naruto" },
    { title: "Jujutsu Kaisen", slug: "jujutsu-kaisen" },
    { title: "Demon Slayer", slug: "demon-slayer" },
    { title: "Attack on Titan", slug: "attack-on-titan" },
  ],
  adTopEnabled: true,
  adTopCode: `<div class="bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-800 rounded-xl p-4 text-center text-xs text-slate-400 dark:text-slate-500 font-mono tracking-wider">Top Banner Ad Slot (728x90)</div>`,
  adSidebarEnabled: true,
  adSidebarCode: `<div class="bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-800 rounded-xl p-6 text-center text-xs text-slate-400 dark:text-slate-500 font-mono tracking-wider min-h-[250px] flex items-center justify-center">Sidebar Banner Ad (300x250)</div>`,
  adSidebarBottomEnabled: true,
  adSidebarBottomCode: `<div class="bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-800 rounded-xl p-6 text-center text-xs text-slate-400 dark:text-slate-500 font-mono tracking-wider min-h-[250px] flex items-center justify-center">Sidebar Bottom Ad (300x250)</div>`,

  legalPrivacy: `<h3>Privacy Policy</h3>
<p>This Privacy Policy describes how READHUB collects, uses, and discloses information when you visit our manga discovery portal and independent editions.</p>
<h4>1. Information We Collect</h4>
<p>We may collect information you provide directly, such as email addresses when registering an admin account or contacting support. When browsing, anonymous analytics metrics such as pages viewed, referrers, and device types may be logged.</p>
<h4>2. How We Use Information</h4>
<p>Collected data is used solely to maintain platform operations, deliver manga content, monitor performance, and prevent unauthorized scraping or security incidents.</p>
<h4>3. Cookies and Tracking</h4>
<p>We use local storage and essential cookies to remember your reading progress, chapter bookmarks, and light/dark theme preference. You can manage cookie settings through your browser.</p>
<h4>4. Data Retention and Rights</h4>
<p>You have the right to request access to or deletion of your personal data. To exercise your rights, please reach out via our contact page.</p>`,

  legalTerms: `<h3>Terms of Service</h3>
<p>Please read these Terms of Service carefully before accessing or using the READHUB portal and connected manga reader websites.</p>
<h4>1. Acceptance of Terms</h4>
<p>By accessing READHUB or any affiliated manga site edition, you agree to comply with and be bound by these Terms of Service.</p>
<h4>2. Use of the Platform</h4>
<p>You agree to use the service for personal, non-commercial reading purposes. Any automated scraping, excessive rate requesting, or attempt to disrupt service integrity is strictly prohibited.</p>
<h4>3. Intellectual Property</h4>
<p>All manga titles, cover artwork, and illustrated works remain the property of their respective copyright holders and publishers.</p>`,

  legalDmca: `<h3>DMCA Copyright Policy</h3>
<p>READHUB respects the intellectual property rights of creators and complies with the Digital Millennium Copyright Act (DMCA).</p>
<h4>1. Notice and Takedown</h4>
<p>If you are a copyright owner or an agent thereof and believe that any content hosted or indexed on our network infringes your copyright, you may submit a formal notification.</p>
<h4>2. Required Information</h4>
<p>Your notice must include identification of the copyrighted work, URL location of the infringing material, your contact information, a statement of good faith belief, and a physical or electronic signature.</p>
<h4>3. Contact Agent</h4>
<p>Notices should be sent to the designated DMCA representative via our contact channels with all required documentation.</p>`,

  legalCookies: `<h3>Cookie Policy</h3>
<p>This Cookie Policy explains how cookies and similar local storage mechanisms are utilized across READHUB and affiliated manga editions.</p>
<h4>1. Essential Cookies</h4>
<p>These cookies are required for fundamental site functions such as theme preferences (dark mode), reader settings, and secure administrator authentication.</p>
<h4>2. Performance & Analytics</h4>
<p>We may collect anonymous usage statistics to understand popular manga series, reader engagement, and server response times.</p>
<h4>3. Managing Preferences</h4>
<p>You can control and disable cookies through your browser settings. Note that disabling essential cookies may impact chapter loading and preference saving.</p>`,

  legalContact: `<h3>Contact Us</h3>
<p>Have questions, suggestions, or need assistance with READHUB? Get in touch with our team.</p>
<h4>1. General Inquiries</h4>
<p>For questions regarding manga editions, feature requests, or general support, please reach out to admin@readhub.com.</p>
<h4>2. Publishers & Creators</h4>
<p>If you are an independent creator or publisher interested in launching an edition on READHUB, contact our team to get started.</p>`,

  mangaControls: {},
}

interface MangaRecord {
  id: string
  site_id: string
  title: string
  slug: string
  cover_url: string | null
  genres: string[]
  views: number
  status: string
  siteName?: string
}

type ActiveSectionTab = "manga_placement" | "hero" | "ads" | "legal"

const PRESET_BADGES = ["HOT", "TRENDING", "STAFF PICK", "NEW", "TOP RATED", "FEATURED", "POPULAR"]

export default function PortalManager() {
  const [config, setConfig] = useState<HomepageConfig>(defaultHomepageConfig)
  const [mangaList, setMangaList] = useState<MangaRecord[]>([])
  const [recordId, setRecordId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")

  // Active Top Navigation Tab
  const [activeTab, setActiveTab] = useState<ActiveSectionTab>("manga_placement")

  // Manga Placement Search & Filter States
  const [mangaSearch, setMangaSearch] = useState("")
  const [mangaFilter, setMangaFilter] = useState<"all" | "visible" | "hidden" | "pinned" | "spotlight">("all")

  // State for WYSIWYG legal tabs
  const [selectedLegalTab, setSelectedLegalTab] = useState<"privacy" | "terms" | "dmca" | "cookies" | "contact">("privacy")
  const [isWysiwygPreview, setIsWysiwygPreview] = useState(false)
  const [isLegalEditorExpanded, setIsLegalEditorExpanded] = useState(false)

  const load = async () => {
    setLoading(true)
    const [{ data: settingsData }, { data: mangaData }, { data: sitesData }] = await Promise.all([
      supabase
        .from("site_settings")
        .select("id,value")
        .eq("setting_key", "homepage_design")
        .is("site_id", null)
        .maybeSingle(),
      supabase.from("manga").select("*").order("views", { ascending: false }).limit(300),
      supabase.from("manga_sites").select("id,name,subdomain,slug"),
    ])

    if (settingsData) {
      setRecordId(settingsData.id)
      const stored = (settingsData.value ?? {}) as Partial<HomepageConfig>
      setConfig({ ...defaultHomepageConfig, ...stored })
    }

    if (mangaData) {
      const siteMap = new Map((sitesData ?? []).map((s: any) => [s.id, s.name]))
      const enriched = mangaData.map((m: any) => ({
        ...m,
        siteName: siteMap.get(m.site_id) || "Edition",
      }))
      setMangaList(enriched)
    }

    setLoading(false)
  }

  useEffect(() => {
    void load()
  }, [])

  // Manga Control Helpers
  const getControl = (mangaId: string): MangaPlacementControl => {
    return config.mangaControls?.[mangaId] || {
      mangaId,
      visible: true,
      isSpotlight: false,
      isPinned: false,
      order: undefined,
      badge: "",
    }
  }

  const updateMangaControl = (mangaId: string, patch: Partial<MangaPlacementControl>) => {
    setConfig(prev => {
      const currentControls = prev.mangaControls || {}
      const existing = currentControls[mangaId] || {
        mangaId,
        visible: true,
        isSpotlight: false,
        isPinned: false,
        order: undefined,
        badge: "",
      }

      // If spotlight is set to true on this manga, reset it on all other mangas
      let updatedControls = { ...currentControls }
      if (patch.isSpotlight) {
        Object.keys(updatedControls).forEach(id => {
          if (updatedControls[id]?.isSpotlight) {
            updatedControls[id] = { ...updatedControls[id], isSpotlight: false }
          }
        })
      }

      updatedControls[mangaId] = {
        ...existing,
        ...patch,
      }

      return {
        ...prev,
        mangaControls: updatedControls,
      }
    })
  }

  // Bulk actions for Manga Control
  const setAllVisibility = (visible: boolean) => {
    setConfig(prev => {
      const updated = { ...(prev.mangaControls || {}) }
      mangaList.forEach(m => {
        const existing = updated[m.id] || { mangaId: m.id, visible: true }
        updated[m.id] = { ...existing, visible }
      })
      return { ...prev, mangaControls: updated }
    })
    setMessage(visible ? "Tous les mangas sont maintenant marqués comme visibles sur l'accueil." : "Tous les mangas sont masqués de l'accueil.")
    window.setTimeout(() => setMessage(""), 3000)
  }

  const resetAllOrdering = () => {
    setConfig(prev => {
      const updated = { ...(prev.mangaControls || {}) }
      mangaList.forEach(m => {
        if (updated[m.id]) {
          updated[m.id] = { ...updated[m.id], order: undefined, isPinned: false, isSpotlight: false }
        }
      })
      return { ...prev, mangaControls: updated }
    })
    setMessage("L'ordre et les épinglages des mangas ont été réinitialisés.")
    window.setTimeout(() => setMessage(""), 3000)
  }

  const moveOrder = (mangaId: string, direction: "up" | "down") => {
    const current = getControl(mangaId)
    const currentOrder = current.order !== undefined ? current.order : 50
    const nextOrder = direction === "up" ? Math.max(1, currentOrder - 1) : currentOrder + 1
    updateMangaControl(mangaId, { order: nextOrder })
  }

  // Filtered list of manga for the control room
  const filteredMangaList = useMemo(() => {
    return mangaList.filter(m => {
      const ctrl = getControl(m.id)

      // Search filter
      if (mangaSearch.trim()) {
        const q = mangaSearch.toLowerCase()
        const matchTitle = m.title.toLowerCase().includes(q)
        const matchSlug = m.slug.toLowerCase().includes(q)
        const matchGenres = Array.isArray(m.genres) && m.genres.some(g => g.toLowerCase().includes(q))
        if (!matchTitle && !matchSlug && !matchGenres) return false
      }

      // Filter selector
      if (mangaFilter === "visible") return ctrl.visible !== false
      if (mangaFilter === "hidden") return ctrl.visible === false
      if (mangaFilter === "pinned") return !!ctrl.isPinned
      if (mangaFilter === "spotlight") return !!ctrl.isSpotlight

      return true
    })
  }, [mangaList, mangaSearch, mangaFilter, config.mangaControls])

  // Stats Counters
  const stats = useMemo(() => {
    let visibleCount = 0
    let hiddenCount = 0
    let pinnedCount = 0
    let spotlightMangaTitle = ""

    mangaList.forEach(m => {
      const ctrl = getControl(m.id)
      if (ctrl.visible !== false) visibleCount++
      else hiddenCount++
      if (ctrl.isPinned) pinnedCount++
      if (ctrl.isSpotlight) spotlightMangaTitle = m.title
    })

    return {
      total: mangaList.length,
      visible: visibleCount,
      hidden: hiddenCount,
      pinned: pinnedCount,
      spotlightTitle: spotlightMangaTitle || "Automatique (Plus vu)",
    }
  }, [mangaList, config.mangaControls])

  const save = async (event: FormEvent) => {
    event.preventDefault()
    setSaving(true)
    setError("")
    setMessage("")

    const payload = {
      setting_key: "homepage_design",
      site_id: null,
      value: config,
      updated_at: new Date().toISOString(),
    }

    const result = recordId
      ? await supabase.from("site_settings").update(payload).eq("id", recordId)
      : await supabase.from("site_settings").insert(payload)

    setSaving(false)
    if (result.error) {
      setError("Failed to save homepage settings. Please verify admin privileges.")
      return
    }

    setMessage("✓ Paramètres de la page d'accueil enregistrés et synchronisés avec succès !")
    window.setTimeout(() => setMessage(""), 3500)
    await load()
  }

  // Formatting function helper for Custom WYSIWYG Editor
  const insertTag = (tagOpen: string, tagClose: string) => {
    const el = document.getElementById("wysiwyg-textarea") as HTMLTextAreaElement
    if (!el) return

    const start = el.selectionStart
    const end = el.selectionEnd
    const text = el.value
    const selected = text.substring(start, end)
    const replacement = tagOpen + selected + tagClose

    const nextVal = text.substring(0, start) + replacement + text.substring(end)
    updateLegalConfigValue(nextVal)

    setTimeout(() => {
      el.focus()
      el.setSelectionRange(start + tagOpen.length, start + tagOpen.length + selected.length)
    }, 50)
  }

  const getLegalConfigKey = (): keyof HomepageConfig => {
    switch (selectedLegalTab) {
      case "privacy":
        return "legalPrivacy"
      case "terms":
        return "legalTerms"
      case "dmca":
        return "legalDmca"
      case "cookies":
        return "legalCookies"
      case "contact":
        return "legalContact"
    }
  }

  const getLegalValue = (): string => {
    const key = getLegalConfigKey()
    return (config[key] as string) || ""
  }

  const updateLegalConfigValue = (val: string) => {
    const key = getLegalConfigKey()
    setConfig(prev => ({
      ...prev,
      [key]: val,
    }))
  }

  const resetLegalToDefault = () => {
    const key = getLegalConfigKey()
    const fallback = defaultHomepageConfig[key] as string
    updateLegalConfigValue(fallback)
  }

  return (
    <section className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-primary font-bold">Homepage Customization</p>
          <h2 className="mt-1 text-2xl md:text-3xl font-extrabold font-headline">MangaReadHub Homepage Control</h2>
          <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
            Contrôlez les mangas affichés ou masqués sur l'accueil, leur placement/ordre, le Hero Spotlight et le design.
          </p>
        </div>

        {/* Global Save Button in Header */}
        <button
          type="button"
          onClick={e => void save(e as any)}
          disabled={saving || loading}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary hover:opacity-95 px-5 py-2.5 text-xs font-bold text-primary-foreground shadow-md transition disabled:opacity-60 shrink-0"
        >
          <Save size={15} /> {saving ? "Enregistrement…" : "Enregistrer la configuration"}
        </button>
      </div>

      {message && (
        <p role="status" className="flex items-center gap-2 text-xs sm:text-sm text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 p-3.5 rounded-xl font-bold">
          <CheckCircle2 size={16} /> {message}
        </p>
      )}
      {error && (
        <p role="alert" className="text-xs sm:text-sm text-destructive bg-destructive/10 border border-destructive/20 p-3.5 rounded-xl font-bold">
          <AlertCircle size={16} /> {error}
        </p>
      )}

      {/* ── Section Navigation Tabs ── */}
      <div className="flex items-center gap-2 border-b border-border pb-1 overflow-x-auto scrollbar-none">
        <button
          type="button"
          onClick={() => setActiveTab("manga_placement")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === "manga_placement"
              ? "bg-primary text-primary-foreground shadow-md"
              : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
        >
          <Sliders size={15} />
          <span>Contrôle & Placement des Mangas ({mangaList.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("hero")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === "hero"
              ? "bg-primary text-primary-foreground shadow-md"
              : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
        >
          <LayoutGrid size={15} />
          <span>Hero & Design Général</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("ads")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === "ads"
              ? "bg-primary text-primary-foreground shadow-md"
              : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
        >
          <Megaphone size={15} />
          <span>Bannières & Publicités</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("legal")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === "legal"
              ? "bg-primary text-primary-foreground shadow-md"
              : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
        >
          <ShieldAlert size={15} />
          <span>Pages Légales (WYSIWYG)</span>
        </button>
      </div>

      <form onSubmit={save} className="space-y-6">
        {/* ═══════════════════════════════════════════════════════════════════════ */}
        {/* TAB 1: MANGA DISPLAY & PLACEMENT CONTROL ROOM                          */}
        {/* ═══════════════════════════════════════════════════════════════════════ */}
        {activeTab === "manga_placement" && (
          <div className="space-y-6">
            {/* Quick Stats Overview */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
              <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                  <span>Mangas Affichés</span>
                  <Eye size={14} className="text-emerald-500" />
                </div>
                <p className="text-2xl font-black text-foreground">{stats.visible}</p>
                <span className="text-[10px] text-emerald-500 font-bold">Actifs sur l'accueil</span>
              </div>

              <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                  <span>Mangas Masqués</span>
                  <EyeOff size={14} className="text-slate-400" />
                </div>
                <p className="text-2xl font-black text-foreground">{stats.hidden}</p>
                <span className="text-[10px] text-muted-foreground font-bold">Cachés du portail</span>
              </div>

              <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                  <span>Séries Épinglées</span>
                  <Pin size={14} className="text-primary" />
                </div>
                <p className="text-2xl font-black text-foreground">{stats.pinned}</p>
                <span className="text-[10px] text-primary font-bold">Priorité #1 en tête</span>
              </div>

              <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                  <span>Hero Spotlight</span>
                  <Star size={14} className="text-amber-500 fill-amber-500" />
                </div>
                <p className="text-sm font-bold text-foreground truncate mt-1">{stats.spotlightTitle}</p>
                <span className="text-[10px] text-amber-500 font-bold">Bannière principale</span>
              </div>
            </div>

            {/* Filter, Search & Bulk Actions Bar */}
            <div className="rounded-2xl border border-border bg-card p-4 shadow-sm space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                {/* Search Bar */}
                <div className="relative flex-1 max-w-md">
                  <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                  <input
                    type="search"
                    value={mangaSearch}
                    onChange={e => setMangaSearch(e.target.value)}
                    placeholder="Filtrer par titre, slug ou genre..."
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-input bg-muted/30 text-xs text-foreground outline-none focus:border-primary shadow-sm"
                  />
                </div>

                {/* Filter Selector Tabs */}
                <div className="flex flex-wrap items-center gap-1.5 bg-muted/40 p-1 rounded-xl border border-border text-xs font-bold">
                  {(["all", "visible", "hidden", "pinned", "spotlight"] as const).map(f => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setMangaFilter(f)}
                      className={`px-3 py-1.5 rounded-lg transition capitalize ${
                        mangaFilter === f ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {f === "all" && "Tous"}
                      {f === "visible" && "Visibles"}
                      {f === "hidden" && "Masqués"}
                      {f === "pinned" && "Épinglés"}
                      {f === "spotlight" && "Spotlight"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Bulk Quick Action Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-border text-xs">
                <span className="text-muted-foreground text-[11px] font-semibold">
                  Affichage de <b>{filteredMangaList.length}</b> manga(s) sur <b>{mangaList.length}</b> au total
                </span>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setAllVisibility(true)}
                    className="px-3 py-1.5 rounded-lg border border-border bg-card hover:bg-muted font-bold text-emerald-600 dark:text-emerald-400 transition"
                  >
                    👁️ Tout Afficher
                  </button>
                  <button
                    type="button"
                    onClick={() => setAllVisibility(false)}
                    className="px-3 py-1.5 rounded-lg border border-border bg-card hover:bg-muted font-bold text-muted-foreground transition"
                  >
                    🚫 Tout Masquer
                  </button>
                  <button
                    type="button"
                    onClick={resetAllOrdering}
                    className="px-3 py-1.5 rounded-lg border border-border bg-card hover:bg-muted font-bold text-secondary transition"
                  >
                    🔄 Réinitialiser Placements
                  </button>
                </div>
              </div>
            </div>

            {/* Manga Interactive Placement Cards */}
            {filteredMangaList.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center text-muted-foreground">
                <BookOpen size={36} className="mx-auto mb-2 opacity-50" />
                <h4 className="text-sm font-bold text-foreground">Aucun manga correspondant</h4>
                <p className="text-xs mt-1">Ajustez vos termes de recherche ou réinitialisez les filtres.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredMangaList.map((m, index) => {
                  const ctrl = getControl(m.id)
                  const isVisible = ctrl.visible !== false
                  const isSpotlight = !!ctrl.isSpotlight
                  const isPinned = !!ctrl.isPinned
                  const orderVal = ctrl.order !== undefined ? ctrl.order : index + 1
                  const badgeVal = ctrl.badge || ""

                  return (
                    <div
                      key={m.id}
                      className={`rounded-2xl border transition-all p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm ${
                        !isVisible
                          ? "bg-muted/15 border-border/60 opacity-60"
                          : isSpotlight
                          ? "bg-amber-500/5 border-amber-500/40 shadow-amber-500/5"
                          : isPinned
                          ? "bg-primary/5 border-primary/40 shadow-primary/5"
                          : "bg-card border-border hover:border-border/90"
                      }`}
                    >
                      {/* Left: Cover + Details */}
                      <div className="flex items-center gap-3.5 min-w-0 flex-1">
                        <div className="relative w-14 h-20 rounded-xl overflow-hidden border border-border bg-muted shrink-0 shadow-sm">
                          {m.cover_url ? (
                            <img src={m.cover_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <BookOpen size={20} className="text-muted-foreground m-auto h-full" />
                          )}
                          {isSpotlight && (
                            <span className="absolute top-1 left-1 bg-amber-500 text-slate-950 p-1 rounded-md shadow">
                              <Star size={10} className="fill-slate-950" />
                            </span>
                          )}
                          {isPinned && !isSpotlight && (
                            <span className="absolute top-1 left-1 bg-primary text-white p-1 rounded-md shadow">
                              <Pin size={10} className="fill-white" />
                            </span>
                          )}
                        </div>

                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-bold text-sm text-foreground truncate">{m.title}</h4>
                            {badgeVal && (
                              <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 text-[10px] font-black tracking-wider uppercase">
                                {badgeVal}
                              </span>
                            )}
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-muted text-muted-foreground font-mono">
                              {m.siteName}
                            </span>
                          </div>

                          <p className="text-xs text-muted-foreground font-mono truncate">
                            /{m.slug} · <span className="text-foreground font-bold">{(m.views || 0).toLocaleString()}</span> vues
                          </p>

                          <div className="flex flex-wrap gap-1 pt-0.5">
                            {m.genres?.slice(0, 3).map((g: string) => (
                              <span key={g} className="text-[9px] px-1.5 py-0.5 rounded bg-muted/60 text-muted-foreground font-medium">
                                #{g}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Right: Controls & Placement Options */}
                      <div className="flex flex-wrap items-center gap-2.5 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-border/60">
                        {/* 1. Visibility Toggle */}
                        <button
                          type="button"
                          onClick={() => updateMangaControl(m.id, { visible: !isVisible })}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition shadow-sm ${
                            isVisible
                              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20"
                              : "bg-muted border-border text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          {isVisible ? <Eye size={14} /> : <EyeOff size={14} />}
                          <span>{isVisible ? "Visible Accueil" : "Masqué"}</span>
                        </button>

                        {/* 2. Hero Spotlight Toggle */}
                        <button
                          type="button"
                          onClick={() => updateMangaControl(m.id, { isSpotlight: !isSpotlight })}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition shadow-sm ${
                            isSpotlight
                              ? "bg-amber-500 text-slate-950 border-amber-400 hover:bg-amber-400"
                              : "bg-card border-border text-muted-foreground hover:text-foreground"
                          }`}
                          title="Mettre en avant dans la grande bannière Hero Spotlight en haut du site"
                        >
                          <Star size={13} className={isSpotlight ? "fill-slate-950" : ""} />
                          <span>Spotlight</span>
                        </button>

                        {/* 3. Pin to Top Toggle */}
                        <button
                          type="button"
                          onClick={() => updateMangaControl(m.id, { isPinned: !isPinned })}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition shadow-sm ${
                            isPinned
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-card border-border text-muted-foreground hover:text-foreground"
                          }`}
                          title="Épingler en première position dans le catalogue de mangas"
                        >
                          <Pin size={13} className={isPinned ? "fill-current" : ""} />
                          <span>Épinglé</span>
                        </button>

                        {/* 4. Order Rank Input & Buttons */}
                        <div className="flex items-center gap-1 bg-card border border-border rounded-xl p-1 shadow-sm">
                          <span className="text-[10px] font-bold text-muted-foreground px-1">Ordre:</span>
                          <input
                            type="number"
                            min={1}
                            max={999}
                            value={orderVal}
                            onChange={e => updateMangaControl(m.id, { order: parseInt(e.target.value, 10) || 1 })}
                            className="w-12 h-7 px-1 text-center bg-muted/40 rounded-lg text-xs font-bold font-mono outline-none focus:border-primary border border-input"
                          />
                          <button
                            type="button"
                            onClick={() => moveOrder(m.id, "up")}
                            className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                            title="Monter la priorité"
                          >
                            <ArrowUp size={12} />
                          </button>
                          <button
                            type="button"
                            onClick={() => moveOrder(m.id, "down")}
                            className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                            title="Descendre la priorité"
                          >
                            <ArrowDown size={12} />
                          </button>
                        </div>

                        {/* 5. Custom Badge Tag Selector */}
                        <div className="relative">
                          <select
                            value={badgeVal}
                            onChange={e => updateMangaControl(m.id, { badge: e.target.value })}
                            className="h-8 px-2.5 rounded-xl border border-border bg-card text-xs font-bold text-foreground outline-none focus:border-primary shadow-sm"
                          >
                            <option value="">🏷️ Badge (Aucun)</option>
                            {PRESET_BADGES.map(b => (
                              <option key={b} value={b}>
                                {b}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════════ */}
        {/* TAB 2: HERO & GENERAL BRAND SETTINGS                                   */}
        {/* ═══════════════════════════════════════════════════════════════════════ */}
        {activeTab === "hero" && (
          <div className="space-y-6">
            <div className="bg-card p-6 rounded-2xl border border-border shadow-sm space-y-4">
              <h3 className="font-headline font-bold text-base text-foreground">Hero & Brand Settings</h3>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold text-muted-foreground mb-1">Site Brand Name</label>
                  <input
                    type="text"
                    value={config.brandName}
                    onChange={e => setConfig({ ...config, brandName: e.target.value })}
                    className="w-full h-10 px-3 rounded-lg border border-input bg-card text-sm text-foreground outline-none focus:border-primary"
                    placeholder="MangaReadHub"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-muted-foreground mb-1">Hero Eyebrow Label</label>
                  <input
                    type="text"
                    value={config.heroLabel}
                    onChange={e => setConfig({ ...config, heroLabel: e.target.value })}
                    className="w-full h-10 px-3 rounded-lg border border-input bg-card text-sm text-foreground outline-none focus:border-primary"
                    placeholder="Read Manga Online Free"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-muted-foreground mb-1">Hero H1 Heading</label>
                <input
                  type="text"
                  value={config.heroTitle}
                  onChange={e => setConfig({ ...config, heroTitle: e.target.value })}
                  className="w-full h-10 px-3 rounded-lg border border-input bg-card text-sm text-foreground outline-none focus:border-primary"
                  placeholder="Popular Manga"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-muted-foreground mb-1">Hero Subtitle / Description</label>
                <textarea
                  rows={3}
                  value={config.heroDescription}
                  onChange={e => setConfig({ ...config, heroDescription: e.target.value })}
                  className="w-full p-3 rounded-lg border border-input bg-card text-sm text-foreground resize-y outline-none focus:border-primary"
                  placeholder="Discover the most-read manga series online..."
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-muted-foreground mb-1">Manga Cards Per Page (Pagination)</label>
                <input
                  type="number"
                  min={4}
                  max={60}
                  value={config.pageSize}
                  onChange={e => setConfig({ ...config, pageSize: parseInt(e.target.value, 10) || 20 })}
                  className="w-32 h-10 px-3 rounded-lg border border-input bg-card text-sm text-foreground outline-none focus:border-primary"
                />
              </div>
            </div>

            {/* SEO Text Section */}
            <div className="bg-card p-6 rounded-2xl border border-border shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-headline font-bold text-base text-foreground">Bottom SEO Content</h3>
                <label className="flex items-center gap-2 text-xs font-semibold text-muted-foreground cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.seoEnabled}
                    onChange={e => setConfig({ ...config, seoEnabled: e.target.checked })}
                    className="h-4 w-4 rounded accent-primary"
                  />
                  Show SEO Section
                </label>
              </div>

              {config.seoEnabled && (
                <>
                  <div>
                    <label className="block text-xs font-bold text-muted-foreground mb-1">SEO Heading</label>
                    <input
                      type="text"
                      value={config.seoTitle}
                      onChange={e => setConfig({ ...config, seoTitle: e.target.value })}
                      className="w-full h-10 px-3 rounded-lg border border-input bg-card text-sm text-foreground outline-none focus:border-primary"
                      placeholder="Read Manga Online — MangaReadHub"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-muted-foreground mb-1">SEO Description</label>
                    <textarea
                      rows={4}
                      value={config.seoDescription}
                      onChange={e => setConfig({ ...config, seoDescription: e.target.value })}
                      className="w-full p-3 rounded-lg border border-input bg-card text-sm text-foreground resize-y outline-none focus:border-primary"
                    />
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════════ */}
        {/* TAB 3: ADS & BANNER MONETIZATION                                       */}
        {/* ═══════════════════════════════════════════════════════════════════════ */}
        {activeTab === "ads" && (
          <div className="bg-card p-6 rounded-2xl border border-border shadow-sm space-y-6">
            <div className="flex items-center gap-2 border-b border-border pb-3">
              <Megaphone size={18} className="text-primary" />
              <h3 className="font-headline font-bold text-base text-foreground">Homepage Monetization Ads</h3>
            </div>

            {/* Top Banner Ad Code */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-foreground">Top Header Banner Ad (728x90 / 468x60)</label>
                <label className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!config.adTopEnabled}
                    onChange={e => setConfig({ ...config, adTopEnabled: e.target.checked })}
                    className="h-4 w-4 rounded accent-primary"
                  />
                  Enabled
                </label>
              </div>
              {config.adTopEnabled && (
                <textarea
                  rows={3}
                  value={config.adTopCode || ""}
                  onChange={e => setConfig({ ...config, adTopCode: e.target.value })}
                  className="w-full p-3 rounded-lg border border-input bg-muted/20 font-mono text-xs text-foreground outline-none focus:border-primary"
                  placeholder="Paste your top banner script or HTML snippet here..."
                />
              )}
            </div>

            {/* Sidebar Banner Ad Code */}
            <div className="space-y-3 border-t border-border pt-4">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-foreground">Sidebar Sticky Banner Ad (300x250 / 300x600)</label>
                <label className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!config.adSidebarEnabled}
                    onChange={e => setConfig({ ...config, adSidebarEnabled: e.target.checked })}
                    className="h-4 w-4 rounded accent-primary"
                  />
                  Enabled
                </label>
              </div>
              {config.adSidebarEnabled && (
                <textarea
                  rows={3}
                  value={config.adSidebarCode || ""}
                  onChange={e => setConfig({ ...config, adSidebarCode: e.target.value })}
                  className="w-full p-3 rounded-lg border border-input bg-muted/20 font-mono text-xs text-foreground outline-none focus:border-primary"
                  placeholder="Paste your sidebar sticky ad HTML or widget script here..."
                />
              )}
            </div>

            {/* Sidebar Bottom Banner Ad Code */}
            <div className="space-y-3 border-t border-border pt-4">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-foreground">Sidebar Bottom Banner Ad (300x250)</label>
                <label className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!config.adSidebarBottomEnabled}
                    onChange={e => setConfig({ ...config, adSidebarBottomEnabled: e.target.checked })}
                    className="h-4 w-4 rounded accent-primary"
                  />
                  Enabled
                </label>
              </div>
              {config.adSidebarBottomEnabled && (
                <textarea
                  rows={3}
                  value={config.adSidebarBottomCode || ""}
                  onChange={e => setConfig({ ...config, adSidebarBottomCode: e.target.value })}
                  className="w-full p-3 rounded-lg border border-input bg-muted/20 font-mono text-xs text-foreground outline-none focus:border-primary"
                  placeholder="Paste your bottom sidebar ad HTML or image script here..."
                />
              )}
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════════ */}
        {/* TAB 4: LEGAL PAGES (WYSIWYG)                                           */}
        {/* ═══════════════════════════════════════════════════════════════════════ */}
        {activeTab === "legal" && (
          <div className="bg-card p-6 rounded-2xl border border-border shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <ShieldAlert size={18} className="text-primary" />
                <h3 className="font-headline font-bold text-base text-foreground">WYSIWYG Legal Pages Control</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsLegalEditorExpanded(prev => !prev)}
                className="text-xs font-bold text-primary bg-primary/10 hover:bg-primary/20 px-3 py-1.5 rounded-lg transition"
              >
                {isLegalEditorExpanded ? "Hide Legal Editor" : "Show Legal Editor"}
              </button>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Customize complete Legal policy contents utilizing formatting triggers below. These settings dynamically update the central legal routes immediately.
            </p>

            {isLegalEditorExpanded ? (
              <>
                {/* Tab Selection */}
                <div className="flex flex-wrap gap-2">
                  {(["privacy", "terms", "dmca", "cookies", "contact"] as const).map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => {
                        setSelectedLegalTab(t)
                        setIsWysiwygPreview(false)
                      }}
                      className={`px-4 py-2 rounded-xl text-xs font-bold uppercase border transition-all ${
                        selectedLegalTab === t
                          ? "bg-primary text-primary-foreground border-primary shadow-sm"
                          : "bg-muted/40 text-muted-foreground border-border hover:border-border/90"
                      }`}
                    >
                      {t === "privacy" && "Privacy Policy"}
                      {t === "terms" && "Terms of Service"}
                      {t === "dmca" && "DMCA Policy"}
                      {t === "cookies" && "Cookie Policy"}
                      {t === "contact" && "Contact Us"}
                    </button>
                  ))}
                </div>

                <div className="border border-border rounded-xl overflow-hidden bg-card">
                  {/* WYSIWYG Toolbar */}
                  <div className="flex flex-wrap items-center justify-between gap-2 p-2 bg-muted/40 border-b border-border">
                    <div className="flex flex-wrap gap-1">
                      <button
                        type="button"
                        title="Insert Heading"
                        onClick={() => insertTag("<h4>", "</h4>")}
                        className="p-1.5 rounded hover:bg-muted text-muted-foreground transition-colors"
                      >
                        <Heading size={15} />
                      </button>
                      <button
                        type="button"
                        title="Insert Bold Text"
                        onClick={() => insertTag("<b>", "</b>")}
                        className="p-1.5 rounded hover:bg-muted text-muted-foreground transition-colors"
                      >
                        <Bold size={15} />
                      </button>
                      <button
                        type="button"
                        title="Insert Italic Text"
                        onClick={() => insertTag("<i>", "</i>")}
                        className="p-1.5 rounded hover:bg-muted text-muted-foreground transition-colors"
                      >
                        <Italic size={15} />
                      </button>
                      <button
                        type="button"
                        title="Insert Paragraph"
                        onClick={() => insertTag("<p>", "</p>")}
                        className="p-1.5 rounded hover:bg-muted text-xs font-bold text-muted-foreground transition-colors"
                      >
                        &lt;p&gt;
                      </button>
                      <button
                        type="button"
                        title="Insert Bullet List"
                        onClick={() => insertTag("<ul>\n  <li>", "</li>\n</ul>")}
                        className="p-1.5 rounded hover:bg-muted text-muted-foreground transition-colors"
                      >
                        <List size={15} />
                      </button>
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setIsWysiwygPreview(prev => !prev)}
                        className={`px-2.5 py-1 rounded text-[11px] font-bold flex items-center gap-1 transition-colors ${
                          isWysiwygPreview ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
                        }`}
                      >
                        <Eye size={13} /> {isWysiwygPreview ? "Raw Code" : "WYSIWYG Preview"}
                      </button>
                      <button
                        type="button"
                        onClick={resetLegalToDefault}
                        title="Reset to default text"
                        className="p-1 rounded text-destructive hover:bg-destructive/10 transition-colors"
                      >
                        <RotateCcw size={14} />
                      </button>
                    </div>
                  </div>

                  {/* WYSIWYG Editor Workspace */}
                  <div className="p-1">
                    {isWysiwygPreview ? (
                      <div
                        className="p-4 min-h-[250px] overflow-y-auto prose dark:prose-invert max-w-none text-sm text-foreground leading-relaxed"
                        dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(getLegalValue()) }}
                      />
                    ) : (
                      <textarea
                        id="wysiwyg-textarea"
                        rows={10}
                        value={getLegalValue()}
                        onChange={e => updateLegalConfigValue(e.target.value)}
                        className="w-full p-4 min-h-[250px] bg-transparent text-sm font-mono text-foreground outline-none resize-y"
                        placeholder="Insert formatted legal copy HTML tags here..."
                      />
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-4 bg-muted/20 rounded-xl border border-dashed border-border">
                <p className="text-xs text-muted-foreground">
                  Legal Editor is currently collapsed. Click <b>"Show Legal Editor"</b> to configure policies.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Bottom Save Bar */}
        <div className="flex items-center justify-between pt-4 border-t border-border">
          <p className="text-xs text-muted-foreground">
            Toutes les modifications appliquées ici mettent à jour le portail MangaReadHub immédiatement.
          </p>

          <button
            type="submit"
            disabled={saving || loading}
            className="inline-flex items-center gap-2 rounded-xl bg-primary hover:opacity-95 px-6 py-3 text-xs font-bold text-primary-foreground shadow-lg disabled:opacity-60 transition-all"
          >
            <Save size={15} /> {saving ? "Enregistrement…" : "Enregistrer la configuration"}
          </button>
        </div>
      </form>
    </section>
  )
}
