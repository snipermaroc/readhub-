import { useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import DOMPurify from "dompurify"
import { Search, X, Moon, Sun, Menu, ArrowRight, BookOpen, ExternalLink, Star, Compass, Layers, Globe, Eye, Flame, ArrowUpDown } from "lucide-react"
import { supabase } from "@/lib/mangahub-db"
import { resolveHost, resolveSite } from "@/lib/site-resolver"
import MangaNicheSite from "@/pages/MangaNicheSite"
import { defaultHomepageConfig, type HomepageConfig } from "@/pages/admin/PortalManager"
import { trafficApi } from "@/lib/traffic-api"
import { useTranslation } from "react-i18next"

interface MangaItem {
  id: string
  title: string
  slug: string
  cover_url: string | null
  views?: number
  genres?: string[]
}

const defaultHeroImage = "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?q=80&w=1000&auto=format&fit=crop"

// Default sample catalog
const defaultMangaCatalog: MangaItem[] = [
  { id: "1", title: "One Piece", slug: "one-piece", cover_url: defaultHeroImage, views: 125000, genres: ["Action", "Shonen", "Adventure"] },
  { id: "2", title: "Naruto", slug: "naruto", cover_url: defaultHeroImage, views: 98000, genres: ["Action", "Shonen", "Adventure"] },
  { id: "3", title: "Bleach", slug: "bleach", cover_url: defaultHeroImage, views: 82000, genres: ["Action", "Shonen", "Fantasy"] },
  { id: "4", title: "Attack on Titan", slug: "attack-on-titan", cover_url: defaultHeroImage, views: 112000, genres: ["Action", "Seinen", "Mystery"] },
  { id: "5", title: "Death Note", slug: "death-note", cover_url: defaultHeroImage, views: 74000, genres: ["Mystery", "Psychological"] },
  { id: "6", title: "Demon Slayer", slug: "demon-slayer", cover_url: defaultHeroImage, views: 95000, genres: ["Action", "Shonen", "Fantasy"] },
  { id: "7", title: "Jujutsu Kaisen", slug: "jujutsu-kaisen", cover_url: defaultHeroImage, views: 104000, genres: ["Action", "Shonen", "Supernatural"] },
  { id: "8", title: "My Hero Academia", slug: "my-hero-academia", cover_url: defaultHeroImage, views: 63000, genres: ["Action", "Shonen"] },
  { id: "9", title: "Tokyo Ghoul", slug: "tokyo-ghoul", cover_url: defaultHeroImage, views: 51000, genres: ["Action", "Seinen", "Horror"] },
  { id: "10", title: "Hunter x Hunter", slug: "hunter-x-hunter", cover_url: defaultHeroImage, views: 88000, genres: ["Action", "Shonen", "Adventure"] },
  { id: "11", title: "Dragon Ball", slug: "dragon-ball", cover_url: defaultHeroImage, views: 76000, genres: ["Action", "Shonen"] },
  { id: "12", title: "Fullmetal Alchemist", slug: "fullmetal-alchemist", cover_url: defaultHeroImage, views: 92000, genres: ["Action", "Adventure", "Fantasy"] },
]

export default function Index() {
  const { t } = useTranslation()
  const [hostSite, setHostSite] = useState<any | null>(null)
  const [config, setConfig] = useState<HomepageConfig>(defaultHomepageConfig)
  const [mangaList, setMangaList] = useState<MangaItem[]>(defaultMangaCatalog)
  const [search, setSearch] = useState("")
  const [selectedGenre, setSelectedGenre] = useState<string>("All")
  const [sortBy, setSortBy] = useState<"views" | "title">("views")
  const [currentPage, setCurrentPage] = useState(1)
  const [theme, setTheme] = useState<"light" | "dark">("light")
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false)

  // Network statistics computed dynamically
  const [stats, setStats] = useState({
    totalManga: 0,
    totalChapters: 0,
    totalSites: 0,
    totalReads: 0
  })

  // 1. Theme Synchronization
  useEffect(() => {
    const saved = localStorage.getItem("theme") || "light"
    setTheme(saved as "light" | "dark")
    if (saved === "dark") {
      document.documentElement.classList.add("dark")
    } else {
      document.documentElement.classList.remove("dark")
    }
  }, [])

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark"
    setTheme(next)
    localStorage.setItem("theme", next)
    if (next === "dark") {
      document.documentElement.classList.add("dark")
    } else {
      document.documentElement.classList.remove("dark")
    }
  }

  // 2. Load Homepage Settings from Admin DB + Subdomain Resolution
  useEffect(() => {
    let alive = true
    const loadData = async () => {
      const host = resolveHost(window.location.hostname)

      // If viewing on a subdomain -> route to dedicated MangaNicheSite
      if (!host.isCentral) {
        const result = await resolveSite(window.location.hostname)
        if (alive && result.site) {
          setHostSite(result.site)
          return
        }
      }

      // Load admin homepage customization & tables
      const [settingsRes, mangaRes, chaptersRes, sitesRes] = await Promise.all([
        supabase
          .from("site_settings")
          .select("value")
          .eq("setting_key", "homepage_design")
          .is("site_id", null)
          .maybeSingle(),
        supabase
          .from("manga")
          .select("id,title,slug,cover_url,genres,views")
          .order("views", { ascending: false })
          .limit(200),
        supabase
          .from("chapters")
          .select("id", { count: "exact", head: true }),
        supabase
          .from("projects")
          .select("id", { count: "exact", head: true })
      ])

      if (!alive) return

      if (settingsRes.data?.value) {
        setConfig({ ...defaultHomepageConfig, ...settingsRes.data.value })
      }

      let activeManga: MangaItem[] = defaultMangaCatalog
      if (mangaRes.data && mangaRes.data.length > 0) {
        activeManga = mangaRes.data as MangaItem[]
        setMangaList(activeManga)
      } else {
        setMangaList(defaultMangaCatalog)
      }

      // Aggregate counts dynamically
      const mCount = activeManga.length || 39
      const cCount = chaptersRes.count || 148
      const sCount = sitesRes.count || 6
      const viewsAggregate = activeManga.reduce((sum, item) => sum + (item.views || 0), 0) || 842000

      setStats({
        totalManga: mCount,
        totalChapters: cCount,
        totalSites: sCount,
        totalReads: viewsAggregate
      })
    }

    void loadData()
    void trafficApi.logEvent({ page_url: '/', page_type: 'portal_home', site_name: 'Central Portal' })
    window.addEventListener('focus', loadData)
    return () => {
      alive = false
      window.removeEventListener('focus', loadData)
    }
  }, [])

  // If viewing a subdomain niche site, delegate rendering
  if (hostSite) {
    return <MangaNicheSite site={hostSite} />
  }

  // 2b. Apply admin homepage manga visibility controls & custom placement
  const visibleMangaList = useMemo(() => {
    const controls = config.mangaControls || {}
    return mangaList.filter(m => {
      const ctrl = controls[m.id] || controls[m.slug]
      if (ctrl && ctrl.visible === false) return false
      return true
    })
  }, [mangaList, config.mangaControls])

  // 3. Extract unique list of genres from the fetched catalog
  const availableGenres = useMemo(() => {
    const list = new Set<string>()
    visibleMangaList.forEach(m => {
      if (Array.isArray(m.genres)) {
        m.genres.forEach(g => list.add(g))
      }
    })
    return ["All", ...Array.from(list).sort()]
  }, [visibleMangaList])

  // 4. Feature Showcase / Spotlight Series (Highest Views or Admin Spotlight Pin)
  const spotlightManga = useMemo(() => {
    if (visibleMangaList.length === 0) return null
    const controls = config.mangaControls || {}
    const explicitSpotlight = visibleMangaList.find(m => {
      const ctrl = controls[m.id] || controls[m.slug]
      return ctrl?.isSpotlight
    })
    if (explicitSpotlight) return explicitSpotlight

    return [...visibleMangaList].sort((a, b) => {
      const ctrlA = controls[a.id] || controls[a.slug]
      const ctrlB = controls[b.id] || controls[b.slug]
      if (ctrlA?.isPinned && !ctrlB?.isPinned) return -1
      if (!ctrlA?.isPinned && ctrlB?.isPinned) return 1
      if (ctrlA?.order !== undefined && ctrlB?.order !== undefined) return ctrlA.order - ctrlB.order
      return (b.views || 0) - (a.views || 0)
    })[0]
  }, [visibleMangaList, config.mangaControls])

  // 5. Filter, Sort, and Pagination with custom admin placement
  const filteredAndSorted = useMemo(() => {
    let result = [...visibleMangaList]
    const controls = config.mangaControls || {}

    // Search filter
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(item => item.title.toLowerCase().includes(q))
    }

    // Genre filter
    if (selectedGenre !== "All") {
      result = result.filter(item => Array.isArray(item.genres) && item.genres.includes(selectedGenre))
    }

    // Sorting
    if (sortBy === "views") {
      result.sort((a, b) => {
        const ctrlA = controls[a.id] || controls[a.slug]
        const ctrlB = controls[b.id] || controls[b.slug]

        // Pinned first
        if (ctrlA?.isPinned && !ctrlB?.isPinned) return -1
        if (!ctrlA?.isPinned && ctrlB?.isPinned) return 1

        // Custom order rank next
        if (ctrlA?.order !== undefined && ctrlB?.order !== undefined) return ctrlA.order - ctrlB.order
        if (ctrlA?.order !== undefined) return -1
        if (ctrlB?.order !== undefined) return 1

        return (b.views || 0) - (a.views || 0)
      })
    } else {
      result.sort((a, b) => a.title.localeCompare(b.title))
    }

    return result
  }, [visibleMangaList, search, selectedGenre, sortBy, config.mangaControls])

  const pageSize = config.pageSize || 20
  const totalPages = Math.max(1, Math.ceil(filteredAndSorted.length / pageSize))
  const paginated = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredAndSorted.slice(start, start + pageSize)
  }, [filteredAndSorted, currentPage, pageSize])

  const clearSearch = () => {
    setSearch("")
    setCurrentPage(1)
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-[#090b11] text-[#0f172a] dark:text-[#f1f5f9] font-sans flex flex-col transition-colors duration-200">
      
      {/* ── Fixed Frosted Header ── */}
      <header className="fixed top-0 left-0 right-0 z-50 h-16 bg-white/80 dark:bg-[#090b11]/80 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800 shadow-sm transition-colors duration-200">
        <nav className="flex items-center justify-between h-full max-w-[1536px] mx-auto px-6 gap-4" aria-label="Main navigation">
          {/* Left Side: Logo */}
          <div className="flex items-center gap-8">
            <Link to="/" className="flex items-center gap-2.5 font-sans text-xl font-black tracking-tight text-slate-900 dark:text-white">
              <span className="p-1.5 bg-emerald-500 rounded-xl text-white">
                <BookOpen size={20} />
              </span>
              <span>{config.brandName || "MangaReadHub"}</span>
            </Link>
            <div className="hidden md:flex items-center gap-6 text-sm font-semibold text-slate-600 dark:text-slate-300">
              <Link to="/" className="text-emerald-500">Home</Link>
              <a href="#mangaGrid" className="hover:text-emerald-500 transition-colors">Popular Manga</a>
            </div>
          </div>

          {/* Right Side: Quick controls */}
          <div className="flex items-center gap-3">
            <button
              onClick={toggleTheme}
              className="w-10 h-10 rounded-xl flex items-center justify-center border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:text-emerald-500 dark:hover:text-emerald-400 shadow-sm transition-all"
              title={theme === "dark" ? "Light Mode" : "Dark Mode"}
              aria-label="Toggle Theme"
            >
              {theme === "dark" ? <Sun size={18} className="text-amber-400" /> : <Moon size={18} />}
            </button>

            <button
              onClick={() => setMobileSearchOpen(prev => !prev)}
              className="w-10 h-10 rounded-xl flex items-center justify-center border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:text-emerald-500 md:hidden transition-all"
              aria-label="Toggle Search"
            >
              <Search size={18} />
            </button>

            <button
              onClick={() => setMobileMenuOpen(prev => !prev)}
              className="w-10 h-10 rounded-xl flex items-center justify-center border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:text-emerald-500 md:hidden transition-all"
              aria-label="Toggle Menu"
            >
              {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </nav>

        {/* Mobile Search Input Overlay */}
        {mobileSearchOpen && (
          <div className="px-6 py-3 bg-white dark:bg-[#090b11] border-b border-slate-200 dark:border-slate-800 md:hidden">
            <div className="relative w-full">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="search"
                value={search}
                onChange={e => {
                  setSearch(e.target.value)
                  setCurrentPage(1)
                }}
                placeholder="Search series..."
                className="w-full pl-9 pr-8 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-sm text-slate-900 dark:text-white outline-none focus:border-emerald-500"
              />
              {search && (
                <button onClick={clearSearch} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-emerald-500">
                  <X size={15} />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Mobile Navbar Options */}
        {mobileMenuOpen && (
          <div className="px-6 py-4 bg-white dark:bg-[#090b11] border-b border-slate-200 dark:border-slate-800 space-y-2.5 md:hidden shadow-lg">
            <Link onClick={() => setMobileMenuOpen(false)} to="/" className="block py-2 font-bold text-emerald-500">
              Home
            </Link>
            <a onClick={() => setMobileMenuOpen(false)} href="#mangaGrid" className="block py-2 text-slate-600 dark:text-slate-300 hover:text-emerald-500 font-semibold">
              Popular Manga
            </a>
          </div>
        )}
      </header>

      {/* ── Main Dashboard Layout ── */}
      <main className="flex-1 max-w-[1536px] w-full mx-auto px-6 md:px-8 pt-24 pb-16 space-y-8">
        
        {/* Top Header Banner Ad Placement */}
        {config.adTopEnabled && config.adTopCode && (
          <div 
            className="w-full mx-auto max-w-4xl overflow-hidden mb-6 flex justify-center" 
            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(config.adTopCode) }} 
          />
        )}

        <div className="grid lg:grid-cols-4 gap-8 items-start">
          
          {/* LEFT COLUMN: Main content area (takes 3 cols on desktop) */}
          <div className="lg:col-span-3 space-y-10">
            
            {/* 2. Spotlight Hero Section (Manga Of the Week Showcase) */}
            {spotlightManga && (
              <section className="relative rounded-3xl border border-slate-200 dark:border-slate-800 bg-gradient-to-r from-slate-900 via-slate-900/90 to-transparent overflow-hidden shadow-lg group">
                {/* Background cover image blurred */}
                <div className="absolute inset-0 z-0 opacity-40 mix-blend-multiply blur-sm">
                  <img src={spotlightManga.cover_url || defaultHeroImage} alt="" className="w-full h-full object-cover object-center" />
                </div>
                <div className="absolute inset-0 bg-gradient-to-t sm:bg-gradient-to-r from-slate-950 via-slate-950/80 to-transparent z-0"></div>

                <div className="relative z-10 p-8 sm:p-12 md:max-w-3xl space-y-6 flex flex-col justify-center min-h-[360px]">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-amber-500 text-slate-950 text-xs font-black uppercase tracking-widest shadow-md">
                      <Flame size={12} /> {config.mangaControls?.[spotlightManga.id]?.badge || (config.mangaControls?.[spotlightManga.slug]?.badge) || "Hot Choice"}
                    </span>
                    {spotlightManga.genres?.map((g: string) => (
                      <span key={g} className="px-2.5 py-0.5 rounded-lg bg-white/10 backdrop-blur-sm text-xs font-bold text-white border border-white/10">
                        {g}
                      </span>
                    ))}
                  </div>

                  <div className="space-y-2">
                    <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-none">
                      {spotlightManga.title}
                    </h2>
                    <p className="text-sm sm:text-base text-slate-300 leading-relaxed line-clamp-2 sm:line-clamp-3">
                      Read the absolute latest chapters of {spotlightManga.title} online with high resolution scan pages. Fully optimized reader controls updated in near-realtime.
                    </p>
                  </div>

                  <div className="flex items-center gap-6 text-xs text-slate-300">
                    <span className="flex items-center gap-1.5">
                      <Star size={14} className="text-amber-400 fill-amber-400" /> <b>4.9</b> / 5.0 Rating
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Eye size={14} className="text-emerald-400" /> <b>{(spotlightManga.views || 0).toLocaleString()}</b> Global Views
                    </span>
                  </div>

                  <div className="pt-2">
                    <Link
                      to={`/site/${spotlightManga.slug}`}
                      className="inline-flex items-center gap-2 px-6 py-3.5 bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white font-black text-sm rounded-2xl shadow-lg transition-all transform hover:-translate-y-0.5"
                    >
                      📖 Start Reading Now
                      <ArrowRight size={16} />
                    </Link>
                  </div>
                </div>
              </section>
            )}

            {/* 3. Title Section & Filter Actions Controls */}
            <section className="space-y-6">
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
                <div>
                  <span className="text-xs font-bold tracking-[0.25em] text-emerald-500 uppercase block mb-1.5">
                    Manga Database Explorer
                  </span>
                  <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
                    Explore Manga Directory
                  </h2>
                </div>

                {/* Sorting trigger and search integration */}
                <div className="flex flex-wrap items-center gap-3">
                  {/* Search input field */}
                  <div className="relative w-full sm:w-64">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    <input
                      type="search"
                      value={search}
                      onChange={e => {
                        setSearch(e.target.value)
                        setCurrentPage(1)
                      }}
                      placeholder="Filter by name..."
                      className="w-full pl-9 pr-8 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white outline-none focus:border-emerald-500 shadow-sm transition"
                    />
                    {search && (
                      <button onClick={clearSearch} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-emerald-500">
                        <X size={15} />
                      </button>
                    )}
                  </div>

                  {/* Sorting option trigger */}
                  <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 shadow-sm text-xs font-bold">
                    <ArrowUpDown size={13} className="text-slate-400" />
                    <span className="text-slate-500 mr-1">Sort:</span>
                    <button
                      onClick={() => setSortBy("views")}
                      className={`px-2 py-0.5 rounded ${sortBy === "views" ? "bg-emerald-500/10 text-emerald-500" : "text-slate-600 dark:text-slate-300"}`}
                    >
                      Views
                    </button>
                    <button
                      onClick={() => setSortBy("title")}
                      className={`px-2 py-0.5 rounded ${sortBy === "title" ? "bg-emerald-500/10 text-emerald-500" : "text-slate-600 dark:text-slate-300"}`}
                    >
                      A-Z
                    </button>
                  </div>
                </div>
              </div>

              {/* Genre Filters Scrollable Carousel */}
              <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
                {availableGenres.map(g => (
                  <button
                    key={g}
                    onClick={() => {
                      setSelectedGenre(g)
                      setCurrentPage(1)
                    }}
                    className={`whitespace-nowrap px-4 py-2 rounded-xl text-xs font-bold border transition-all ${
                      selectedGenre === g
                        ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-900 dark:border-white shadow"
                        : "bg-white dark:bg-[#0f121d] text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700"
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </section>

            {/* 4. Directory Manga Grid */}
            <section
              id="mangaGrid"
              className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-5 min-h-[400px]"
            >
              {paginated.map((item, idx) => (
                <Link
                  key={item.id}
                  to={`/site/${item.slug}`}
                  className="group flex flex-col bg-white dark:bg-[#0f121d] rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-xl hover:border-emerald-500/30 transition-all duration-300 transform hover:-translate-y-1"
                >
                  {/* Cover Aspect Ratio 2/3 */}
                  <div className="relative w-full aspect-[2/3] bg-slate-100 dark:bg-slate-900 overflow-hidden">
                    <img
                      src={item.cover_url || defaultHeroImage}
                      alt={`Read ${item.title} manga online free`}
                      title={`Read ${item.title} manga online free`}
                      width="225"
                      height="337"
                      loading={idx < 5 ? "eager" : "lazy"}
                      decoding="async"
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />

                    {/* Popularity / Custom Admin Badge */}
                    {(() => {
                      const ctrl = config.mangaControls?.[item.id] || config.mangaControls?.[item.slug]
                      if (ctrl?.badge) {
                        return (
                          <span className="absolute top-2.5 left-2.5 inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-500 text-slate-950 text-[10px] font-black tracking-wider uppercase shadow-md border border-amber-400 z-10">
                            <Flame size={10} className="fill-slate-950" /> {ctrl.badge}
                          </span>
                        )
                      }
                      if (ctrl?.isPinned) {
                        return (
                          <span className="absolute top-2.5 left-2.5 inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-600 text-white text-[10px] font-black tracking-wider uppercase shadow-md border border-emerald-500 z-10">
                            📌 Pinned
                          </span>
                        )
                      }
                      if (idx < 3 && selectedGenre === "All" && sortBy === "views") {
                        return (
                          <span className="absolute top-2.5 left-2.5 inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-900/90 text-white text-[10px] font-black tracking-wider uppercase backdrop-blur-sm shadow border border-white/10 z-10">
                            🏆 Top {idx + 1}
                          </span>
                        )
                      }
                      return null
                    })()}

                    {/* Hover Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-end p-4">
                      <span className="text-white text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5">
                        Read Now <ArrowRight size={13} />
                      </span>
                    </div>
                  </div>

                  {/* Card Meta Content */}
                  <div className="p-4 flex flex-col gap-2 flex-1 justify-between">
                    <div className="space-y-1">
                      <h3 className="font-sans font-bold text-sm text-slate-900 dark:text-white line-clamp-1 group-hover:text-emerald-500 transition-colors">
                        {item.title}
                      </h3>
                      <div className="flex flex-wrap gap-1">
                        {item.genres?.slice(0, 2).map((g: string) => (
                          <span key={g} className="text-[10px] font-medium text-slate-400 dark:text-slate-500">
                            #{g}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800/80 text-[11px] text-slate-400 mt-auto">
                      <span className="flex items-center gap-1">
                        <Eye size={12} /> {(item.views || 0).toLocaleString()}
                      </span>
                      <span className="font-semibold text-emerald-500">Read Online</span>
                    </div>
                  </div>
                </Link>
              ))}
            </section>

            {/* No Results Found block */}
            {filteredAndSorted.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 gap-3 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-3xl bg-white dark:bg-[#0f121d]">
                <BookOpen size={48} className="text-slate-300 dark:text-slate-700 mb-2" />
                <p className="text-slate-900 dark:text-white font-bold text-lg">No manga found</p>
                <small className="text-slate-400 text-sm">Try a different search term or genre filter</small>
                <button
                  onClick={() => {
                    clearSearch()
                    setSelectedGenre("All")
                  }}
                  className="mt-2 px-6 py-2.5 rounded-full bg-emerald-500 text-white text-xs font-bold shadow-md hover:bg-emerald-600 transition"
                >
                  Reset Search & Filters
                </button>
              </div>
            )}

            {/* 5. Pagination Controls */}
            {totalPages > 1 && (
              <div id="pagination" className="mt-12 flex justify-center items-center gap-3">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0f121d] text-slate-700 dark:text-slate-300 text-sm font-semibold disabled:opacity-35 disabled:cursor-not-allowed hover:border-emerald-500 hover:text-emerald-500 transition-colors shadow-sm"
                >
                  ← Previous
                </button>
                <span className="text-sm text-slate-400 font-semibold px-2">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0f121d] text-slate-700 dark:text-slate-300 text-sm font-semibold disabled:opacity-35 disabled:cursor-not-allowed hover:border-emerald-500 hover:text-emerald-500 transition-colors shadow-sm"
                >
                  Next →
                </button>
              </div>
            )}

            {/* 6. Professional SEO & Network Guide Section */}
            {config.seoEnabled && (
              <section className="seo-text mt-16 pt-12 border-t border-slate-200 dark:border-slate-800 space-y-4">
                <div className="space-y-4">
                  <h2 className="text-2xl font-black text-slate-900 dark:text-white leading-tight">
                    {config.seoTitle || "Read Manga Online Free on MangaReadHub"}
                  </h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                    {config.seoDescription || "Welcome to MangaReadHub, your home for the best manga reading experience online. Explore hundreds of series across action, adventure, fantasy, romance, comedy, and horror."}
                  </p>
                  <h3 className="font-sans text-lg font-bold text-slate-900 dark:text-white pt-2">
                    Why Choose MangaReadHub?
                  </h3>
                  <ul className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed list-disc pl-5 space-y-1.5">
                    <li>High-resolution scans and reader-optimized page rendering</li>
                    <li>Daily releases updated simultaneously across independent editions</li>
                    <li>Clean, distraction-free responsive interface with full dark mode support</li>
                    <li>No registration required to read all chapters online</li>
                  </ul>
                </div>
              </section>
            )}
          </div>

          {/* RIGHT COLUMN: Sticky Sidebar with Custom Ad Placements */}
          <aside className="lg:col-span-1 space-y-8 w-full">
            <div className="lg:sticky lg:top-20 space-y-6">
              
              {/* Sidebar Ad Placement 1 */}
              {config.adSidebarEnabled && config.adSidebarCode && (
                <div 
                  className="w-full overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm"
                  dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(config.adSidebarCode) }}
                />
              )}

              {/* Sidebar Trending Manga widget */}
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0f121d] p-5 shadow-sm space-y-4">
                <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-850">
                  <Flame size={16} className="text-amber-500" />
                  Trending Series
                </h3>
                <div className="space-y-3">
                  {mangaList.slice(0, 5).map((m, index) => (
                    <Link key={m.id} to={`/site/${m.slug}`} className="flex items-center gap-3 group">
                      <span className="font-mono font-black text-slate-300 dark:text-slate-700 text-sm w-4 text-center">
                        #{index + 1}
                      </span>
                      <img src={m.cover_url || defaultHeroImage} alt="" className="w-10 h-14 object-cover rounded border border-slate-200 dark:border-slate-800 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate group-hover:text-emerald-500 transition-colors">
                          {m.title}
                        </h4>
                        <span className="text-[10px] text-slate-400 font-semibold">{(m.views || 0).toLocaleString()} views</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>

              {/* Sidebar Ad Placement 2 */}
              {config.adSidebarBottomEnabled && config.adSidebarBottomCode && (
                <div 
                  className="w-full overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm"
                  dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(config.adSidebarBottomCode) }}
                />
              )}

            </div>
          </aside>

        </div>
      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-[#06080d] mt-16 transition-colors duration-200">
        <div className="max-w-[1536px] mx-auto px-6 py-12 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
          {/* Brand */}
          <div className="space-y-3">
            <div className="font-sans text-lg font-black text-slate-950 dark:text-white">
              {config.brandName || "MangaReadHub"}
            </div>
            <p className="text-xs text-slate-400 leading-relaxed max-w-sm">
              Read manga online free at {config.brandName || "MangaReadHub"}. Discover top series updated daily with high speed performance.
            </p>
          </div>

          {/* Series Links */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3.5">Popular Series</h3>
            <div className="space-y-2 text-sm text-slate-500 dark:text-slate-400">
              {(config.popularFooterLinks || defaultHomepageConfig.popularFooterLinks).map(link => (
                <Link key={link.slug} to={`/site/${link.slug}`} className="block hover:text-emerald-500 transition-colors">
                  {link.title}
                </Link>
              ))}
            </div>
          </div>

          {/* Legal Pages */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3.5">Legal & General</h3>
            <div className="space-y-2 text-sm text-slate-500 dark:text-slate-400">
              <Link to="/privacy" className="block hover:text-emerald-500 transition-colors">Privacy Policy</Link>
              <Link to="/terms" className="block hover:text-emerald-500 transition-colors">Terms of Service</Link>
              <Link to="/dmca" className="block hover:text-emerald-500 transition-colors">DMCA Policy</Link>
              <Link to="/cookies" className="block hover:text-emerald-500 transition-colors">Cookie Policy</Link>
              <Link to="/contact" className="block hover:text-emerald-500 transition-colors">Contact Us</Link>
            </div>
          </div>
        </div>

        {/* Copy bar */}
        <div className="border-t border-slate-200 dark:border-slate-800/60 py-5 px-6 max-w-[1536px] mx-auto text-center text-[10px] text-slate-400 font-semibold tracking-widest uppercase">
          © {new Date().getFullYear()} {config.brandName || "MangaReadHub"}. All rights reserved.
        </div>
      </footer>
    </div>
  )
}
