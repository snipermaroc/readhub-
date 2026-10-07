import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import DOMPurify from 'dompurify'
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  ChevronRight,
  Download,
  ExternalLink,
  Eye,
  FileCode,
  FileSpreadsheet,
  FileText,
  Globe,
  Globe2,
  HelpCircle,
  Image as ImageIcon,
  Layers,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Trash2,
  Upload,
  X,
  Zap,
} from 'lucide-react'
import {
  projects,
  upload,
  generate,
  wpImport,
  type Project,
  type SiteData,
  type Chapter,
  type ShopProduct,
  type AdBanner,
  type SidebarAd,
} from '@/lib/api'
import { useTranslation } from 'react-i18next'
import { LanguageToggle } from '@/components/LanguageToggle'
import { ThemeToggle } from '@/components/ThemeToggle'
import { getAuthHeader } from '@/lib/postgres'

// Helper slugify function
const slugify = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

// ───────────────────────────────────────────────────────────────────────────
// SHARED UI COMPONENTS (THEMED ACCORDING TO APP DESIGN SYSTEM)
// ───────────────────────────────────────────────────────────────────────────

interface StepsProps {
  current: number
  onStepClick?: (step: number) => void
}

const STEP_LABELS = [
  'Site Info',
  'Manga Info',
  'Chapters',
  'Design',
  'Ads',
  'About & SEO Text',
  'SEO Meta',
  'Tracking & Analytics',
]

export function Steps({ current, onStepClick }: StepsProps) {
  const { t } = useTranslation()

  return (
    <div className="w-full overflow-x-auto pb-4 pt-2">
      <div className="flex min-w-[760px] items-center justify-between">
        {STEP_LABELS.map((label, index) => {
          const stepNumber = index + 1
          const isPast = stepNumber < current
          const isCurrent = stepNumber === current
          const isFuture = stepNumber > current

          return (
            <React.Fragment key={stepNumber}>
              <div
                onClick={() => isPast && onStepClick?.(stepNumber)}
                className={`flex flex-col items-center gap-2 ${
                  isPast ? 'cursor-pointer group' : ''
                }`}
              >
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-full text-xs font-bold transition-all ${
                    isPast
                      ? 'bg-primary text-primary-foreground shadow-md shadow-primary/25 group-hover:scale-105'
                      : isCurrent
                      ? 'border-2 border-primary bg-card text-primary ring-4 ring-primary/20 shadow-sm'
                      : 'border border-border bg-muted/60 text-muted-foreground'
                  }`}
                >
                  {isPast ? <Check size={18} strokeWidth={3} /> : stepNumber}
                </div>
                <span
                  className={`text-[11px] tracking-wide whitespace-nowrap transition-colors ${
                    isPast
                      ? 'text-primary font-semibold group-hover:underline'
                      : isCurrent
                      ? 'text-primary font-bold font-headline'
                      : 'text-muted-foreground'
                  }`}
                >
                  {t(label)}
                </span>
              </div>

              {index < STEP_LABELS.length - 1 && (
                <div
                  className={`h-0.5 flex-1 mx-2 transition-colors ${
                    stepNumber < current ? 'bg-primary' : 'bg-border'
                  }`}
                />
              )}
            </React.Fragment>
          )
        })}
      </div>
    </div>
  )
}

interface FieldProps {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  type?: string
  rows?: number
  hint?: string
  required?: boolean
  className?: string
  action?: React.ReactNode
}

export function Field({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  rows,
  hint,
  required,
  className = '',
  action,
}: FieldProps) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-foreground flex items-center gap-1">
          {label} {required && <span className="text-destructive font-bold">*</span>}
        </label>
        {action}
      </div>
      {rows ? (
        <textarea
          rows={rows}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-xl border border-input bg-card px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all shadow-sm"
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-xl border border-input bg-card px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all shadow-sm"
        />
      )}
      {hint && <p className="text-[11px] text-muted-foreground leading-normal">{hint}</p>}
    </div>
  )
}

interface CardProps {
  title?: string
  description?: string
  children: React.ReactNode
  className?: string
  action?: React.ReactNode
}

export function Card({ title, description, children, className = '', action }: CardProps) {
  return (
    <div className={`rounded-2xl border border-border bg-card p-6 shadow-sm ${className}`}>
      {(title || action) && (
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
          <div>
            {title && <h3 className="text-base font-bold text-foreground font-headline tracking-tight">{title}</h3>}
            {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </div>
  )
}

interface ToggleProps {
  label: string
  description?: string
  value: boolean
  onChange: (v: boolean) => void
}

export function Toggle({ label, description, value, onChange }: ToggleProps) {
  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <div>
        <span className="text-sm font-semibold text-foreground block">{label}</span>
        {description && <span className="text-xs text-muted-foreground block">{description}</span>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={value}
        onClick={() => onChange(!value)}
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary/20 ${
          value ? 'bg-primary' : 'bg-muted'
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
            value ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  )
}

// ───────────────────────────────────────────────────────────────────────────
// MAIN CREATE WIZARD COMPONENT
// ───────────────────────────────────────────────────────────────────────────

export default function CreateWizard() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { t } = useTranslation()

  // Wizard Control
  const [step, setStep] = useState<number>(1)
  const [project, setProject] = useState<Project | null>(null)
  const [saving, setSaving] = useState<boolean>(false)
  const [msg, setMsg] = useState<string>('')
  const [err, setErr] = useState<string>('')
  const [mode, setMode] = useState<'manual' | 'json' | null>(id ? 'manual' : null)

  // JSON Import Modal
  const [jsonImportModal, setJsonImportModal] = useState<boolean>(false)
  const [jsonImportText, setJsonImportText] = useState<string>('')
  const [jsonImportErr, setJsonImportErr] = useState<string>('')
  const jsonImportFileRef = useRef<HTMLInputElement>(null)

  // Favicon Generation
  const [faviconUploading, setFaviconUploading] = useState<boolean>(false)
  const [faviconError, setFaviconError] = useState<string>('')

  // Step 1 — Site Info
  const [siteName, setSiteName] = useState<string>('')
  const [keyword, setKeyword] = useState<string>('')
  const [language, setLanguage] = useState<string>('en')
  const [baseUrl, setBaseUrl] = useState<string>('')
  const [description, setDescription] = useState<string>('')

  // Step 2 — Manga Info
  const [mangaTitle, setMangaTitle] = useState<string>('')
  const [mangaSlug, setMangaSlug] = useState<string>('')
  const [mangaSummary, setMangaSummary] = useState<string>('')
  const [mangaTags, setMangaTags] = useState<string>('')
  const [mangaCover, setMangaCover] = useState<string>('')
  const [mangaBanner, setMangaBanner] = useState<string>('')
  const [coverMode, setCoverMode] = useState<'url' | 'file'>('url')
  const [bannerMode, setBannerMode] = useState<'url' | 'file'>('url')
  const [uploadingCover, setUploadingCover] = useState<boolean>(false)
  const [uploadingBanner, setUploadingBanner] = useState<boolean>(false)
  const coverRef = useRef<HTMLInputElement>(null)
  const bannerRef = useRef<HTMLInputElement>(null)

  // Step 3 — Chapters
  const [chapters, setChapters] = useState<Chapter[]>([])
  const [importing, setImporting] = useState<boolean>(false)
  const [importMsg, setImportMsg] = useState<string>('')
  const csvRef = useRef<HTMLInputElement>(null)
  const zipRef = useRef<HTMLInputElement>(null)

  // Step 4 — Design
  const [navLinks, setNavLinks] = useState<{ label: string; url: string }[]>([])
  const [footerAbout, setFooterAbout] = useState<string>('')
  const [footerCopyright, setFooterCopyright] = useState<string>('')
  const [privacyUrl, setPrivacyUrl] = useState<string>('/privacy.html')
  const [tosUrl, setTosUrl] = useState<string>('/tos.html')
  const [dmcaUrl, setDmcaUrl] = useState<string>('/dmca.html')
  const [cookieUrl, setCookieUrl] = useState<string>('/cookies.html')
  const [contactUrl, setContactUrl] = useState<string>('/contact.html')
  const [statsEnabled, setStatsEnabled] = useState<boolean>(false)
  const [statsRank, setStatsRank] = useState<string>('')
  const [statsReaders, setStatsReaders] = useState<string>('')
  const [statsRating, setStatsRating] = useState<string>('')
  const [shopEnabled, setShopEnabled] = useState<boolean>(false)
  const [shopTitle, setShopTitle] = useState<string>('Editorial Collection')
  const [shopLink, setShopLink] = useState<string>('#')
  const [shopProducts, setShopProducts] = useState<ShopProduct[]>([])

  // Step 5 — Ads
  const [adBannersList, setAdBannersList] = useState<AdBanner[]>([])
  const [sideAdsList, setSideAdsList] = useState<SidebarAd[]>([])
  const [afterChaptersList, setAfterChaptersList] = useState<AdBanner[]>([])

  // Step 6 — About & SEO Text
  const [aboutHtml, setAboutHtml] = useState<string>('')

  // Step 7 — SEO Meta
  const [seoAuthor, setSeoAuthor] = useState<string>('')
  const [seoRobots, setSeoRobots] = useState<string>('index, follow')
  const [seoOgImage, setSeoOgImage] = useState<string>('')
  const [seoTwitterCard, setSeoTwitterCard] = useState<string>('summary_large_image')
  const [seoFaviconIco, setSeoFaviconIco] = useState<string>('/favicon.ico')
  const [seoFavicon32, setSeoFavicon32] = useState<string>('/favicon-32x32.png')
  const [seoFavicon16, setSeoFavicon16] = useState<string>('/favicon-16x16.png')
  const [seoAppleTouch, setSeoAppleTouch] = useState<string>('/apple-touch-icon.png')
  const [seoManifest, setSeoManifest] = useState<string>('/site.webmanifest')
  const [faqItems, setFaqItems] = useState<{ q: string; a: string }[]>([
    { q: '', a: '' },
    { q: '', a: '' },
  ])

  // Step 8 — Tracking & Analytics
  const [seoGoogleVerify, setSeoGoogleVerify] = useState<string>('')
  const [seoBingVerify, setSeoBingVerify] = useState<string>('')
  const [seoYandexVerify, setSeoYandexVerify] = useState<string>('')
  const [gaId, setGaId] = useState<string>('')
  const [clarityId, setClarityId] = useState<string>('')

  // Generation
  const [generating, setGenerating] = useState<boolean>(false)
  const [generated, setGenerated] = useState<boolean>(false)
  const [zipDeleted, setZipDeleted] = useState<boolean>(false)
  const [deletingZip, setDeletingZip] = useState<boolean>(false)

  // Total pages computation
  const totalPages = useMemo(
    () => chapters.reduce((s, c) => s + (c.images?.length ?? 0), 0),
    [chapters]
  )

  // ───────────────────────────────────────────────────────────────────────────
  // ON MOUNT — LOAD PROJECT DATA
  // ───────────────────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    if (!id) return
    try {
      const p = await projects.get(id)
      setProject(p)
      setMode('manual')

      if (p.status === 'generated') setGenerated(true)

      // Hydrate siteData
      const data = p.siteData
      if (data) {
        setSiteName(data.site_name || p.site_name || '')
        setKeyword(data.keyword || p.keyword || '')
        setLanguage(data.language || p.language || 'en')
        setBaseUrl(data.baseUrl || '')

        const m = data.manga?.[0]
        if (m) {
          setMangaTitle(m.title || '')
          setMangaSlug(m.slug || '')
          setMangaSummary(m.summary || '')
          setMangaTags(Array.isArray(m.tags) ? m.tags.join(', ') : '')
          setMangaCover(m.cover || '')
          setMangaBanner(m.banner || '')
          setChapters(Array.isArray(m.chapters) ? m.chapters : [])
        }

        const cfg = data.config
        if (cfg) {
          setDescription(cfg.description || '')
          setAboutHtml(cfg.about_html || '')
          setNavLinks(Array.isArray(cfg.nav?.links) ? cfg.nav.links : [])

          if (cfg.footer) {
            setFooterAbout(cfg.footer.about || '')
            setFooterCopyright(cfg.footer.copyright || '')
            if (cfg.footer.legal) {
              setPrivacyUrl(cfg.footer.legal.privacy_link === '#' ? '/privacy.html' : cfg.footer.legal.privacy_link || '/privacy.html')
              setTosUrl(cfg.footer.legal.tos_link === '#' ? '/tos.html' : cfg.footer.legal.tos_link || '/tos.html')
              setDmcaUrl(cfg.footer.legal.dmca_link === '#' ? '/dmca.html' : cfg.footer.legal.dmca_link || '/dmca.html')
              setCookieUrl(cfg.footer.legal.cookie_link === '#' ? '/cookies.html' : cfg.footer.legal.cookie_link || '/cookies.html')
              setContactUrl(cfg.footer.legal.contact_link === '#' ? '/contact.html' : cfg.footer.legal.contact_link || '/contact.html')
            }
          }

          setAdBannersList(Array.isArray(cfg.ad_banners_list) ? cfg.ad_banners_list : [])
          setAfterChaptersList(Array.isArray(cfg.ad_after_chapters_list) ? cfg.ad_after_chapters_list : [])

          if (cfg.sidebar) {
            setSideAdsList(Array.isArray(cfg.sidebar.ads_list) ? cfg.sidebar.ads_list : [])
            if (cfg.sidebar.stats) {
              setStatsEnabled(!!cfg.sidebar.stats.enabled)
              setStatsRank(cfg.sidebar.stats.rank || '')
              setStatsReaders(cfg.sidebar.stats.readers || '')
              setStatsRating(cfg.sidebar.stats.rating || '')
            }
          }

          if (cfg.shop) {
            setShopEnabled(!!cfg.shop.enabled)
            setShopTitle(cfg.shop.title || 'Editorial Collection')
            setShopLink(cfg.shop.button_link || '#')
            setShopProducts(Array.isArray(cfg.shop.products) ? cfg.shop.products : [])
          }

          if (cfg.seo) {
            setSeoAuthor(cfg.seo.author || '')
            setSeoRobots(cfg.seo.robots || 'index, follow')
            setSeoOgImage(cfg.seo.og_image || '')
            setSeoTwitterCard(cfg.seo.twitter_card || 'summary_large_image')
            setSeoFaviconIco(cfg.seo.favicon_ico || '/favicon.ico')
            setSeoFavicon32(cfg.seo.favicon_32 || '/favicon-32x32.png')
            setSeoFavicon16(cfg.seo.favicon_16 || '/favicon-16x16.png')
            setSeoAppleTouch(cfg.seo.apple_touch || '/apple-touch-icon.png')
            setSeoManifest(cfg.seo.manifest || '/site.webmanifest')
            setSeoGoogleVerify(cfg.seo.google_verify || '')
            setSeoBingVerify(cfg.seo.bing_verify || '')
            setSeoYandexVerify(cfg.seo.yandex_verify || '')
            setGaId(cfg.seo.ga_id || '')
            setClarityId(cfg.seo.clarity_id || '')

            if (Array.isArray(cfg.seo.faq) && cfg.seo.faq.length > 0) {
              setFaqItems(
                cfg.seo.faq.map((item: any) => ({
                  q: item.q || item.question || '',
                  a: item.a || item.answer || '',
                }))
              )
            }
          }
        }
      }
    } catch (e: any) {
      setErr(e.message || 'Failed to load project.')
    }
  }, [id])

  useEffect(() => {
    void load()
  }, [load])

  // ───────────────────────────────────────────────────────────────────────────
  // CORE FUNCTIONS
  // ───────────────────────────────────────────────────────────────────────────

  const buildSiteData = (): SiteData => ({
    site_name: siteName,
    keyword,
    language,
    baseUrl,
    manga: [
      {
        title: mangaTitle,
        slug: mangaSlug || slugify(mangaTitle),
        cover: mangaCover,
        banner: mangaBanner,
        summary: mangaSummary,
        tags: mangaTags
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
        chapters,
      },
    ],
    config: {
      description,
      about_html: aboutHtml,
      nav: { links: navLinks },
      footer: {
        about: footerAbout,
        copyright: footerCopyright,
        legal: {
          privacy_link: privacyUrl,
          tos_link: tosUrl,
          dmca_link: dmcaUrl,
          cookie_link: cookieUrl,
          contact_link: contactUrl,
        },
      },
      ad_banners_list: adBannersList,
      ad_after_chapters_list: afterChaptersList,
      sidebar: {
        ads_list: sideAdsList,
        stats: {
          enabled: statsEnabled,
          rank: statsRank,
          readers: statsReaders,
          rating: statsRating,
        },
      },
      shop: {
        enabled: shopEnabled,
        title: shopTitle,
        button_text: 'View Full Shop',
        button_link: shopLink,
        products: shopProducts,
      },
      seo: {
        author: seoAuthor,
        robots: seoRobots,
        og_image: seoOgImage,
        twitter_card: seoTwitterCard,
        favicon_ico: seoFaviconIco,
        favicon_32: seoFavicon32,
        favicon_16: seoFavicon16,
        apple_touch: seoAppleTouch,
        manifest: seoManifest,
        google_verify: seoGoogleVerify,
        bing_verify: seoBingVerify,
        yandex_verify: seoYandexVerify,
        ga_id: gaId,
        clarity_id: clarityId,
        faq: faqItems.filter((f) => f.q && f.a),
      },
    },
  })

  const save = async (): Promise<Project | null> => {
    setSaving(true)
    setErr('')
    try {
      const siteData = buildSiteData()
      if (project) {
        const updated = await projects.update(project.id, {
          ...project,
          site_name: siteName,
          keyword,
          language,
          siteData,
        })
        setProject(updated)
        return updated
      } else {
        const created = await projects.create({
          site_name: siteName,
          keyword,
          language,
        })
        const updated = await projects.update(created.id, {
          ...created,
          siteData,
        })
        setProject(updated)
        navigate(`/create/${created.id}`, { replace: true })
        return updated
      }
    } catch (e: any) {
      setErr(e.response?.data?.error ?? e.message)
      return null
    } finally {
      setSaving(false)
    }
  }

  const next = async () => {
    setErr('')
    if (step === 1 && !mode) {
      setErr('Please choose Manual or Import JSON')
      return
    }
    if (step === 1 && !siteName.trim()) {
      setErr('Site name is required')
      return
    }
    if (step === 2 && !mangaTitle.trim()) {
      setErr('Manga title is required')
      return
    }

    const saved = await save()
    if (saved) {
      setStep((s) => s + 1)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const back = () => {
    setErr('')
    setStep((s) => Math.max(1, s - 1))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // JSON Import Parser
  const applyJsonImport = () => {
    setJsonImportErr('')
    try {
      const raw = JSON.parse(jsonImportText)
      const data: any = raw.siteData || raw

      if (data.site_name) setSiteName(data.site_name)
      if (data.keyword) setKeyword(data.keyword)
      if (data.language) setLanguage(data.language)
      if (data.baseUrl) setBaseUrl(data.baseUrl)

      const m = data.manga?.[0] || data.manga
      if (m) {
        if (m.title) {
          setMangaTitle(m.title)
          setMangaSlug(m.slug || slugify(m.title))
        }
        if (m.summary) setMangaSummary(m.summary)
        if (m.tags) {
          setMangaTags(Array.isArray(m.tags) ? m.tags.join(', ') : String(m.tags))
        }
        if (m.cover) setMangaCover(m.cover)
        if (m.banner) setMangaBanner(m.banner)
        if (Array.isArray(m.chapters)) setChapters(m.chapters)
      }

      const cfg = data.config || {}
      if (cfg.description) setDescription(cfg.description)
      if (cfg.about_html) setAboutHtml(cfg.about_html)
      if (Array.isArray(cfg.nav?.links)) setNavLinks(cfg.nav.links)

      // Footer
      if (cfg.footer) {
        setFooterAbout(cfg.footer.about || cfg.footer.about_text || '')
        setFooterCopyright(cfg.footer.copyright || '')
        if (cfg.footer.legal) {
          setPrivacyUrl(cfg.footer.legal.privacy_link || '/privacy.html')
          setTosUrl(cfg.footer.legal.tos_link || '/tos.html')
          setDmcaUrl(cfg.footer.legal.dmca_link || '/dmca.html')
          setCookieUrl(cfg.footer.legal.cookie_link || '/cookies.html')
          setContactUrl(cfg.footer.legal.contact_link || '/contact.html')
        }
      }

      // Ads
      if (Array.isArray(cfg.ad_banners_list)) setAdBannersList(cfg.ad_banners_list)
      if (Array.isArray(cfg.ad_after_chapters_list)) setAfterChaptersList(cfg.ad_after_chapters_list)
      if (cfg.sidebar?.ads_list) setSideAdsList(cfg.sidebar.ads_list)
      if (cfg.sidebar?.stats) {
        setStatsEnabled(!!cfg.sidebar.stats.enabled)
        setStatsRank(cfg.sidebar.stats.rank || '')
        setStatsReaders(cfg.sidebar.stats.readers || '')
        setStatsRating(cfg.sidebar.stats.rating || '')
      }

      // Shop
      if (cfg.shop) {
        setShopEnabled(!!cfg.shop.enabled)
        setShopTitle(cfg.shop.title || 'Editorial Collection')
        setShopLink(cfg.shop.button_link || '#')
        if (Array.isArray(cfg.shop.products)) setShopProducts(cfg.shop.products)
      }

      // SEO
      const seo = cfg.seo || {}
      setSeoAuthor(seo.author || '')
      setSeoRobots(seo.robots || 'index, follow')
      setSeoOgImage(seo.og_image || seo.meta?.og_image || '')
      setSeoTwitterCard(seo.twitter_card || 'summary_large_image')
      setSeoFaviconIco(seo.favicon_ico || seo.favicons?.favicon_ico || '/favicon.ico')
      setSeoFavicon32(seo.favicon_32 || seo.favicons?.favicon_32 || '/favicon-32x32.png')
      setSeoFavicon16(seo.favicon_16 || seo.favicons?.favicon_16 || '/favicon-16x16.png')
      setSeoAppleTouch(seo.apple_touch || seo.favicons?.apple_touch || '/apple-touch-icon.png')
      setSeoManifest(seo.manifest || '/site.webmanifest')
      setSeoGoogleVerify(seo.google_verify || seo.verification?.google_site_verification || '')
      setSeoBingVerify(seo.bing_verify || seo.verification?.bing_webmaster || '')
      setSeoYandexVerify(seo.yandex_verify || seo.verification?.yandex || '')
      setGaId(seo.ga_id || cfg.analytics?.google_analytics || '')
      setClarityId(seo.clarity_id || cfg.analytics?.clarity || '')

      if (Array.isArray(seo.faq)) {
        setFaqItems(
          seo.faq.map((item: any) => ({
            q: item.q || item.question || '',
            a: item.a || item.answer || '',
          }))
        )
      }

      setMode('manual')
      setJsonImportModal(false)
      setMsg('✓ JSON Configuration imported successfully!')
      setTimeout(() => setMsg(''), 4000)
    } catch {
      setJsonImportErr('Invalid JSON — please check format and try again.')
    }
  }

  // Cover Image File Upload
  const handleCoverFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingCover(true)
    setErr('')
    try {
      const saved = await save()
      if (!saved) throw new Error('Could not save project before upload')
      const res = await upload.cover(saved.id, 0, file)
      setMangaCover(res.cover)
    } catch (e: any) {
      setErr(e.message || 'Failed to upload cover')
    } finally {
      setUploadingCover(false)
    }
  }

  // Banner Image File Upload
  const handleBannerFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingBanner(true)
    setErr('')
    try {
      const saved = await save()
      if (!saved) throw new Error('Could not save project before upload')
      const res = await upload.banner(saved.id, 0, file)
      setMangaBanner(res.url)
    } catch (e: any) {
      setErr(e.message || 'Failed to upload banner')
    } finally {
      setUploadingBanner(false)
    }
  }

  // CSV Import
  const handleCsvImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return
    setImporting(true)
    setErr('')
    setImportMsg('')
    try {
      const saved = await save()
      if (!saved) throw new Error('Could not save project before importing')
      const res = await upload.chapters(saved.id, 0, files)
      const fresh = await projects.get(saved.id)
      setProject(fresh)
      const nextChapters = fresh.siteData?.manga?.[0]?.chapters || res.chapters || []
      setChapters(nextChapters)
      setImportMsg(`✓ Imported ${res.count || files.length} chapter files successfully!`)
    } catch (e: any) {
      setErr(e.message || 'Failed to import CSV files')
    } finally {
      setImporting(false)
    }
  }

  // ZIP Import
  const handleZipImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImporting(true)
    setErr('')
    setImportMsg('')
    try {
      const saved = await save()
      if (!saved) throw new Error('Could not save project before importing ZIP')
      const res = await upload.zip(saved.id, 0, file)
      const fresh = await projects.get(saved.id)
      setProject(fresh)
      const nextChapters = fresh.siteData?.manga?.[0]?.chapters || res.chapters || []
      setChapters(nextChapters)
      setImportMsg(`✓ Extracted and imported ${nextChapters.length} chapters from ZIP!`)
    } catch (e: any) {
      setErr(e.message || 'Failed to import chapter ZIP archive')
    } finally {
      setImporting(false)
    }
  }

  // Clear Chapters
  const handleClearChapters = async () => {
    if (!project) {
      setChapters([])
      setImportMsg('')
      return
    }
    if (!window.confirm('Are you sure you want to remove all chapters?')) return
    try {
      await upload.clearChapters(project.id, 0)
      setChapters([])
      setImportMsg('')
    } catch (e: any) {
      setErr(e.message || 'Failed to clear chapters')
    }
  }

  // Favicon Auto-generator
  const handleFaviconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setFaviconUploading(true)
    setFaviconError('')
    try {
      const formData = new FormData()
      formData.append('image', file)
      formData.append('siteName', siteName || 'MangaSite')
      const res = await fetch('/api/generate-favicons', {
        method: 'POST',
        body: formData,
      })
      if (!res.ok) throw new Error('Favicon generator service failed')
      const blob = await res.blob()
      const downloadUrl = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = downloadUrl
      a.download = 'favicons-bundle.zip'
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(downloadUrl)
    } catch (e: any) {
      setFaviconError(e.message || 'Favicon generator error')
    } finally {
      setFaviconUploading(false)
    }
  }

  // Generate Site
  const handleGenerate = async () => {
    setGenerating(true)
    setErr('')
    setMsg('')
    setZipDeleted(false)
    try {
      const saved = await save()
      if (!saved) return
      await generate.site(saved.id)
      setGenerated(true)
      setMsg('✓ Site generated successfully! Static files are ready.')
    } catch (e: any) {
      setErr(e.response?.data?.error ?? e.message)
    } finally {
      setGenerating(false)
    }
  }

  // Delete Site ZIP
  const handleDeleteZip = async () => {
    if (!project?.id) return
    setDeletingZip(true)
    setErr('')
    setMsg('')
    try {
      const res = await fetch(`/api/generate/${project.id}/delete-zip`, {
        method: 'POST',
        headers: {
          ...getAuthHeader(),
        },
        credentials: 'include',
      })
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || 'Failed to delete ZIP file.')
      }
      setZipDeleted(true)
      setMsg('✓ ZIP bundle archive has been permanently deleted from project folder.')
    } catch (e: any) {
      setErr(e.message || 'Error deleting ZIP bundle.')
    } finally {
      setDeletingZip(false)
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  // RENDER STEP PANELS (USING APP PALETTE)
  // ───────────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-background text-foreground pb-20">
      {/* Top Header */}
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
                <span className="font-extrabold tracking-tight text-foreground font-headline"></span>
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary border border-primary/20">
                  SITE WIZARD
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground truncate max-w-[240px] sm:max-w-md">
                {id ? `Editing: ${siteName || 'Project ' + id}` : 'Create a New Manga Website'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {saving && (
              <span className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground">
                <Loader2 size={13} className="animate-spin text-primary" /> Auto-saving...
              </span>
            )}
            <ThemeToggle />
            <LanguageToggle />
            <button
              onClick={() => setJsonImportModal(true)}
              className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground hover:border-primary hover:text-primary transition shadow-sm"
            >
              <FileCode size={14} className="text-primary" /> Import JSON
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="mx-auto max-w-5xl px-4 sm:px-6 pt-8">
        {/* Step Progress Bar */}
        <Steps current={step} onStepClick={(s) => setStep(s)} />

        {/* Global Alert Messages */}
        {msg && (
          <div className="mt-6 rounded-xl border border-primary/30 bg-primary/10 p-4 text-sm font-medium text-primary flex items-center gap-2 shadow-sm">
            <Check size={18} className="shrink-0" /> {msg}
          </div>
        )}
        {err && (
          <div className="mt-6 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm font-medium text-destructive flex items-center gap-2 shadow-sm">
            <X size={18} className="shrink-0" /> {err}
          </div>
        )}

        {/* ── STEP 1: SITE INFO ── */}
        {step === 1 && (
          <div className="mt-8 space-y-6">
            {!mode ? (
              <div className="grid gap-5 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setMode('manual')}
                  className="flex flex-col items-center justify-center rounded-2xl border border-border bg-card p-10 text-center transition-all hover:border-primary hover:shadow-lg hover:shadow-primary/5 group"
                >
                  <div className="grid h-14 w-14 place-items-center rounded-2xl bg-primary/10 text-primary group-hover:scale-110 transition">
                    <Sparkles size={28} />
                  </div>
                  <h3 className="mt-4 text-lg font-bold text-foreground font-headline">Manual Setup</h3>
                  <p className="mt-2 text-xs text-muted-foreground max-w-xs leading-relaxed">
                    Fill out the guided form step-by-step from site branding to analytics.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setMode('json')
                    setJsonImportModal(true)
                  }}
                  className="flex flex-col items-center justify-center rounded-2xl border border-border bg-card p-10 text-center transition-all hover:border-primary hover:shadow-lg hover:shadow-primary/5 group"
                >
                  <div className="grid h-14 w-14 place-items-center rounded-2xl bg-secondary/15 text-foreground group-hover:scale-110 transition">
                    <FileCode size={28} className="text-primary" />
                  </div>
                  <h3 className="mt-4 text-lg font-bold text-foreground font-headline">Import JSON Config</h3>
                  <p className="mt-2 text-xs text-muted-foreground max-w-xs leading-relaxed">
                    Paste an AI-generated configuration payload or upload a JSON backup.
                  </p>
                </button>
              </div>
            ) : (
              <Card
                title="1. General Site Information"
                description="Core identity and primary SEO domain configuration for this edition."
                action={
                  <button
                    onClick={() => setMode(null)}
                    className="text-xs text-muted-foreground hover:text-primary transition"
                  >
                    Change Mode
                  </button>
                }
              >
                <div className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field
                      label="Site Name"
                      value={siteName}
                      onChange={setSiteName}
                      placeholder="e.g. Solo Leveling Manga Hub"
                      required
                      hint="Brand name displayed in the header and page titles."
                    />
                    <div>
                      <label className="text-xs font-semibold text-foreground block mb-1.5">
                        Language
                      </label>
                      <select
                        value={language}
                        onChange={(e) => setLanguage(e.target.value)}
                        className="w-full rounded-xl border border-input bg-card px-3.5 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 shadow-sm"
                      >
                        <option value="en">English (en)</option>
                        <option value="fr">Français (fr)</option>
                        <option value="es">Español (es)</option>
                        <option value="ar">العربية (ar)</option>
                        <option value="ja">日本語 (ja)</option>
                      </select>
                    </div>
                  </div>

                  <Field
                    label="Main Keywords (SEO)"
                    value={keyword}
                    onChange={setKeyword}
                    placeholder="solo leveling, read solo leveling, manhwa, shadow monarch"
                    hint="Comma-separated keywords for meta tags and search discovery."
                  />

                  <Field
                    label="Base URL"
                    value={baseUrl}
                    onChange={setBaseUrl}
                    placeholder="https://sololeveling.readhub.com"
                    hint="Canonical root URL for OpenGraph cards, sitemaps, and RSS feeds."
                  />

                  <Field
                    label="Site Description"
                    value={description}
                    onChange={setDescription}
                    rows={3}
                    placeholder="Read Solo Leveling manhwa online in high quality with daily updates..."
                    hint="Summary snippet for search engine search result previews."
                  />
                </div>
              </Card>
            )}
          </div>
        )}

        {/* ── STEP 2: MANGA INFO ── */}
        {step === 2 && (
          <div className="mt-8 space-y-6">
            <Card
              title="2. Manga Metadata & Media"
              description="Primary manga series details, banner artworks, and promotional tags."
            >
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field
                    label="Manga Title"
                    value={mangaTitle}
                    onChange={(v) => {
                      setMangaTitle(v)
                      if (!mangaSlug) setMangaSlug(slugify(v))
                    }}
                    placeholder="e.g. Solo Leveling"
                    required
                  />
                  <Field
                    label="URL Slug"
                    value={mangaSlug}
                    onChange={setMangaSlug}
                    placeholder="solo-leveling"
                    action={
                      <button
                        type="button"
                        onClick={() => setMangaSlug(slugify(mangaTitle))}
                        className="text-[11px] font-semibold text-primary hover:underline"
                      >
                        Auto Slug
                      </button>
                    }
                  />
                </div>

                <Field
                  label="Summary / Synopsis"
                  value={mangaSummary}
                  onChange={setMangaSummary}
                  rows={4}
                  placeholder="In a world where hunters must battle deadly monsters..."
                />

                <Field
                  label="Genre Tags"
                  value={mangaTags}
                  onChange={setMangaTags}
                  placeholder="Action, Fantasy, Adventure, Super Power, Shounen"
                  hint="Comma-separated tag list."
                />

                {/* Cover Image Upload / URL */}
                <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-foreground">Cover Artwork</label>
                    <div className="flex rounded-lg border border-border bg-card p-0.5 text-xs shadow-sm">
                      <button
                        type="button"
                        onClick={() => setCoverMode('url')}
                        className={`px-2.5 py-1 rounded-md transition ${coverMode === 'url' ? 'bg-primary text-primary-foreground font-bold' : 'text-muted-foreground'}`}
                      >
                        URL
                      </button>
                      <button
                        type="button"
                        onClick={() => setCoverMode('file')}
                        className={`px-2.5 py-1 rounded-md transition ${coverMode === 'file' ? 'bg-primary text-primary-foreground font-bold' : 'text-muted-foreground'}`}
                      >
                        File Upload
                      </button>
                    </div>
                  </div>

                  {coverMode === 'url' ? (
                    <input
                      type="url"
                      value={mangaCover}
                      onChange={(e) => setMangaCover(e.target.value)}
                      placeholder="https://example.com/cover.jpg"
                      className="w-full rounded-xl border border-input bg-card px-3.5 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 shadow-sm"
                    />
                  ) : (
                    <div>
                      <input
                        ref={coverRef}
                        type="file"
                        accept="image/*"
                        onChange={handleCoverFile}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => coverRef.current?.click()}
                        disabled={uploadingCover}
                        className="flex items-center gap-2 rounded-xl border border-dashed border-border bg-card px-4 py-3 text-xs font-semibold text-foreground hover:border-primary transition w-full justify-center shadow-sm"
                      >
                        {uploadingCover ? <Loader2 size={16} className="animate-spin text-primary" /> : <Upload size={16} className="text-primary" />}
                        {uploadingCover ? 'Uploading Cover...' : 'Choose Image File (JPG, PNG, WEBP)'}
                      </button>
                    </div>
                  )}

                  {mangaCover && (
                    <div className="flex items-center gap-3 pt-2">
                      <img src={mangaCover} alt="Cover preview" className="h-16 w-12 object-cover rounded-lg border border-border shadow-sm" />
                      <span className="text-xs text-muted-foreground truncate max-w-md">{mangaCover}</span>
                    </div>
                  )}
                </div>

                {/* Banner Image Upload / URL */}
                <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-foreground">Hero Banner Artwork</label>
                    <div className="flex rounded-lg border border-border bg-card p-0.5 text-xs shadow-sm">
                      <button
                        type="button"
                        onClick={() => setBannerMode('url')}
                        className={`px-2.5 py-1 rounded-md transition ${bannerMode === 'url' ? 'bg-primary text-primary-foreground font-bold' : 'text-muted-foreground'}`}
                      >
                        URL
                      </button>
                      <button
                        type="button"
                        onClick={() => setBannerMode('file')}
                        className={`px-2.5 py-1 rounded-md transition ${bannerMode === 'file' ? 'bg-primary text-primary-foreground font-bold' : 'text-muted-foreground'}`}
                      >
                        File Upload
                      </button>
                    </div>
                  </div>

                  {bannerMode === 'url' ? (
                    <input
                      type="url"
                      value={mangaBanner}
                      onChange={(e) => setMangaBanner(e.target.value)}
                      placeholder="https://example.com/banner.jpg"
                      className="w-full rounded-xl border border-input bg-card px-3.5 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 shadow-sm"
                    />
                  ) : (
                    <div>
                      <input
                        ref={bannerRef}
                        type="file"
                        accept="image/*"
                        onChange={handleBannerFile}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => bannerRef.current?.click()}
                        disabled={uploadingBanner}
                        className="flex items-center gap-2 rounded-xl border border-dashed border-border bg-card px-4 py-3 text-xs font-semibold text-foreground hover:border-primary transition w-full justify-center shadow-sm"
                      >
                        {uploadingBanner ? <Loader2 size={16} className="animate-spin text-primary" /> : <Upload size={16} className="text-primary" />}
                        {uploadingBanner ? 'Uploading Banner...' : 'Choose Banner File (JPG, PNG, WEBP)'}
                      </button>
                    </div>
                  )}

                  {mangaBanner && (
                    <div className="flex items-center gap-3 pt-2">
                      <img src={mangaBanner} alt="Banner preview" className="h-12 w-32 object-cover rounded-lg border border-border shadow-sm" />
                      <span className="text-xs text-muted-foreground truncate max-w-md">{mangaBanner}</span>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* ── STEP 3: CHAPTERS ── */}
        {step === 3 && (
          <div className="mt-8 space-y-6">
            <Card
              title="3. Chapter Importer"
              description="Import chapter image manifests via CSV files or ZIP archives."
              action={
                chapters.length > 0 && (
                  <button
                    onClick={handleClearChapters}
                    className="flex items-center gap-1 text-xs text-destructive hover:underline"
                  >
                    <Trash2 size={13} /> Clear All Chapters
                  </button>
                )
              }
            >
              {/* Instructions Banner */}
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-xs text-foreground leading-relaxed space-y-1 mb-6">
                <p className="font-bold text-primary">Import Format Guidelines:</p>
                <p>• <b>CSV / TXT:</b> One image URL per line. Name the file <code>chapter-01.csv</code> or <code>1.txt</code>.</p>
                <p>• <b>ZIP Archive:</b> Compress folder structure containing chapters and image files.</p>
              </div>

              {/* Upload Dropzones */}
              <div className="grid gap-4 sm:grid-cols-3 mb-6">
                <input
                  ref={csvRef}
                  type="file"
                  multiple
                  accept=".csv,.txt"
                  onChange={handleCsvImport}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => csvRef.current?.click()}
                  disabled={importing}
                  className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card p-6 text-center hover:border-primary hover:shadow-md transition shadow-sm"
                >
                  <FileSpreadsheet size={28} className="text-primary mb-2" />
                  <span className="text-sm font-bold text-foreground">Upload CSV Manifests</span>
                  <span className="text-[11px] text-muted-foreground mt-1">Select multiple CSV/TXT files</span>
                </button>

                <input
                  ref={zipRef}
                  type="file"
                  accept=".zip"
                  onChange={handleZipImport}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => zipRef.current?.click()}
                  disabled={importing}
                  className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card p-6 text-center hover:border-primary hover:shadow-md transition shadow-sm"
                >
                  <Layers size={28} className="text-primary mb-2" />
                  <span className="text-sm font-bold text-foreground">Upload Chapter ZIP</span>
                  <span className="text-[11px] text-muted-foreground mt-1">Automatic folder extraction</span>
                </button>

                <button
                  type="button"
                  onClick={async () => {
                    const url = window.prompt('Enter WordPress site URL for REST API import:', 'https://example-manga-site.com')
                    if (!url || !url.trim() || !project) return
                    setImporting(true)
                    try {
                      const res = await wpImport.import(url.trim(), 'manga-1', project.id)
                      const updated = await projects.get(project.id)
                      if (updated.siteData?.manga?.[0]?.chapters) {
                        setChapters(updated.siteData.manga[0].chapters)
                      }
                      setImportMsg(`✓ Successfully imported ${res.importedCount} chapters from WordPress!`)
                    } catch (e: any) {
                      setImportMsg(`Error: ${e.message || 'WordPress import failed'}`)
                    } finally {
                      setImporting(false)
                    }
                  }}
                  disabled={importing}
                  className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card p-6 text-center hover:border-primary hover:shadow-md transition shadow-sm"
                >
                  <Globe2 size={28} className="text-primary mb-2" />
                  <span className="text-sm font-bold text-foreground">Import from WordPress</span>
                  <span className="text-[11px] text-muted-foreground mt-1">WordPress REST API Client</span>
                </button>
              </div>

              {importing && (
                <div className="flex items-center justify-center gap-2 py-6 text-sm text-primary">
                  <Loader2 size={18} className="animate-spin" /> Processing and registering chapters...
                </div>
              )}

              {importMsg && (
                <div className="mb-4 rounded-xl border border-primary/30 bg-primary/10 p-3 text-xs text-primary font-medium">
                  {importMsg}
                </div>
              )}

              {/* Chapters List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
                  <span>Registered Chapters ({chapters.length})</span>
                  <span>{totalPages} Total Pages</span>
                </div>

                {chapters.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border py-12 text-center text-xs text-muted-foreground">
                    No chapters yet — upload CSV files or a ZIP archive above.
                  </div>
                ) : (
                  <div className="max-h-64 overflow-y-auto divide-y divide-border rounded-xl border border-border bg-card shadow-sm">
                    {chapters.map((ch, idx) => (
                      <div key={idx} className="flex items-center justify-between px-4 py-3 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-muted-foreground">#{idx + 1}</span>
                          <span className="font-semibold text-foreground">{ch.title}</span>
                          <span className="font-mono text-[10px] text-muted-foreground">({ch.slug})</span>
                        </div>
                        <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold text-foreground">
                          {ch.images?.length ?? 0} pages
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Card>
          </div>
        )}

        {/* ── STEP 4: DESIGN & THEME ── */}
        {step === 4 && (
          <div className="mt-8 space-y-6">
            {/* Nav Links */}
            <Card
              title="Navigation Links"
              description="Header navigation bar links for this website."
              action={
                <button
                  type="button"
                  onClick={() => setNavLinks([...navLinks, { label: '', url: '' }])}
                  className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                >
                  <Plus size={14} /> Add Link
                </button>
              }
            >
              <div className="space-y-3">
                {navLinks.map((link, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <input
                      type="text"
                      value={link.label}
                      onChange={(e) => {
                        const copy = [...navLinks]
                        copy[idx].label = e.target.value
                        setNavLinks(copy)
                      }}
                      placeholder="Label (e.g. Latest)"
                      className="w-1/2 rounded-xl border border-input bg-card px-3.5 py-2 text-xs text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 shadow-sm"
                    />
                    <input
                      type="text"
                      value={link.url}
                      onChange={(e) => {
                        const copy = [...navLinks]
                        copy[idx].url = e.target.value
                        setNavLinks(copy)
                      }}
                      placeholder="URL (/latest or https://...)"
                      className="w-1/2 rounded-xl border border-input bg-card px-3.5 py-2 text-xs text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 shadow-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setNavLinks(navLinks.filter((_, i) => i !== idx))}
                      className="p-1 text-muted-foreground hover:text-destructive transition"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}
                {navLinks.length === 0 && (
                  <p className="text-xs text-muted-foreground italic">No custom nav links configured.</p>
                )}
              </div>
            </Card>

            {/* Sidebar Stats */}
            <Card title="Sidebar Series Stats" description="Highlight social proof metrics in the sidebar.">
              <div className="space-y-4">
                <Toggle
                  label="Display Sidebar Stats Box"
                  value={statsEnabled}
                  onChange={setStatsEnabled}
                />
                {statsEnabled && (
                  <div className="grid gap-3 sm:grid-cols-3 pt-2">
                    <Field label="Global Rank" value={statsRank} onChange={setStatsRank} placeholder="#4" />
                    <Field label="Monthly Readers" value={statsReaders} onChange={setStatsReaders} placeholder="1.2M" />
                    <Field label="Rating" value={statsRating} onChange={setStatsRating} placeholder="4.92 / 5.0" />
                  </div>
                )}
              </div>
            </Card>

            {/* Merchandise / Shop */}
            <Card
              title="Merchandise / Shop Section"
              description="Monetize with editorial merch or affiliate gear."
              action={
                shopEnabled && (
                  <button
                    type="button"
                    onClick={() =>
                      setShopProducts([
                        ...shopProducts,
                        { name: '', price: '$24.99', image_url: '', product_link: '#' },
                      ])
                    }
                    className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                  >
                    <Plus size={14} /> Add Product
                  </button>
                )
              }
            >
              <div className="space-y-4">
                <Toggle
                  label="Enable Shop Showcase"
                  value={shopEnabled}
                  onChange={setShopEnabled}
                />
                {shopEnabled && (
                  <div className="space-y-4 pt-2">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Field label="Section Title" value={shopTitle} onChange={setShopTitle} placeholder="Editorial Collection" />
                      <Field label="Main Shop Link" value={shopLink} onChange={setShopLink} placeholder="https://store.example.com" />
                    </div>

                    <div className="space-y-3 pt-2">
                      <span className="text-xs font-semibold text-foreground block">Featured Products ({shopProducts.length})</span>
                      {shopProducts.map((prod, idx) => (
                        <div key={idx} className="grid grid-cols-12 gap-2 rounded-xl border border-border bg-muted/20 p-3 items-center">
                          <div className="col-span-4">
                            <input
                              type="text"
                              value={prod.name}
                              onChange={(e) => {
                                const copy = [...shopProducts]
                                copy[idx].name = e.target.value
                                setShopProducts(copy)
                              }}
                              placeholder="Product Name"
                              className="w-full rounded-lg border border-input bg-card px-2.5 py-1.5 text-xs text-foreground focus:border-primary focus:outline-none"
                            />
                          </div>
                          <div className="col-span-2">
                            <input
                              type="text"
                              value={prod.price}
                              onChange={(e) => {
                                const copy = [...shopProducts]
                                copy[idx].price = e.target.value
                                setShopProducts(copy)
                              }}
                              placeholder="$29.99"
                              className="w-full rounded-lg border border-input bg-card px-2.5 py-1.5 text-xs text-foreground focus:border-primary focus:outline-none"
                            />
                          </div>
                          <div className="col-span-3">
                            <input
                              type="text"
                              value={prod.image_url}
                              onChange={(e) => {
                                const copy = [...shopProducts]
                                copy[idx].image_url = e.target.value
                                setShopProducts(copy)
                              }}
                              placeholder="Image URL"
                              className="w-full rounded-lg border border-input bg-card px-2.5 py-1.5 text-xs text-foreground focus:border-primary focus:outline-none"
                            />
                          </div>
                          <div className="col-span-2">
                            <input
                              type="text"
                              value={prod.product_link}
                              onChange={(e) => {
                                const copy = [...shopProducts]
                                copy[idx].product_link = e.target.value
                                setShopProducts(copy)
                              }}
                              placeholder="Product URL"
                              className="w-full rounded-lg border border-input bg-card px-2.5 py-1.5 text-xs text-foreground focus:border-primary focus:outline-none"
                            />
                          </div>
                          <div className="col-span-1 text-right">
                            <button
                              type="button"
                              onClick={() => setShopProducts(shopProducts.filter((_, i) => i !== idx))}
                              className="p-1 text-muted-foreground hover:text-destructive"
                            >
                              <X size={16} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </Card>

            {/* Footer */}
            <Card title="Footer Configuration" description="Legal links and copyright disclaimer.">
              <div className="space-y-4">
                <Field
                  label="Footer About Description"
                  value={footerAbout}
                  onChange={setFooterAbout}
                  rows={2}
                  placeholder="Official reading portal for Solo Leveling manhwa..."
                />
                <Field
                  label="Copyright Notice"
                  value={footerCopyright}
                  onChange={setFooterCopyright}
                  placeholder="© 2026 Solo Leveling Hub. All rights reserved."
                  hint="Leave blank for auto-generated current year copyright."
                />

                <div className="grid gap-3 sm:grid-cols-3 pt-2">
                  <Field label="Privacy Policy URL" value={privacyUrl} onChange={setPrivacyUrl} placeholder="/privacy.html" />
                  <Field label="Terms of Service URL" value={tosUrl} onChange={setTosUrl} placeholder="/tos.html" />
                  <Field label="DMCA Disclaimer URL" value={dmcaUrl} onChange={setDmcaUrl} placeholder="/dmca.html" />
                  <Field label="Cookie Policy URL" value={cookieUrl} onChange={setCookieUrl} placeholder="/cookies.html" />
                  <Field label="Contact URL" value={contactUrl} onChange={setContactUrl} placeholder="/contact.html" />
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* ── STEP 5: ADS & MONETIZATION ── */}
        {step === 5 && (
          <div className="mt-8 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-foreground font-headline">5. Advertising Placements</h2>
              <button
                type="button"
                onClick={() => setStep(6)}
                className="text-xs font-semibold text-primary hover:underline"
              >
                Skip Ads →
              </button>
            </div>

            {/* Top Banners */}
            <Card
              title="Top Header Ad Banners"
              description="Rendered at the top of every page."
              action={
                <button
                  type="button"
                  onClick={() =>
                    setAdBannersList([
                      ...adBannersList,
                      { enabled: true, mode: 'link', label: 'Top Banner', text: '', link_url: '#', image_url: '' },
                    ])
                  }
                  className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                >
                  <Plus size={14} /> Add Top Banner
                </button>
              }
            >
              <div className="space-y-4">
                {adBannersList.map((ad, idx) => (
                  <div key={idx} className="rounded-xl border border-border bg-muted/20 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <Toggle
                        label={`Banner #${idx + 1}`}
                        value={ad.enabled}
                        onChange={(v) => {
                          const copy = [...adBannersList]
                          copy[idx].enabled = v
                          setAdBannersList(copy)
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => setAdBannersList(adBannersList.filter((_, i) => i !== idx))}
                        className="text-xs text-destructive hover:underline"
                      >
                        Remove
                      </button>
                    </div>

                    <div className="flex gap-2 text-xs">
                      <button
                        type="button"
                        onClick={() => {
                          const copy = [...adBannersList]
                          copy[idx].mode = 'link'
                          setAdBannersList(copy)
                        }}
                        className={`px-3 py-1 rounded-lg transition ${ad.mode === 'link' ? 'bg-primary text-primary-foreground font-bold shadow-sm' : 'bg-muted text-muted-foreground'}`}
                      >
                        Link / Image
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const copy = [...adBannersList]
                          copy[idx].mode = 'html'
                          setAdBannersList(copy)
                        }}
                        className={`px-3 py-1 rounded-lg transition ${ad.mode === 'html' ? 'bg-primary text-primary-foreground font-bold shadow-sm' : 'bg-muted text-muted-foreground'}`}
                      >
                        Raw HTML / AdSense
                      </button>
                    </div>

                    {ad.mode === 'link' ? (
                      <div className="grid gap-3 sm:grid-cols-2">
                        <Field
                          label="Target Link URL"
                          value={ad.link_url || ''}
                          onChange={(v) => {
                            const copy = [...adBannersList]
                            copy[idx].link_url = v
                            setAdBannersList(copy)
                          }}
                          placeholder="https://sponsor.com"
                        />
                        <Field
                          label="Banner Image URL"
                          value={ad.image_url || ''}
                          onChange={(v) => {
                            const copy = [...adBannersList]
                            copy[idx].image_url = v
                            setAdBannersList(copy)
                          }}
                          placeholder="https://sponsor.com/banner.png"
                        />
                      </div>
                    ) : (
                      <Field
                        label="HTML Ad Snippet"
                        value={ad.html_code || ''}
                        onChange={(v) => {
                          const copy = [...adBannersList]
                          copy[idx].html_code = v
                          setAdBannersList(copy)
                        }}
                        rows={3}
                        placeholder="<script async src='...'></script>"
                      />
                    )}
                  </div>
                ))}
                {adBannersList.length === 0 && (
                  <p className="text-xs text-muted-foreground italic">No top ad banners defined.</p>
                )}
              </div>
            </Card>

            {/* Sidebar Ads */}
            <Card
              title="Sidebar Ads"
              description="Rendered in the sticky sidebar column."
              action={
                <button
                  type="button"
                  onClick={() =>
                    setSideAdsList([
                      ...sideAdsList,
                      { enabled: true, mode: 'link', label: 'Sidebar Ad', text: '', link_url: '#', image_url: '' },
                    ])
                  }
                  className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                >
                  <Plus size={14} /> Add Sidebar Ad
                </button>
              }
            >
              <div className="space-y-4">
                {sideAdsList.map((ad, idx) => (
                  <div key={idx} className="rounded-xl border border-border bg-muted/20 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <Toggle
                        label={`Sidebar Ad #${idx + 1}`}
                        value={ad.enabled}
                        onChange={(v) => {
                          const copy = [...sideAdsList]
                          copy[idx].enabled = v
                          setSideAdsList(copy)
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => setSideAdsList(sideAdsList.filter((_, i) => i !== idx))}
                        className="text-xs text-destructive hover:underline"
                      >
                        Remove
                      </button>
                    </div>

                    <div className="flex gap-2 text-xs">
                      <button
                        type="button"
                        onClick={() => {
                          const copy = [...sideAdsList]
                          copy[idx].mode = 'link'
                          setSideAdsList(copy)
                        }}
                        className={`px-3 py-1 rounded-lg transition ${ad.mode === 'link' ? 'bg-primary text-primary-foreground font-bold shadow-sm' : 'bg-muted text-muted-foreground'}`}
                      >
                        Link / Image
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const copy = [...sideAdsList]
                          copy[idx].mode = 'html'
                          setSideAdsList(copy)
                        }}
                        className={`px-3 py-1 rounded-lg transition ${ad.mode === 'html' ? 'bg-primary text-primary-foreground font-bold shadow-sm' : 'bg-muted text-muted-foreground'}`}
                      >
                        Raw HTML / AdSense
                      </button>
                    </div>

                    {ad.mode === 'link' ? (
                      <div className="grid gap-3 sm:grid-cols-2">
                        <Field
                          label="Target Link URL"
                          value={ad.link_url || ''}
                          onChange={(v) => {
                            const copy = [...sideAdsList]
                            copy[idx].link_url = v
                            setSideAdsList(copy)
                          }}
                          placeholder="https://sponsor.com"
                        />
                        <Field
                          label="Banner Image URL"
                          value={ad.image_url || ''}
                          onChange={(v) => {
                            const copy = [...sideAdsList]
                            copy[idx].image_url = v
                            setSideAdsList(copy)
                          }}
                          placeholder="https://sponsor.com/300x250.png"
                        />
                      </div>
                    ) : (
                      <Field
                        label="HTML Ad Snippet"
                        value={ad.html_code || ''}
                        onChange={(v) => {
                          const copy = [...sideAdsList]
                          copy[idx].html_code = v
                          setSideAdsList(copy)
                        }}
                        rows={3}
                        placeholder="<ins class='adsbygoogle' ...></ins>"
                      />
                    )}
                  </div>
                ))}
                {sideAdsList.length === 0 && (
                  <p className="text-xs text-muted-foreground italic">No sidebar ads defined.</p>
                )}
              </div>
            </Card>

            {/* After Chapters Ads */}
            <Card
              title="After Chapters Ad Zone"
              description="Rendered immediately below the chapter list on the reader and homepage."
              action={
                <button
                  type="button"
                  onClick={() =>
                    setAfterChaptersList([
                      ...afterChaptersList,
                      { enabled: true, mode: 'link', label: 'Bottom Banner', text: '', link_url: '#', image_url: '' },
                    ])
                  }
                  className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                >
                  <Plus size={14} /> Add Placement
                </button>
              }
            >
              <div className="space-y-4">
                {afterChaptersList.map((ad, idx) => (
                  <div key={idx} className="rounded-xl border border-border bg-muted/20 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <Toggle
                        label={`Placement #${idx + 1}`}
                        value={ad.enabled}
                        onChange={(v) => {
                          const copy = [...afterChaptersList]
                          copy[idx].enabled = v
                          setAfterChaptersList(copy)
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => setAfterChaptersList(afterChaptersList.filter((_, i) => i !== idx))}
                        className="text-xs text-destructive hover:underline"
                      >
                        Remove
                      </button>
                    </div>

                    <div className="flex gap-2 text-xs">
                      <button
                        type="button"
                        onClick={() => {
                          const copy = [...afterChaptersList]
                          copy[idx].mode = 'link'
                          setAfterChaptersList(copy)
                        }}
                        className={`px-3 py-1 rounded-lg transition ${ad.mode === 'link' ? 'bg-primary text-primary-foreground font-bold shadow-sm' : 'bg-muted text-muted-foreground'}`}
                      >
                        Link / Image
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const copy = [...afterChaptersList]
                          copy[idx].mode = 'html'
                          setAfterChaptersList(copy)
                        }}
                        className={`px-3 py-1 rounded-lg transition ${ad.mode === 'html' ? 'bg-primary text-primary-foreground font-bold shadow-sm' : 'bg-muted text-muted-foreground'}`}
                      >
                        Raw HTML / AdSense
                      </button>
                    </div>

                    {ad.mode === 'link' ? (
                      <div className="grid gap-3 sm:grid-cols-2">
                        <Field
                          label="Target Link URL"
                          value={ad.link_url || ''}
                          onChange={(v) => {
                            const copy = [...afterChaptersList]
                            copy[idx].link_url = v
                            setAfterChaptersList(copy)
                          }}
                          placeholder="https://sponsor.com"
                        />
                        <Field
                          label="Banner Image URL"
                          value={ad.image_url || ''}
                          onChange={(v) => {
                            const copy = [...afterChaptersList]
                            copy[idx].image_url = v
                            setAfterChaptersList(copy)
                          }}
                          placeholder="https://sponsor.com/728x90.png"
                        />
                      </div>
                    ) : (
                      <Field
                        label="HTML Ad Snippet"
                        value={ad.html_code || ''}
                        onChange={(v) => {
                          const copy = [...afterChaptersList]
                          copy[idx].html_code = v
                          setAfterChaptersList(copy)
                        }}
                        rows={3}
                      />
                    )}
                  </div>
                ))}
                {afterChaptersList.length === 0 && (
                  <p className="text-xs text-muted-foreground italic">No after-chapters ads configured.</p>
                )}
              </div>
            </Card>
          </div>
        )}

        {/* ── STEP 6: ABOUT & SEO TEXT ── */}
        {step === 6 && (
          <div className="mt-8 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-foreground font-headline">6. Long-Form Editorial & SEO Content</h2>
              <button
                type="button"
                onClick={() => setStep(7)}
                className="text-xs font-semibold text-primary hover:underline"
              >
                Skip Text →
              </button>
            </div>

            <Card
              title="HTML Editorial Article / Overview"
              description="Rich HTML content rendered on the series overview page for ranking signals."
              action={
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (!aboutHtml.trim()) {
                        setAboutHtml(
                          `<h2>About ${mangaTitle || 'This Manga'}</h2>\n<p>${description || 'Discover the complete storyline, latest official chapters, and character guides.'}</p>\n\n<h3>The Storyline</h3>\n<p>Follow the thrilling journey through high-stakes battles, intricate world-building, and legendary characters.</p>\n\n<h3>Why Read ${mangaTitle || 'Here'}?</h3>\n<ul>\n  <li><strong>High-Resolution Pages:</strong> Clean scans updated daily.</li>\n  <li><strong>Fast Reader:</strong> Mobile optimized and zero lag.</li>\n  <li><strong>Complete Archive:</strong> From chapter 1 to the newest release.</li>\n</ul>`
                        )
                      }
                    }}
                    className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                  >
                    📋 Insert Template
                  </button>
                  {aboutHtml && (
                    <button
                      type="button"
                      onClick={() => setAboutHtml('')}
                      className="text-xs text-muted-foreground hover:text-destructive"
                    >
                      Clear
                    </button>
                  )}
                </div>
              }
            >
              <div className="space-y-4">
                <div className="flex flex-wrap gap-1.5 text-[11px] text-muted-foreground">
                  <span className="font-semibold text-foreground">Supported Tags:</span>
                  <code className="rounded bg-muted px-1.5 py-0.5 text-primary font-mono">&lt;h2&gt;</code>
                  <code className="rounded bg-muted px-1.5 py-0.5 text-primary font-mono">&lt;h3&gt;</code>
                  <code className="rounded bg-muted px-1.5 py-0.5 text-primary font-mono">&lt;p&gt;</code>
                  <code className="rounded bg-muted px-1.5 py-0.5 text-primary font-mono">&lt;ul&gt;</code>
                  <code className="rounded bg-muted px-1.5 py-0.5 text-primary font-mono">&lt;strong&gt;</code>
                  <code className="rounded bg-muted px-1.5 py-0.5 text-primary font-mono">&lt;a href&gt;</code>
                </div>

                <textarea
                  rows={14}
                  value={aboutHtml}
                  onChange={(e) => setAboutHtml(e.target.value)}
                  placeholder="<h2>About the Series</h2>..."
                  className="w-full font-mono rounded-xl border border-input bg-card p-4 text-xs text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 shadow-sm"
                />

                {aboutHtml && (
                  <div className="rounded-xl border border-border bg-muted/20 p-5 mt-4">
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-3 font-headline">
                      Live Rendered Preview:
                    </span>
                    <div
                      className="prose prose-neutral dark:prose-invert prose-sm max-w-none text-foreground"
                      dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(aboutHtml) }}
                    />
                  </div>
                )}
              </div>
            </Card>
          </div>
        )}

        {/* ── STEP 7: SEO META & FAVICONS ── */}
        {step === 7 && (
          <div className="mt-8 space-y-6">
            {/* Favicons Generator */}
            <Card
              title="Favicon & Web Manifest Generator"
              description="Automatically generate 16x16, 32x32, 192x192, apple-touch, and ICO bundles from a source image."
            >
              <div className="space-y-4">
                <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div>
                    <span className="text-sm font-bold text-primary block font-headline">Instant Favicon Generator</span>
                    <span className="text-xs text-muted-foreground">
                      Upload any square PNG or JPG to create the full web manifest and icon bundle.
                    </span>
                  </div>
                  <label className="flex items-center gap-2 rounded-xl bg-primary text-primary-foreground px-4 py-2.5 text-xs font-bold shadow-md shadow-primary/20 hover:opacity-90 transition cursor-pointer">
                    {faviconUploading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                    {faviconUploading ? 'Generating...' : 'Upload Image & Download ZIP'}
                    <input
                      type="file"
                      accept="image/png,image/jpeg"
                      onChange={handleFaviconUpload}
                      disabled={faviconUploading}
                      className="hidden"
                    />
                  </label>
                </div>
                {faviconError && <p className="text-xs text-destructive">{faviconError}</p>}

                <div className="grid gap-3 sm:grid-cols-2 pt-2">
                  <Field label="Favicon ICO" value={seoFaviconIco} onChange={setSeoFaviconIco} placeholder="/favicon.ico" />
                  <Field label="Favicon 32x32 PNG" value={seoFavicon32} onChange={setSeoFavicon32} placeholder="/favicon-32x32.png" />
                  <Field label="Favicon 16x16 PNG" value={seoFavicon16} onChange={setSeoFavicon16} placeholder="/favicon-16x16.png" />
                  <Field label="Apple Touch Icon" value={seoAppleTouch} onChange={setSeoAppleTouch} placeholder="/apple-touch-icon.png" />
                </div>
                <Field label="Web App Manifest" value={seoManifest} onChange={setSeoManifest} placeholder="/site.webmanifest" />
              </div>
            </Card>

            {/* SEO Meta Tags */}
            <Card title="OpenGraph & Social Sharing Meta Tags" description="Social card displays across Twitter, Discord, and Facebook.">
              <div className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Author" value={seoAuthor} onChange={setSeoAuthor} placeholder="Manga Hub Editorial" />
                  <Field label="Robots" value={seoRobots} onChange={setSeoRobots} placeholder="index, follow" />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="OG Image URL" value={seoOgImage} onChange={setSeoOgImage} placeholder="https://example.com/og-card.jpg" />
                  <Field label="Twitter Card Type" value={seoTwitterCard} onChange={setSeoTwitterCard} placeholder="summary_large_image" />
                </div>
              </div>
            </Card>

            {/* FAQ Schema */}
            <Card
              title="FAQ Schema Markup (JSON-LD)"
              description="Boost Google SERP rich snippet visibility with structured Q&A pairs."
              action={
                <button
                  type="button"
                  onClick={() => setFaqItems([...faqItems, { q: '', a: '' }])}
                  className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                >
                  <Plus size={14} /> Add FAQ Item
                </button>
              }
            >
              <div className="space-y-4">
                {faqItems.map((item, idx) => (
                  <div key={idx} className="rounded-xl border border-border bg-muted/20 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-foreground font-headline">Question #{idx + 1}</span>
                      {faqItems.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setFaqItems(faqItems.filter((_, i) => i !== idx))}
                          className="text-xs text-destructive hover:underline"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                    <Field
                      label="Question"
                      value={item.q}
                      onChange={(v) => {
                        const copy = [...faqItems]
                        copy[idx].q = v
                        setFaqItems(copy)
                      }}
                      placeholder="e.g. When is the next chapter released?"
                    />
                    <Field
                      label="Answer"
                      value={item.a}
                      onChange={(v) => {
                        const copy = [...faqItems]
                        copy[idx].a = v
                        setFaqItems(copy)
                      }}
                      rows={2}
                      placeholder="e.g. New chapters are updated every Wednesday at 15:00 UTC."
                    />
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}

        {/* ── STEP 8: TRACKING & ANALYTICS + GENERATION ── */}
        {step === 8 && (
          <div className="mt-8 space-y-6">
            {/* Search Engine Verification */}
            <Card title="Search Engine Verification Codes" description="Claim site ownership in webmaster consoles.">
              <div className="grid gap-3 sm:grid-cols-3">
                <Field
                  label="Google Search Console"
                  value={seoGoogleVerify}
                  onChange={setSeoGoogleVerify}
                  placeholder="google-site-verification token"
                />
                <Field
                  label="Bing Webmaster"
                  value={seoBingVerify}
                  onChange={setSeoBingVerify}
                  placeholder="msvalidate.01 token"
                />
                <Field
                  label="Yandex Verification"
                  value={seoYandexVerify}
                  onChange={setSeoYandexVerify}
                  placeholder="yandex-verification token"
                />
              </div>
            </Card>

            {/* Analytics Tracking */}
            <Card title="Analytics & Session Recording" description="Track traffic, bounce rates, and user reader sessions.">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field
                  label="Google Analytics 4 (GA4)"
                  value={gaId}
                  onChange={setGaId}
                  placeholder="G-XXXXXXXXXX"
                />
                <Field
                  label="Microsoft Clarity Project ID"
                  value={clarityId}
                  onChange={setClarityId}
                  placeholder="e.g. k98f2h1a"
                />
              </div>
            </Card>

            {/* Ready to Generate Summary */}
            <Card title="Site Generation Summary" description="Review compiled build specifications before creating the static output.">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <tbody className="divide-y divide-border">
                    <tr>
                      <td className="py-2.5 font-semibold text-muted-foreground">Site Name</td>
                      <td className="py-2.5 font-bold text-foreground">{siteName || '—'}</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 font-semibold text-muted-foreground">Manga Series</td>
                      <td className="py-2.5 font-bold text-foreground">{mangaTitle || '—'}</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 font-semibold text-muted-foreground">Total Chapters</td>
                      <td className="py-2.5 font-bold text-primary">{chapters.length} chapters ({totalPages} pages)</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 font-semibold text-muted-foreground">Target Language</td>
                      <td className="py-2.5 font-bold text-foreground uppercase">{language}</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 font-semibold text-muted-foreground">Base Domain</td>
                      <td className="py-2.5 font-bold text-foreground">{baseUrl || 'https://localhost'}</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 font-semibold text-muted-foreground">FAQ Rich Snippets</td>
                      <td className="py-2.5 font-bold text-foreground">{faqItems.filter((f) => f.q && f.a).length} questions</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </Card>

            {/* Post Generation Success Card */}
            {generated && (
              <div className="rounded-2xl border border-primary/40 bg-primary/10 p-6 shadow-xl backdrop-blur-md space-y-4">
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-full bg-primary text-primary-foreground">
                    <Check size={22} strokeWidth={3} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-foreground font-headline">✓ Static Site Generated Successfully!</h3>
                    <p className="text-xs text-primary">All static HTML pages, reader templates, and sitemaps are ready.</p>
                  </div>
                </div>

                {!zipDeleted ? (
                  <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 text-yellow-600 dark:text-yellow-400 rounded-xl text-xs space-y-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="space-y-1">
                      <p className="font-bold">⚠️ Security Reminder: Clean Up ZIP Archives</p>
                      <p className="opacity-90">Avoid keeping static site ZIP archives on local server storage to optimize space and ensure file isolation. Delete the ZIP archive below after downloading.</p>
                    </div>
                    {project?.id && (
                      <button
                        type="button"
                        onClick={handleDeleteZip}
                        disabled={deletingZip}
                        className="shrink-0 flex items-center gap-1.5 rounded-lg bg-yellow-500 text-black font-bold px-3 py-1.5 hover:bg-yellow-400 transition"
                      >
                        {deletingZip ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />} Clean ZIP on Disk
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 rounded-xl text-xs font-bold">
                    ✓ Cleaned up: Generated ZIP archive has been safely wiped from project storage.
                  </div>
                )}

                 <div className="flex flex-wrap items-center gap-3 pt-2">
                  <a
                    href={`/sites/${mangaSlug || slugify(mangaTitle)}/`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 rounded-xl bg-primary text-primary-foreground px-5 py-2.5 text-xs font-bold shadow-md shadow-primary/20 hover:opacity-90 transition"
                  >
                    <Eye size={15} /> Preview Generated Site
                  </a>
                  {project?.id && !zipDeleted && (
                    <a
                      href={`/api/generate/${project.id}/download`}
                      className="flex items-center gap-2 rounded-xl border border-border bg-card px-5 py-2.5 text-xs font-bold text-foreground hover:border-primary hover:text-primary transition shadow-sm"
                    >
                      <Download size={15} /> Download ZIP Bundle
                    </a>
                  )}
                  <Link
                    to="/admin"
                    className="flex items-center gap-2 rounded-xl border border-[#006769]/30 bg-[#006769]/10 px-5 py-2.5 text-xs font-bold text-[#006769] dark:text-emerald-400 hover:bg-[#006769]/20 transition shadow-sm"
                  >
                    ← Back to Vos sites manga
                  </Link>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── WIZARD BOTTOM NAVIGATION BAR ── */}
        <div className="mt-10 flex items-center justify-between border-t border-border pt-6">
          {step > 1 ? (
            <button
              type="button"
              onClick={back}
              disabled={saving || generating}
              className="flex items-center gap-2 rounded-xl border border-border bg-card px-5 py-2.5 text-xs font-bold text-foreground hover:bg-muted transition shadow-sm"
            >
              <ArrowLeft size={16} /> Back
            </button>
          ) : (
            <div />
          )}

          {step < 8 ? (
            <button
              type="button"
              onClick={next}
              disabled={saving}
              className="flex items-center gap-2 rounded-xl bg-primary text-primary-foreground px-6 py-2.5 text-xs font-bold shadow-md shadow-primary/20 hover:opacity-90 transition"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : null}
              {saving ? 'Saving...' : 'Next Step'} <ArrowRight size={16} />
            </button>
          ) : generated ? (
            <Link
              to="/admin"
              className="flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white px-7 py-3 text-sm font-extrabold shadow-lg shadow-emerald-500/25 hover:opacity-90 transition"
            >
              <Check size={18} strokeWidth={3} /> Finish & Return to Sites
            </Link>
          ) : (
            <button
              type="button"
              onClick={handleGenerate}
              disabled={generating || saving}
              className="flex items-center gap-2 rounded-xl bg-primary text-primary-foreground px-7 py-3 text-sm font-extrabold shadow-lg shadow-primary/25 hover:opacity-90 transition"
            >
              {generating ? <Loader2 size={18} className="animate-spin" /> : <Zap size={18} />}
              {generating ? 'Generating Site Output...' : '⚡ Generate Site'}
            </button>
          )}
        </div>
      </main>

      {/* ── JSON IMPORT MODAL ── */}
      {jsonImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-base font-bold text-foreground flex items-center gap-2 font-headline">
                <FileCode size={18} className="text-primary" /> Import Config JSON
              </h3>
              <button
                type="button"
                onClick={() => setJsonImportModal(false)}
                className="p-1 text-muted-foreground hover:text-foreground"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-muted-foreground">
              Paste an AI-generated site configuration JSON or upload a <code>.json</code> file.
            </p>

            <div>
              <input
                ref={jsonImportFileRef}
                type="file"
                accept=".json"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (!f) return
                  const reader = new FileReader()
                  reader.onload = (ev) => {
                    const text = ev.target?.result as string
                    setJsonImportText(text)
                  }
                  reader.readAsText(f)
                }}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => jsonImportFileRef.current?.click()}
                className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-muted/30 p-3 text-xs font-semibold text-foreground hover:border-primary w-full transition shadow-sm"
              >
                <Upload size={14} className="text-primary" /> Upload .json file
              </button>
            </div>

            <div className="relative flex items-center justify-center">
              <span className="bg-card px-2 text-[10px] uppercase tracking-wider text-muted-foreground">
                or paste JSON directly
              </span>
            </div>

            <textarea
              rows={10}
              value={jsonImportText}
              onChange={(e) => setJsonImportText(e.target.value)}
              placeholder="{\n  &quot;site_name&quot;: &quot;Solo Leveling&quot;,\n  &quot;manga&quot;: [...]\n}"
              className="w-full font-mono rounded-xl border border-input bg-card p-3 text-xs text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 shadow-sm"
            />

            {jsonImportErr && <p className="text-xs text-destructive">{jsonImportErr}</p>}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setJsonImportModal(false)}
                className="rounded-xl border border-border px-4 py-2 text-xs font-bold text-muted-foreground hover:bg-muted"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={applyJsonImport}
                disabled={!jsonImportText.trim()}
                className="rounded-xl bg-primary text-primary-foreground px-5 py-2 text-xs font-bold shadow-md shadow-primary/20 hover:opacity-90 disabled:opacity-50 transition"
              >
                Apply & Continue
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
