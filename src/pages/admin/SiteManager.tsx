import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react"
import {
  Activity,
  Archive,
  BookOpen,
  Check,
  ChevronDown,
  ExternalLink,
  Globe2,
  Pencil,
  Plus,
  Search,
  Star,
  X,
  Grid,
  TableProperties,
  ArrowUpDown,
  Layers,
  Megaphone,
  ShoppingBag,
  Sparkles,
  Trash2,
  Eye,
  ShieldCheck,
  Palette,
  Code,
  RefreshCw,
  FileText,
} from "lucide-react"
import { supabase } from "@/lib/mangahub-db"
import { projects, type Project, type Chapter, type ShopProduct } from "@/lib/api"

type Site = {
  id: string
  name: string
  slug: string
  subdomain: string
  description: string
  status: "draft" | "active" | "archived"
  language: string
  logo_url: string | null
  favicon_url: string | null
  banner_url: string | null
  theme: Record<string, unknown>
  created_at: string
}

interface ChapterItem {
  id?: string
  title: string
  slug: string
  chapter_number: number
  images: string[]
}

interface FullSiteForm {
  // 1. Site Info
  name: string
  slug: string
  subdomain: string
  description: string
  status: Site["status"]
  language: string
  logo_url: string
  favicon_url: string
  banner_url: string
  keyword: string

  // 2. Manga Info
  manga_title: string
  manga_slug: string
  manga_cover: string
  manga_banner: string
  manga_summary: string
  manga_tags: string
  manga_status: string
  manga_author: string
  manga_artist: string

  // 3. Chapters
  chapters: ChapterItem[]

  // 4. Design & Theme
  theme_color: string
  theme_mode: "dark" | "light" | "auto"

  // 5. Ads & Monetization
  ad_header_enabled: boolean
  ad_header_code: string
  ad_sidebar_enabled: boolean
  ad_sidebar_code: string
  ad_reader_enabled: boolean
  ad_reader_code: string

  // 6. Shop / Products
  shop_enabled: boolean
  shop_title: string
  shop_products: ShopProduct[]

  // 7. SEO & Content
  seo_title: string
  seo_description: string
  seo_og_image: string
  seo_robots: string
  about_html: string

  // 8. Tracking
  ga_id: string
  gtm_id: string
  custom_scripts: string
}

const emptyFullForm: FullSiteForm = {
  name: "",
  slug: "",
  subdomain: "",
  description: "",
  status: "draft",
  language: "fr",
  logo_url: "",
  favicon_url: "",
  banner_url: "",
  keyword: "",
  manga_title: "",
  manga_slug: "",
  manga_cover: "",
  manga_banner: "",
  manga_summary: "",
  manga_tags: "Action, Shonen, Aventure",
  manga_status: "ongoing",
  manga_author: "",
  manga_artist: "",
  chapters: [],
  theme_color: "#006769",
  theme_mode: "dark",
  ad_header_enabled: false,
  ad_header_code: "",
  ad_sidebar_enabled: false,
  ad_sidebar_code: "",
  ad_reader_enabled: false,
  ad_reader_code: "",
  shop_enabled: false,
  shop_title: "Boutique Officielle",
  shop_products: [],
  seo_title: "",
  seo_description: "",
  seo_og_image: "",
  seo_robots: "index, follow",
  about_html: "",
  ga_id: "",
  gtm_id: "",
  custom_scripts: "",
}

const reserved = new Set(["www", "admin", "api", "app", "mail", "ftp", "cdn", "assets", "static", "support", "help", "blog", "status", "readhub"])
const slugify = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")

export default function SiteManager({ onManageSite }: { onManageSite: (siteId: string) => void }) {
  const [sites, setSites] = useState<Site[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState("")
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState<Site | null>(null)
  const [form, setForm] = useState<FullSiteForm>(emptyFullForm)
  const [activeTab, setActiveTab] = useState<"site" | "manga" | "chapters" | "design" | "ads" | "seo" | "tracking">("site")
  const [loadingDetails, setLoadingDetails] = useState(false)
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")
  const [busy, setBusy] = useState(false)

  // Custom Display & Sort configurations
  const [viewMode, setViewMode] = useState<"cards" | "table">("table")
  const [sortBy, setSortBy] = useState<"name" | "subdomain" | "status" | "created_at">("created_at")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")

  // Chapter editing helpers
  const [newChTitle, setNewChTitle] = useState("")
  const [newChNumber, setNewChNumber] = useState<number>(1)
  const [newChImagesText, setNewChImagesText] = useState("")
  const [editingChIndex, setEditingChIndex] = useState<number | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    const { data, error: readError } = await supabase
      .from("manga_sites")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500)

    if (readError) {
      setError("Impossible de charger les sites. Vérifiez votre accès administrateur.")
    } else {
      setSites((data ?? []) as Site[])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  // Sorting & Filtering logic
  const filteredAndSorted = useMemo(() => {
    const searchFiltered = sites.filter(site =>
      `${site.name} ${site.subdomain} ${site.status} ${site.language}`.toLowerCase().includes(query.toLowerCase())
    )

    return [...searchFiltered].sort((a, b) => {
      let valA = a[sortBy] || ""
      let valB = b[sortBy] || ""

      if (typeof valA === "string") valA = valA.toLowerCase()
      if (typeof valB === "string") valB = valB.toLowerCase()

      if (valA < valB) return sortOrder === "asc" ? -1 : 1
      if (valA > valB) return sortOrder === "asc" ? 1 : -1
      return 0
    })
  }, [sites, query, sortBy, sortOrder])

  const toggleSort = (field: typeof sortBy) => {
    if (sortBy === field) {
      setSortOrder(prev => (prev === "asc" ? "desc" : "asc"))
    } else {
      setSortBy(field)
      setSortOrder("asc")
    }
  }

  const openCreate = () => {
    setEditing(null)
    setForm(emptyFullForm)
    setActiveTab("site")
    setError("")
    setModal(true)
  }

  // Open Full Site Editor: Loads all data like the Wizard
  const openEdit = async (site: Site) => {
    setEditing(site)
    setActiveTab("site")
    setError("")
    setModal(true)
    setLoadingDetails(true)

    let initialForm: FullSiteForm = {
      name: site.name,
      slug: site.slug,
      subdomain: site.subdomain,
      description: site.description || "",
      status: site.status,
      language: site.language || "fr",
      logo_url: site.logo_url ?? "",
      favicon_url: site.favicon_url ?? "",
      banner_url: site.banner_url ?? "",
      keyword: (site.theme as any)?.keyword || "",
      manga_title: site.name,
      manga_slug: site.slug,
      manga_cover: site.logo_url ?? "",
      manga_banner: site.banner_url ?? "",
      manga_summary: site.description || "",
      manga_tags: "Action, Shonen, Aventure",
      manga_status: "ongoing",
      manga_author: "",
      manga_artist: "",
      chapters: [],
      theme_color: (site.theme as any)?.primaryColor || "#006769",
      theme_mode: (site.theme as any)?.mode || "dark",
      ad_header_enabled: false,
      ad_header_code: "",
      ad_sidebar_enabled: false,
      ad_sidebar_code: "",
      ad_reader_enabled: false,
      ad_reader_code: "",
      shop_enabled: false,
      shop_title: "Boutique Officielle",
      shop_products: [],
      seo_title: `Lire ${site.name} Scan VF en Ligne`,
      seo_description: site.description || `Retrouvez tous les chapitres de ${site.name} en haute qualité.`,
      seo_og_image: site.logo_url ?? "",
      seo_robots: "index, follow",
      about_html: `<p>${site.description || `Bienvenue sur le portail de lecture ${site.name}.`}</p>`,
      ga_id: "",
      gtm_id: "",
      custom_scripts: "",
    }

    try {
      // 1. Try loading matching project from Wizard API
      const proj = await projects.get(site.id).catch(() => null) || await projects.get(site.slug).catch(() => null)
      if (proj && proj.siteData) {
        const sd = proj.siteData
        const firstManga = sd.manga?.[0]
        initialForm = {
          ...initialForm,
          name: sd.site_name || site.name,
          keyword: sd.keyword || initialForm.keyword,
          description: sd.config?.description || site.description,
          manga_title: firstManga?.title || initialForm.manga_title,
          manga_slug: firstManga?.slug || initialForm.manga_slug,
          manga_cover: firstManga?.cover || initialForm.manga_cover,
          manga_banner: firstManga?.banner || initialForm.manga_banner,
          manga_summary: firstManga?.summary || initialForm.manga_summary,
          manga_tags: Array.isArray(firstManga?.tags) ? firstManga.tags.join(', ') : initialForm.manga_tags,
          chapters: (firstManga?.chapters || []).map((c, i) => ({
            title: c.title || `Chapitre ${i + 1}`,
            slug: c.slug || `chapter-${i + 1}`,
            chapter_number: c.chapter_number || (i + 1),
            images: c.images || []
          })),
          about_html: sd.config?.about_html || initialForm.about_html,
          seo_title: sd.config?.seo?.author ? `${sd.site_name} par ${sd.config.seo.author}` : initialForm.seo_title,
          seo_og_image: sd.config?.seo?.og_image || initialForm.seo_og_image,
          seo_robots: sd.config?.seo?.robots || initialForm.seo_robots,
          ga_id: sd.config?.seo?.ga_id || "",
          gtm_id: (sd.config?.seo as any)?.gtm_id || "",
          ad_header_enabled: sd.config?.ad_banners_list?.[0]?.enabled ?? false,
          ad_header_code: sd.config?.ad_banners_list?.[0]?.html_code || sd.config?.ad_banners_list?.[0]?.link_url || "",
          ad_sidebar_enabled: sd.config?.sidebar?.ads_list?.[0]?.enabled ?? false,
          ad_sidebar_code: sd.config?.sidebar?.ads_list?.[0]?.html_code || sd.config?.sidebar?.ads_list?.[0]?.link_url || "",
          shop_enabled: sd.config?.shop?.enabled ?? false,
          shop_title: sd.config?.shop?.title || initialForm.shop_title,
          shop_products: sd.config?.shop?.products || [],
        }
      } else {
        // 2. Fallback: Query database tables directly
        const { data: mData } = await supabase.from('manga').select('*').eq('site_id', site.id).maybeSingle()
        if (mData) {
          initialForm.manga_title = mData.title || initialForm.manga_title
          initialForm.manga_slug = mData.slug || initialForm.manga_slug
          initialForm.manga_cover = mData.cover_url || initialForm.manga_cover
          initialForm.manga_banner = mData.banner_url || initialForm.manga_banner
          initialForm.manga_summary = mData.description || initialForm.manga_summary
          initialForm.manga_tags = Array.isArray(mData.genres) ? mData.genres.join(', ') : initialForm.manga_tags

          const { data: chData } = await supabase.from('chapters').select('*').eq('manga_id', mData.id).order('chapter_number', { ascending: true })
          if (chData && chData.length > 0) {
            const chIds = chData.map((c: any) => c.id)
            const { data: imgData } = await supabase.from('chapter_images').select('chapter_id, image_url, sort_order').in('chapter_id', chIds).order('sort_order', { ascending: true })

            initialForm.chapters = chData.map((c: any) => ({
              id: c.id,
              title: c.title,
              slug: c.slug,
              chapter_number: c.chapter_number,
              images: (imgData || []).filter((img: any) => img.chapter_id === c.id).map((img: any) => img.image_url)
            }))
          }
        }
      }
    } catch (e) {
      console.warn('Could not load extra site details:', e)
    } finally {
      setForm(initialForm)
      setNewChNumber(initialForm.chapters.length + 1)
      setNewChTitle(`Chapitre ${initialForm.chapters.length + 1}`)
      setLoadingDetails(false)
    }
  }

  // Save all site data (Syncs to manga_sites, projects, manga, chapters, chapter_images, and PostgreSQL)
  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setError("")
    const slug = slugify(form.slug || form.name)
    const subdomain = slugify(form.subdomain || form.name)

    if (!form.name.trim() || !slug || !subdomain) {
      setError("Ajoutez un nom et un identifiant valides.")
      return
    }
    if (reserved.has(subdomain)) {
      setError("Ce sous-domaine est réservé.")
      return
    }

    setBusy(true)

    try {
      // 1. Update / Create manga_sites
      const sitePayload = {
        name: form.name.trim(),
        slug,
        subdomain,
        description: form.description.trim(),
        status: form.status,
        language: form.language,
        logo_url: form.logo_url.trim() || form.manga_cover || null,
        favicon_url: form.favicon_url.trim() || null,
        banner_url: form.banner_url.trim() || form.manga_banner || null,
        theme: {
          primaryColor: form.theme_color,
          mode: form.theme_mode,
          keyword: form.keyword,
        }
      }

      const result = editing
        ? await supabase.from("manga_sites").update({ ...sitePayload, updated_at: new Date().toISOString() }).eq("id", editing.id)
        : await supabase.from("manga_sites").insert(sitePayload)

      if (result.error) {
        throw new Error(result.error.message.includes("duplicate") ? "Ce nom, slug ou sous-domaine est déjà utilisé." : result.error.message)
      }

      const siteId = editing?.id || slug

      // 2. Construct matching Project representation (like the Wizard creates)
      const projectPayload: Partial<Project> = {
        id: siteId,
        site_name: form.name.trim(),
        slug,
        keyword: form.keyword || form.manga_tags,
        language: form.language,
        status: form.status,
        siteData: {
          site_name: form.name.trim(),
          keyword: form.keyword || form.manga_tags,
          language: form.language,
          baseUrl: '',
          manga: [
            {
              title: form.manga_title || form.name.trim(),
              slug: form.manga_slug || slug,
              cover: form.manga_cover || form.logo_url,
              banner: form.manga_banner || form.banner_url || form.manga_cover,
              summary: form.manga_summary || form.description,
              tags: form.manga_tags.split(',').map(t => t.trim()).filter(Boolean),
              chapters: form.chapters.map(c => ({
                title: c.title,
                slug: c.slug,
                chapter_number: c.chapter_number,
                images: c.images || []
              }))
            }
          ],
          config: {
            description: form.description || form.manga_summary,
            about_html: form.about_html || `<p>${form.description}</p>`,
            nav: { links: [{ label: 'Accueil', url: '/' }, { label: 'Catalogue', url: '/#catalog' }] },
            footer: {
              about: form.description,
              copyright: `© ${new Date().getFullYear()} ${form.name}. Tous droits réservés.`,
              legal: {
                privacy_link: '/privacy',
                tos_link: '/terms',
                dmca_link: '/dmca',
                cookie_link: '/cookies',
                contact_link: '/contact'
              }
            },
            ad_banners_list: form.ad_header_enabled ? [{
              enabled: true,
              mode: form.ad_header_code.startsWith('<') ? 'html' : 'link',
              html_code: form.ad_header_code,
              link_url: form.ad_header_code
            }] : [],
            ad_after_chapters_list: form.ad_reader_enabled ? [{
              enabled: true,
              mode: form.ad_reader_code.startsWith('<') ? 'html' : 'link',
              html_code: form.ad_reader_code,
              link_url: form.ad_reader_code
            }] : [],
            sidebar: {
              ads_list: form.ad_sidebar_enabled ? [{
                enabled: true,
                mode: form.ad_sidebar_code.startsWith('<') ? 'html' : 'link',
                html_code: form.ad_sidebar_code,
                link_url: form.ad_sidebar_code
              }] : [],
              stats: {
                enabled: true,
                rank: '#1',
                readers: '15.4K',
                rating: '4.9/5'
              }
            },
            shop: {
              enabled: form.shop_enabled,
              title: form.shop_title || 'Boutique Officielle',
              button_text: 'Acheter',
              button_link: '#',
              products: form.shop_products || []
            },
            seo: {
              author: form.manga_author || form.name,
              robots: form.seo_robots || 'index, follow',
              og_image: form.seo_og_image || form.manga_cover || form.logo_url,
              twitter_card: 'summary_large_image',
              favicon_ico: form.favicon_url,
              favicon_32: form.favicon_url,
              favicon_16: form.favicon_url,
              apple_touch: form.logo_url,
              manifest: '',
              google_verify: '',
              bing_verify: '',
              yandex_verify: '',
              ga_id: form.ga_id,
              clarity_id: form.gtm_id,
              faq: [],
            }
          }
        }
      }

      // Sync via Project API (updates projects, manga, chapters, chapter_images, and PostgreSQL)
      await projects.update(siteId, projectPayload).catch(async () => {
        await projects.create(projectPayload)
      })

      setModal(false)
      setNotice(editing ? "Le site et toutes ses données (manga, chapitres, design, SEO) ont été mis à jour avec succès !" : "Le site manga a été créé avec succès !")
      window.setTimeout(() => setNotice(""), 4000)
      await refresh()
    } catch (err: any) {
      setError(err.message || "Erreur lors de l'enregistrement.")
    } finally {
      setBusy(false)
    }
  }

  const duplicate = async (site: Site) => {
    const suffix = `-${Math.random().toString(36).slice(2, 6)}`
    const { error: copyError } = await supabase.from("manga_sites").insert({
      name: `${site.name} — copie`,
      slug: `${site.slug}${suffix}`,
      subdomain: `${site.subdomain}${suffix}`,
      description: site.description,
      status: "draft",
      language: site.language,
      theme: site.theme,
      logo_url: site.logo_url,
      favicon_url: site.favicon_url,
      banner_url: site.banner_url
    })
    setNotice(copyError ? "Impossible de dupliquer ce site." : "Une copie brouillon a été créée.")
    window.setTimeout(() => setNotice(""), 3200)
    if (!copyError) void refresh()
  }

  // Chapter helpers
  const handleSaveChapter = () => {
    const imgs = newChImagesText
      .split('\n')
      .map(s => s.trim())
      .filter(s => s.startsWith('http://') || s.startsWith('https://') || s.startsWith('/'))

    const chItem: ChapterItem = {
      title: newChTitle || `Chapitre ${newChNumber}`,
      slug: slugify(newChTitle || `chapter-${newChNumber}`),
      chapter_number: newChNumber,
      images: imgs,
    }

    if (editingChIndex !== null && editingChIndex >= 0) {
      const updated = [...form.chapters]
      updated[editingChIndex] = chItem
      setForm({ ...form, chapters: updated })
      setEditingChIndex(null)
    } else {
      setForm({ ...form, chapters: [...form.chapters, chItem] })
    }

    // Reset chapter form
    setNewChTitle(`Chapitre ${form.chapters.length + 2}`)
    setNewChNumber(form.chapters.length + 2)
    setNewChImagesText("")
  }

  const handleEditChapter = (index: number) => {
    const ch = form.chapters[index]
    if (!ch) return
    setEditingChIndex(index)
    setNewChTitle(ch.title)
    setNewChNumber(ch.chapter_number)
    setNewChImagesText((ch.images || []).join('\n'))
  }

  const handleDeleteChapter = (index: number) => {
    setForm({ ...form, chapters: form.chapters.filter((_, i) => i !== index) })
    if (editingChIndex === index) {
      setEditingChIndex(null)
      setNewChImagesText("")
    }
  }

  return (
    <section className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[.18em] text-muted-foreground">Gestion du réseau</p>
          <h2 className="mt-2 text-3xl font-headline font-black">Vos sites manga</h2>
          <p className="mt-2 text-sm text-muted-foreground">Chaque édition possède son identifiant, son manga, ses chapitres, son SEO et ses visuels.</p>
        </div>
        <div className="flex items-center gap-2.5">
          <a href="/create" className="flex items-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition">
            <Plus size={16} /> Wizard 8 Étapes
          </a>
          <button onClick={openCreate} className="flex items-center gap-2 rounded-lg border border-border hover:bg-muted bg-card px-4 py-2.5 text-sm font-semibold shadow-sm">
            <Plus size={16} /> Nouveau site rapide
          </button>
        </div>
      </div>

      {notice && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm font-medium flex items-center gap-2">
          <Check size={16} />
          <span>{notice}</span>
        </div>
      )}

      {/* Filter and View toggles */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Rechercher par nom, sous-domaine, langue..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="w-full h-10 pl-9 pr-3 rounded-lg border border-border bg-card text-xs outline-none focus:border-primary"
          />
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <div className="flex items-center bg-muted/60 p-1 rounded-lg border border-border/60">
            <button
              onClick={() => setViewMode("cards")}
              className={`p-1.5 rounded-md transition ${viewMode === "cards" ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:text-foreground"}`}
              title="Affichage en cartes listes"
            >
              <Grid size={15} />
            </button>
            <button
              onClick={() => setViewMode("table")}
              className={`p-1.5 rounded-md transition ${viewMode === "table" ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:text-foreground"}`}
              title="Affichage en tableau complet"
            >
              <TableProperties size={15} />
            </button>
          </div>
        </div>
      </div>

      {/* Content Rendering Layout */}
      {loading ? (
        <p className="py-12 text-center text-sm text-muted-foreground">Chargement des sites…</p>
      ) : filteredAndSorted.length === 0 ? (
        <div className="py-14 text-center border border-dashed border-border rounded-xl">
          <Globe2 className="mx-auto text-muted-foreground mb-3" size={24} />
          <h3 className="text-base font-bold">Aucun site trouvé</h3>
          <p className="text-xs text-muted-foreground mt-1">Créez une édition ou ajustez vos critères de recherche.</p>
        </div>
      ) : viewMode === "table" ? (
        /* TABLE VIEW WITH SORTABLE HEADERS */
        <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-muted/40 text-muted-foreground border-b border-border font-bold uppercase tracking-wider">
                <th className="p-3.5 cursor-pointer hover:bg-muted" onClick={() => toggleSort("name")}>
                  <span className="flex items-center gap-1.5">
                    Nom du site <ArrowUpDown size={12} />
                  </span>
                </th>
                <th className="p-3.5 cursor-pointer hover:bg-muted" onClick={() => toggleSort("subdomain")}>
                  <span className="flex items-center gap-1.5">
                    Sous-domaine <ArrowUpDown size={12} />
                  </span>
                </th>
                <th className="p-3.5">Langue</th>
                <th className="p-3.5 cursor-pointer hover:bg-muted" onClick={() => toggleSort("status")}>
                  <span className="flex items-center gap-1.5">
                    Statut <ArrowUpDown size={12} />
                  </span>
                </th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-sm">
              {filteredAndSorted.map(site => (
                <tr key={site.id} className="hover:bg-muted/25 transition-colors">
                  <td className="p-3.5 flex items-center gap-3">
                    <div className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-lg border border-border bg-muted">
                      {site.logo_url ? (
                        <img src={site.logo_url} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <BookOpen size={16} className="text-muted-foreground" />
                      )}
                    </div>
                    <div>
                      <h4 className="font-bold text-foreground text-sm leading-none">{site.name}</h4>
                      <p className="text-[10px] text-muted-foreground truncate max-w-xs mt-1">
                        {site.description || "Aucune description fournie."}
                      </p>
                    </div>
                  </td>
                  <td className="p-3.5">
                    <span className="font-mono text-xs font-semibold px-2 py-1 bg-muted rounded border border-border/40">
                      {site.subdomain}.readhub.com
                    </span>
                  </td>
                  <td className="p-3.5">
                    <span className="text-[11px] font-bold tracking-wider uppercase px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-foreground">
                      {site.language || "FR"}
                    </span>
                  </td>
                  <td className="p-3.5">
                    <Status status={site.status} />
                  </td>
                  <td className="p-3.5 text-right">
                    <SiteActionDropdown
                      site={site}
                      onOpenEdit={openEdit}
                      onManageSite={onManageSite}
                      onDuplicate={siteItem => void duplicate(siteItem)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        /* CARD LIST VIEW */
        <div className="divide-y divide-border border border-border rounded-xl bg-card shadow-sm px-4">
          {filteredAndSorted.map(site => (
            <article key={site.id} className="flex flex-wrap items-center gap-4 py-4">
              <div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-lg border border-border bg-muted">
                {site.logo_url ? (
                  <img src={site.logo_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <BookOpen size={19} className="text-muted-foreground" />
                )}
              </div>
              <div className="min-w-[180px] flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-semibold text-foreground">{site.name}</h3>
                  <Status status={site.status} />
                </div>
                <p className="mt-1 text-xs text-muted-foreground font-medium">
                  {site.subdomain}.readhub.com <span className="mx-1">·</span> {site.language.toUpperCase()}
                </p>
              </div>
              <div className="flex items-center">
                <SiteActionDropdown
                  site={site}
                  onOpenEdit={openEdit}
                  onManageSite={onManageSite}
                  onDuplicate={siteItem => void duplicate(siteItem)}
                />
              </div>
            </article>
          ))}
        </div>
      )}

      {/* ── FULL SITE EDITOR MODAL (EDIT ALL DATA LIKE WIZARD) ── */}
      {modal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 backdrop-blur-sm sm:p-6"
          onMouseDown={event => { if (event.target === event.currentTarget) setModal(false) }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="site-title"
            className="max-h-[92vh] w-full max-w-5xl overflow-hidden rounded-2xl border border-border bg-card shadow-2xl flex flex-col"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-border p-5 bg-background">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2.5 py-0.5 rounded text-[10px] font-bold uppercase bg-primary/10 text-primary border border-primary/20">
                    Éditeur Complet
                  </span>
                  {editing && <span className="text-xs text-muted-foreground font-mono">ID: {editing.id}</span>}
                </div>
                <h2 id="site-title" className="text-xl font-black font-headline text-foreground">
                  {editing ? `Modifier le site : ${editing.name}` : "Créer un site manga"}
                </h2>
              </div>

              <div className="flex items-center gap-2.5">
                {editing && (
                  <a
                    href={`/create/${editing.id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-sm"
                  >
                    <ExternalLink size={13} />
                    <span>Ouvrir dans le Wizard 8 Étapes</span>
                  </a>
                )}
                <button onClick={() => setModal(false)} aria-label="Fermer" className="rounded-md p-1.5 hover:bg-muted text-muted-foreground hover:text-foreground">
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Navigation Tabs (Like the 8 Wizard steps) */}
            <div className="flex items-center gap-1 overflow-x-auto border-b border-border bg-muted/30 px-5 py-2">
              <TabButton
                active={activeTab === "site"}
                onClick={() => setActiveTab("site")}
                icon={<Globe2 size={14} />}
                label="Site & Domaine"
              />
              <TabButton
                active={activeTab === "manga"}
                onClick={() => setActiveTab("manga")}
                icon={<BookOpen size={14} />}
                label="Manga Info"
              />
              <TabButton
                active={activeTab === "chapters"}
                onClick={() => setActiveTab("chapters")}
                icon={<Layers size={14} />}
                label={`Chapitres (${form.chapters.length})`}
              />
              <TabButton
                active={activeTab === "design"}
                onClick={() => setActiveTab("design")}
                icon={<Palette size={14} />}
                label="Design & Thème"
              />
              <TabButton
                active={activeTab === "ads"}
                onClick={() => setActiveTab("ads")}
                icon={<Megaphone size={14} />}
                label="Publicités & Shop"
              />
              <TabButton
                active={activeTab === "seo"}
                onClick={() => setActiveTab("seo")}
                icon={<Search size={14} />}
                label="SEO & À propos"
              />
              <TabButton
                active={activeTab === "tracking"}
                onClick={() => setActiveTab("tracking")}
                icon={<Activity size={14} />}
                label="Analytics & Scripts"
              />
            </div>

            {/* Tab Form Body */}
            {loadingDetails ? (
              <div className="p-16 text-center text-sm text-muted-foreground flex flex-col items-center justify-center gap-3">
                <RefreshCw size={24} className="animate-spin text-primary" />
                <span>Chargement de toutes les données du site (manga, chapitres, visuels, SEO)…</span>
              </div>
            ) : (
              <form onSubmit={submit} className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* ── TAB 1: SITE & DOMAIN ── */}
                {activeTab === "site" && (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Nom du site" value={form.name} onChange={value => setForm({ ...form, name: value })} placeholder="Ex. Solo Leveling Hub" required />
                    <Field label="Slug" value={form.slug} onChange={value => setForm({ ...form, slug: value })} placeholder="Généré depuis le nom" />
                    <Field label="Sous-domaine" value={form.subdomain} onChange={value => setForm({ ...form, subdomain: value })} placeholder="solo-leveling" suffix=".readhub.com" required />
                    <label className="block text-sm font-medium">
                      Langue
                      <select value={form.language} onChange={e => setForm({ ...form, language: e.target.value })} className="mt-2 h-11 w-full rounded-lg border border-input bg-background px-3 text-sm">
                        <option value="fr">Français (FR)</option>
                        <option value="en">English (EN)</option>
                        <option value="ar">العربية (AR)</option>
                        <option value="es">Español (ES)</option>
                        <option value="ja">日本語 (JA)</option>
                      </select>
                    </label>
                    <label className="block text-sm font-medium">
                      État du site
                      <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value as FormStatus })} className="mt-2 h-11 w-full rounded-lg border border-input bg-background px-3 text-sm">
                        <option value="active">Actif (En ligne)</option>
                        <option value="draft">Brouillon (Non listé)</option>
                        <option value="archived">Archivé</option>
                      </select>
                    </label>
                    <Field label="Mots-clés principaux" value={form.keyword} onChange={value => setForm({ ...form, keyword: value })} placeholder="manga, scan vf, solo leveling" />
                    <Field label="Logo — URL" value={form.logo_url} onChange={value => setForm({ ...form, logo_url: value })} placeholder="https://…" />
                    <Field label="Favicon — URL" value={form.favicon_url} onChange={value => setForm({ ...form, favicon_url: value })} placeholder="https://…" />
                    <Field label="Bannière d'en-tête — URL" value={form.banner_url} onChange={value => setForm({ ...form, banner_url: value })} placeholder="https://…" />
                    <label className="block text-sm font-medium sm:col-span-2">
                      Description du site
                      <textarea rows={3} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="mt-2 w-full resize-y rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary" placeholder="Présentation rapide du portail et de l'édition..." />
                    </label>
                  </div>
                )}

                {/* ── TAB 2: MANGA INFO ── */}
                {activeTab === "manga" && (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Titre officiel du manga" value={form.manga_title} onChange={value => setForm({ ...form, manga_title: value })} placeholder="Solo Leveling" required />
                    <Field label="Identifiant slug manga" value={form.manga_slug} onChange={value => setForm({ ...form, manga_slug: value })} placeholder="solo-leveling" />
                    <Field label="Image de Couverture (Affiche)" value={form.manga_cover} onChange={value => setForm({ ...form, manga_cover: value })} placeholder="https://…" />
                    <Field label="Bannière Manga Hero" value={form.manga_banner} onChange={value => setForm({ ...form, manga_banner: value })} placeholder="https://…" />
                    <Field label="Auteur" value={form.manga_author} onChange={value => setForm({ ...form, manga_author: value })} placeholder="Chugong" />
                    <Field label="Artiste / Illustrateur" value={form.manga_artist} onChange={value => setForm({ ...form, manga_artist: value })} placeholder="DUBU (REDICE Studio)" />
                    <Field label="Genres & Tags (séparés par des virgules)" value={form.manga_tags} onChange={value => setForm({ ...form, manga_tags: value })} placeholder="Action, Fantasy, Shonen, Aventure" />
                    <label className="block text-sm font-medium">
                      Statut de parution
                      <select value={form.manga_status} onChange={e => setForm({ ...form, manga_status: e.target.value })} className="mt-2 h-11 w-full rounded-lg border border-input bg-background px-3 text-sm">
                        <option value="ongoing">En cours (Ongoing)</option>
                        <option value="completed">Terminé (Completed)</option>
                      </select>
                    </label>
                    <label className="block text-sm font-medium sm:col-span-2">
                      Synopsis / Résumé
                      <textarea rows={4} value={form.manga_summary} onChange={e => setForm({ ...form, manga_summary: e.target.value })} className="mt-2 w-full resize-y rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary" placeholder="Histoire captivante du manga..." />
                    </label>
                  </div>
                )}

                {/* ── TAB 3: CHAPTERS & PAGES ── */}
                {activeTab === "chapters" && (
                  <div className="space-y-6">
                    {/* Add / Edit Chapter Form Box */}
                    <div className="p-4 rounded-xl bg-background border border-border space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-bold text-foreground">
                          {editingChIndex !== null ? `Modifier le chapitre (${form.chapters[editingChIndex]?.title})` : "Ajouter un nouveau chapitre"}
                        </h4>
                        {editingChIndex !== null && (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingChIndex(null)
                              setNewChImagesText("")
                            }}
                            className="text-xs text-muted-foreground hover:text-foreground"
                          >
                            Annuler modification
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <label className="block text-xs font-semibold text-muted-foreground">
                          Titre du chapitre
                          <input
                            type="text"
                            value={newChTitle}
                            onChange={e => setNewChTitle(e.target.value)}
                            placeholder="Ex. Chapitre 1"
                            className="mt-1 h-9 w-full px-3 rounded-lg border border-border bg-card text-xs text-foreground"
                          />
                        </label>
                        <label className="block text-xs font-semibold text-muted-foreground">
                          Numéro du chapitre
                          <input
                            type="number"
                            step="any"
                            value={newChNumber}
                            onChange={e => setNewChNumber(parseFloat(e.target.value) || 1)}
                            className="mt-1 h-9 w-full px-3 rounded-lg border border-border bg-card text-xs text-foreground"
                          />
                        </label>
                      </div>

                      <label className="block text-xs font-semibold text-muted-foreground">
                        URLs des pages d'images (une URL par ligne)
                        <textarea
                          rows={4}
                          value={newChImagesText}
                          onChange={e => setNewChImagesText(e.target.value)}
                          placeholder="https://cdn.example.com/p1.webp&#10;https://cdn.example.com/p2.webp&#10;https://cdn.example.com/p3.webp"
                          className="mt-1 w-full p-2.5 rounded-lg border border-border bg-card text-xs font-mono text-foreground"
                        />
                      </label>

                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={handleSaveChapter}
                          className="px-4 py-2 rounded-lg bg-[#006769] hover:bg-[#005254] text-white text-xs font-bold transition shadow-sm flex items-center gap-1.5"
                        >
                          <Check size={14} />
                          <span>{editingChIndex !== null ? "Mettre à jour ce chapitre" : "Ajouter ce chapitre"}</span>
                        </button>
                      </div>
                    </div>

                    {/* Chapters List */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs text-muted-foreground font-semibold">
                        <span>Chapitres actuels ({form.chapters.length})</span>
                        <span>Ordre de lecture</span>
                      </div>

                      {form.chapters.length === 0 ? (
                        <div className="p-8 text-center text-xs text-muted-foreground border border-dashed border-border rounded-xl">
                          Aucun chapitre enregistré pour l'instant. Ajoutez votre premier chapitre ci-dessus !
                        </div>
                      ) : (
                        <div className="divide-y divide-border/60 border border-border rounded-xl bg-background max-h-72 overflow-y-auto">
                          {form.chapters.map((ch, idx) => (
                            <div key={idx} className="p-3 flex items-center justify-between gap-3 text-xs hover:bg-muted/30 transition">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="font-bold text-foreground">#{ch.chapter_number}</span>
                                <span className="font-medium text-foreground truncate">{ch.title}</span>
                                <span className="text-[10px] text-muted-foreground font-mono">({ch.slug})</span>
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                <span className="font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded text-[11px]">
                                  {ch.images?.length || 0} pages
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleEditChapter(idx)}
                                  className="p-1 rounded hover:bg-muted text-primary"
                                  title="Modifier les pages"
                                >
                                  <Pencil size={13} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteChapter(idx)}
                                  className="p-1 rounded hover:bg-muted text-destructive"
                                  title="Supprimer"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* ── TAB 4: DESIGN & THEME ── */}
                {activeTab === "design" && (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block text-sm font-medium">
                      Couleur principale du site
                      <div className="mt-2 flex items-center gap-3">
                        <input
                          type="color"
                          value={form.theme_color}
                          onChange={e => setForm({ ...form, theme_color: e.target.value })}
                          className="h-11 w-14 rounded-lg border border-input cursor-pointer bg-background p-1"
                        />
                        <input
                          type="text"
                          value={form.theme_color}
                          onChange={e => setForm({ ...form, theme_color: e.target.value })}
                          className="h-11 flex-1 rounded-lg border border-input bg-background px-3 text-sm font-mono"
                        />
                      </div>
                    </label>

                    <label className="block text-sm font-medium">
                      Mode du thème par défaut
                      <select value={form.theme_mode} onChange={e => setForm({ ...form, theme_mode: e.target.value as any })} className="mt-2 h-11 w-full rounded-lg border border-input bg-background px-3 text-sm">
                        <option value="dark">Sombre (Dark Mode — Recommandé)</option>
                        <option value="light">Clair (Light Mode)</option>
                        <option value="auto">Automatique (Système)</option>
                      </select>
                    </label>

                    <div className="sm:col-span-2 p-4 rounded-xl bg-background border border-border text-xs text-muted-foreground space-y-1">
                      <p className="font-bold text-foreground">Aperçu du thème :</p>
                      <p>Le thème adapte automatiquement les boutons, barres de progression et accents de couleur du lecteur de chapitres.</p>
                    </div>
                  </div>
                )}

                {/* ── TAB 5: ADS & SHOP ── */}
                {activeTab === "ads" && (
                  <div className="space-y-6">
                    {/* Header Ad */}
                    <div className="p-4 rounded-xl bg-background border border-border space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-foreground">Bannière Publicitaire d'En-tête</span>
                        <label className="flex items-center gap-2 text-xs cursor-pointer">
                          <input
                            type="checkbox"
                            checked={form.ad_header_enabled}
                            onChange={e => setForm({ ...form, ad_header_enabled: e.target.checked })}
                            className="rounded border-border text-primary h-4 w-4"
                          />
                          <span>Activer</span>
                        </label>
                      </div>
                      {form.ad_header_enabled && (
                        <textarea
                          rows={2}
                          value={form.ad_header_code}
                          onChange={e => setForm({ ...form, ad_header_code: e.target.value })}
                          placeholder="Code HTML ou URL d'affiliation pour la bannière haute..."
                          className="w-full p-2.5 rounded-lg border border-border bg-card text-xs font-mono"
                        />
                      )}
                    </div>

                    {/* Reader Ad */}
                    <div className="p-4 rounded-xl bg-background border border-border space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-foreground">Publicité Lecteur (Fin de chapitre)</span>
                        <label className="flex items-center gap-2 text-xs cursor-pointer">
                          <input
                            type="checkbox"
                            checked={form.ad_reader_enabled}
                            onChange={e => setForm({ ...form, ad_reader_enabled: e.target.checked })}
                            className="rounded border-border text-primary h-4 w-4"
                          />
                          <span>Activer</span>
                        </label>
                      </div>
                      {form.ad_reader_enabled && (
                        <textarea
                          rows={2}
                          value={form.ad_reader_code}
                          onChange={e => setForm({ ...form, ad_reader_code: e.target.value })}
                          placeholder="Code HTML ou bannière insérée entre les chapitres..."
                          className="w-full p-2.5 rounded-lg border border-border bg-card text-xs font-mono"
                        />
                      )}
                    </div>

                    {/* Shop / Merch */}
                    <div className="p-4 rounded-xl bg-background border border-border space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-foreground">Boutique / Produits Merch</span>
                        <label className="flex items-center gap-2 text-xs cursor-pointer">
                          <input
                            type="checkbox"
                            checked={form.shop_enabled}
                            onChange={e => setForm({ ...form, shop_enabled: e.target.checked })}
                            className="rounded border-border text-primary h-4 w-4"
                          />
                          <span>Activer la boutique</span>
                        </label>
                      </div>
                      {form.shop_enabled && (
                        <Field label="Titre de la section boutique" value={form.shop_title} onChange={value => setForm({ ...form, shop_title: value })} placeholder="Produits dérivés et Figurines" />
                      )}
                    </div>
                  </div>
                )}

                {/* ── TAB 6: SEO & ABOUT ── */}
                {activeTab === "seo" && (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Titre Meta SEO" value={form.seo_title} onChange={value => setForm({ ...form, seo_title: value })} placeholder="Lire Manga Scan en Ligne VF" />
                    <Field label="Image de partage OpenGraph / Twitter" value={form.seo_og_image} onChange={value => setForm({ ...form, seo_og_image: value })} placeholder="https://…" />
                    <label className="block text-sm font-medium">
                      Directives Robots
                      <select value={form.seo_robots} onChange={e => setForm({ ...form, seo_robots: e.target.value })} className="mt-2 h-11 w-full rounded-lg border border-input bg-background px-3 text-sm">
                        <option value="index, follow">Index, Follow (Recommandé)</option>
                        <option value="noindex, follow">Noindex, Follow</option>
                        <option value="noindex, nofollow">Noindex, Nofollow</option>
                      </select>
                    </label>
                    <label className="block text-sm font-medium sm:col-span-2">
                      Description Meta SEO
                      <textarea rows={2} value={form.seo_description} onChange={e => setForm({ ...form, seo_description: e.target.value })} className="mt-2 w-full resize-y rounded-lg border border-input bg-background px-3 py-2 text-sm" placeholder="Description pour les moteurs de recherche (Google, Bing)..." />
                    </label>
                    <label className="block text-sm font-medium sm:col-span-2">
                      Contenu complet « À propos » (HTML supporté)
                      <textarea rows={4} value={form.about_html} onChange={e => setForm({ ...form, about_html: e.target.value })} className="mt-2 w-full resize-y rounded-lg border border-input bg-background px-3 py-2 text-sm font-mono" placeholder="<p>Présentation officielle du manga et avertissement légal...</p>" />
                    </label>
                  </div>
                )}

                {/* ── TAB 7: TRACKING & SCRIPTS ── */}
                {activeTab === "tracking" && (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Google Analytics ID (GA4)" value={form.ga_id} onChange={value => setForm({ ...form, ga_id: value })} placeholder="G-XXXXXXXXXX" />
                    <Field label="Google Tag Manager ID" value={form.gtm_id} onChange={value => setForm({ ...form, gtm_id: value })} placeholder="GTM-XXXXXXX" />
                    <label className="block text-sm font-medium sm:col-span-2">
                      Scripts personnalisés (insérés dans le header)
                      <textarea rows={4} value={form.custom_scripts} onChange={e => setForm({ ...form, custom_scripts: e.target.value })} className="mt-2 w-full resize-y rounded-lg border border-input bg-background px-3 py-2 text-sm font-mono" placeholder="<!-- Pixels de tracking, scripts personnalisés -->" />
                    </label>
                  </div>
                )}

                {error && (
                  <p role="alert" className="text-sm font-medium text-destructive">{error}</p>
                )}

                {/* Footer Controls */}
                <div className="flex items-center justify-between border-t border-border pt-5">
                  <span className="text-xs text-muted-foreground">
                    Modifications synchronisées avec PostgreSQL et le Wizard Manga Hub.
                  </span>
                  <div className="flex items-center gap-3">
                    <button type="button" onClick={() => setModal(false)} className="rounded-lg border border-border px-4 py-2.5 text-sm font-semibold hover:bg-muted transition">
                      Annuler
                    </button>
                    <button disabled={busy} className="rounded-lg bg-[#006769] hover:bg-[#005254] px-6 py-2.5 text-sm font-bold text-white disabled:opacity-60 transition shadow-md flex items-center gap-2">
                      {busy ? (
                        <>
                          <RefreshCw size={15} className="animate-spin" />
                          <span>Enregistrement…</span>
                        </>
                      ) : (
                        <span>{editing ? "Enregistrer tous les changements" : "Créer le site"}</span>
                      )}
                    </button>
                  </div>
                </div>
              </form>
            )}
          </section>
        </div>
      )}
    </section>
  )
}

function TabButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
        active
          ? "bg-primary text-primary-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground hover:bg-background/80"
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  )
}

function Field({ label, value, onChange, placeholder, required, suffix }: { label: string; value: string; onChange: (value: string) => void; placeholder: string; required?: boolean; suffix?: string }) {
  return (
    <label className="block text-sm font-medium">
      {label}
      <div className="mt-2 flex h-11 overflow-hidden rounded-lg border border-input focus-within:border-primary">
        <input required={required} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="min-w-0 flex-1 bg-background px-3 text-sm outline-none" />
        {suffix && <span className="flex items-center border-l border-border bg-muted px-2 text-xs text-muted-foreground font-mono">{suffix}</span>}
      </div>
    </label>
  )
}

type FormStatus = "draft" | "active" | "archived"

function Status({ status }: { status: Site["status"] }) {
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
      status === "active"
        ? "bg-emerald-500/10 text-emerald-500"
        : status === "archived"
          ? "bg-slate-500/10 text-slate-500"
          : "bg-amber-500/10 text-amber-500"
    }`}>
      {status === "active" ? "Actif" : status === "archived" ? "Archivé" : "Brouillon"}
    </span>
  )
}

function SiteActionDropdown({
  site,
  onOpenEdit,
  onManageSite,
  onDuplicate,
}: {
  site: Site
  onOpenEdit: (site: Site) => void
  onManageSite: (siteId: string) => void
  onDuplicate: (site: Site) => void
}) {
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside)
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [open])

  return (
    <div className="relative inline-block text-left" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-card hover:bg-muted text-xs font-bold text-foreground transition shadow-sm"
      >
        <span>Actions</span>
        <ChevronDown size={13} className={`transition-transform duration-150 ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 z-50 w-52 rounded-xl border border-border bg-card p-1.5 shadow-2xl animate-in fade-in zoom-in-95 duration-100 text-left">
          <button
            type="button"
            onClick={() => {
              setOpen(false)
              onOpenEdit(site)
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-foreground hover:bg-primary/10 hover:text-primary transition"
          >
            <Pencil size={14} className="text-primary" />
            <span>Modifier le site</span>
          </button>

          <a
            href={`/create/${site.id}`}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-foreground hover:bg-muted transition"
          >
            <Sparkles size={14} className="text-emerald-500" />
            <span>Wizard 8 Étapes</span>
          </a>

          <button
            type="button"
            onClick={() => {
              setOpen(false)
              onManageSite(site.id)
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-foreground hover:bg-muted transition"
          >
            <Activity size={14} className="text-blue-500" />
            <span>Réglages & Design</span>
          </button>

          <a
            href={`/popular/${site.id}`}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-foreground hover:bg-muted transition"
          >
            <Star size={14} className="text-amber-500" />
            <span>Page Showcase</span>
          </a>

          <div className="my-1 border-t border-border/60" />

          <button
            type="button"
            onClick={() => {
              setOpen(false)
              onDuplicate(site)
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-foreground hover:bg-muted transition"
          >
            <Archive size={14} className="text-muted-foreground" />
            <span>Dupliquer en brouillon</span>
          </button>

          {site.status === "active" && (
            <a
              href={`/sites/${site.slug}/`}
              target="_blank"
              rel="noreferrer"
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-foreground hover:bg-muted transition"
            >
              <ExternalLink size={14} className="text-teal-500" />
              <span>Ouvrir le site en ligne</span>
            </a>
          )}
        </div>
      )}
    </div>
  )
}
