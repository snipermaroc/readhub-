import { useEffect, useState, useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ChevronRight, ArrowRight, ShoppingBag, ExternalLink, MessageSquare, Twitter, Instagram, Youtube } from 'lucide-react'
import { supabase } from '@/lib/mangahub-db'
import MangaHeader from '@/components/MangaHeader'
import MangaFooter from '@/components/MangaFooter'

type Site = {
  id: string
  name: string
  slug: string
  subdomain: string
  description: string
  status: string
  language: string
  logo_url: string | null
  banner_url: string | null
}

type Manga = {
  id: string
  site_id: string
  title: string
  slug: string
  description: string
  cover_url: string | null
  genres: string[]
  views: number
  status: string
}

type Chapter = {
  id: string
  manga_id: string
  title: string
  slug: string
  chapter_number: number
  published_at: string | null
}

const defaultHero = '/assets/readhub-editorial-hero.webp'

export default function MangaNicheSite({ site: initialSite }: { site?: Site }) {
  const { subdomain, slug } = useParams<{ subdomain?: string; slug?: string }>()
  const [site, setSite] = useState<Site | null>(initialSite || null)
  const [manga, setManga] = useState<Manga[]>([])
  const [chapters, setChapters] = useState<Chapter[]>([])
  const [merchSettings, setMerchSettings] = useState<any>(null)
  const [socialSettings, setSocialSettings] = useState<any>(null)
  const [loading, setLoading] = useState(!initialSite)

  const targetIdentifier = subdomain || slug || initialSite?.subdomain

  useEffect(() => {
    let alive = true
    const loadSiteData = async () => {
      setLoading(true)

      let currentSite = initialSite

      if (!currentSite && targetIdentifier) {
        // 1. Fetch site by subdomain first, or fallback to slug
        const { data: subData } = await supabase
          .from('manga_sites')
          .select('*')
          .eq('subdomain', targetIdentifier)
          .maybeSingle()

        if (subData && alive) {
          currentSite = subData as Site
          setSite(currentSite)
        } else {
          const { data: slugData } = await supabase
            .from('manga_sites')
            .select('*')
            .eq('slug', targetIdentifier)
            .maybeSingle()

          if (slugData && alive) {
            currentSite = slugData as Site
            setSite(currentSite)
          }
        }
      }

      if (currentSite) {
        // Update document title for this niche site
        document.title = `Read ${currentSite.name} Manga Online`

        // 2. Fetch mangas for this site (with fallback to slug match)
        let { data: mData } = await supabase
          .from('manga')
          .select('*')
          .eq('site_id', currentSite.id)
          .order('views', { ascending: false })

        if (!mData || mData.length === 0) {
          const { data: fallbackManga } = await supabase
            .from('manga')
            .select('*')
            .or(`site_id.eq.${currentSite.id},slug.eq.${currentSite.slug},slug.eq.${targetIdentifier}`)
            .order('views', { ascending: false })
          if (fallbackManga && fallbackManga.length > 0) {
            mData = fallbackManga
          }
        }

        // 3. Fetch site settings (Merchandise, Socials, Theme) from Admin Control
        const [merchRes, socialRes] = await Promise.all([
          supabase
            .from('site_settings')
            .select('value')
            .eq('setting_key', 'merch')
            .or(`site_id.eq.${currentSite.id},site_id.is.null`)
            .maybeSingle(),
          supabase
            .from('site_settings')
            .select('value')
            .eq('setting_key', 'social')
            .or(`site_id.eq.${currentSite.id},site_id.is.null`)
            .maybeSingle(),
        ])

        if (alive) {
          const mangaList = (mData ?? []) as Manga[]
          setManga(mangaList)
          if (merchRes.data?.value) setMerchSettings(merchRes.data.value)
          if (socialRes.data?.value) setSocialSettings(socialRes.data.value)

          // 4. Fetch chapters for these mangas
          if (mangaList.length > 0) {
            const { data: chData } = await supabase
              .from('chapters')
              .select('*')
              .eq('manga_id', mangaList[0].id)
              .order('chapter_number', { ascending: false })

            if (alive && chData) {
              setChapters(chData as Chapter[])
            }
          }
        }
      } else {
        // Fallback demo site if viewing directly without db data
        const fallbackSite: Site = {
          id: 'berserk-edition',
          name: 'Berserk',
          slug: 'berserk',
          subdomain: 'berserk',
          description: 'Berserk Manga Read Hub is your destination for reading Berserk chapters online with a smooth and optimized reading experience.',
          status: 'active',
          language: 'en',
          logo_url: defaultHero,
          banner_url: defaultHero,
        }
        const fallbackManga: Manga = {
          id: 'berserk-main',
          site_id: 'berserk-edition',
          title: 'Berserk',
          slug: 'berserk',
          description: 'Guts, a former mercenary now known as the "Black Swordsman," is out for revenge. He journeys across a dark fantasy world with his gigantic sword, Dragon Slayer, seeking vengeance against those who wronged him.',
          cover_url: defaultHero,
          genres: ['Action', 'Dark Fantasy', 'Horror', 'Supernatural', 'Seinen'],
          views: 124500,
          status: 'published',
        }
        const fallbackChapters: Chapter[] = [
          { id: 'ch-383', manga_id: 'berserk-main', title: 'Chapter 383', slug: 'berserk-ch383', chapter_number: 383, published_at: new Date().toISOString() },
          { id: 'ch-382', manga_id: 'berserk-main', title: 'Chapter 382', slug: 'berserk-ch382', chapter_number: 382, published_at: new Date(Date.now() - 86400000 * 5).toISOString() },
          { id: 'ch-381', manga_id: 'berserk-main', title: 'Chapter 381', slug: 'berserk-ch381', chapter_number: 381, published_at: new Date(Date.now() - 86400000 * 15).toISOString() },
          { id: 'ch-001', manga_id: 'berserk-main', title: 'The Black Swordsman (Dark Horse Version)', slug: 'berserk-ch001-the-black-swordsmandark-horse-version', chapter_number: 1, published_at: new Date(Date.now() - 86400000 * 300).toISOString() },
        ]

        if (alive) {
          setSite(fallbackSite)
          setManga([fallbackManga])
          setChapters(fallbackChapters)
        }
      }

      if (alive) setLoading(false)
    }

    const lastFetchRef = { current: Date.now() }

    const handleFocusReload = () => {
      const now = Date.now()
      if (now - lastFetchRef.current > 5 * 60 * 1000) {
        lastFetchRef.current = now
        void loadSiteData()
      }
    }

    void loadSiteData()
    window.addEventListener('focus', handleFocusReload)
    return () => {
      alive = false
      window.removeEventListener('focus', handleFocusReload)
    }
  }, [targetIdentifier, initialSite])

  const siteName = site ? `Read ${site.name} Manga Online` : 'Read Berserk Manga Online'
  const primaryManga = manga[0]
  const bannerImage = site?.banner_url || primaryManga?.cover_url || defaultHero
  const coverImage = primaryManga?.cover_url || site?.logo_url || defaultHero

  // First & latest chapter calculation
  const sortedChapters = useMemo(() => {
    return [...chapters].sort((a, b) => b.chapter_number - a.chapter_number)
  }, [chapters])

  const firstChapter = sortedChapters.find(c => c.chapter_number === 1) || sortedChapters[sortedChapters.length - 1]
  const latestChapter = sortedChapters[0]

  const firstChapterUrl = firstChapter ? `/chapter/${firstChapter.slug}` : '/chapter/1'
  const latestChapterUrl = latestChapter ? `/chapter/${latestChapter.slug}` : '/chapter/1'

  const merchUrl = merchSettings?.product_url || undefined
  const merchTitle = merchSettings?.shop_title || `${site?.name || 'Berserk'} Merchandise`

  return (
    <div className="min-h-screen bg-surface dark:bg-[#0f1117] text-on-surface">
      {/* ── Fixed Header Component (Design System Section 6) ── */}
      <MangaHeader
        siteName={siteName}
        firstChapterUrl={firstChapterUrl}
        latestChapterUrl={latestChapterUrl}
        merchTitle={merchTitle}
        merchUrl={merchUrl}
      />

      {/* ── Main Layout: pt-20 max-w-screen-2xl mx-auto px-8 (Design System Section 9a) ── */}
      <main className="pt-20 pb-16 max-w-screen-2xl mx-auto px-6 md:px-8">
        {/* ── Section 1: Hero Banner (Design System 9a) ── */}
        <section className="mb-14">
          <div className="relative w-full aspect-[21/9] min-h-[360px] bg-surface-container-highest rounded-2xl overflow-hidden shadow-2xl">
            <img
              className="absolute inset-0 w-full h-full object-cover"
              src={bannerImage}
              alt={site?.name || 'Manga'}
              loading="eager"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/50 to-transparent flex flex-col justify-center px-8 md:px-16">
              <div className="max-w-xl">
                <span className="inline-block px-3 py-1 bg-primary text-white text-[10px] font-bold uppercase tracking-widest rounded-full mb-5">
                  Featured
                </span>
                <h2 className="text-4xl md:text-6xl font-extrabold font-headline text-white mb-3 tracking-tighter">
                  {primaryManga?.title || site?.name || 'Berserk'}
                </h2>
                <p className="text-white/75 text-sm md:text-base mb-7 font-body leading-relaxed line-clamp-3">
                  {primaryManga?.description || site?.description || 'Read chapters online with a smooth and optimized reading experience.'}
                </p>
                <div className="flex gap-4 flex-wrap">
                  <Link
                    to={firstChapterUrl}
                    className="bg-[#006769] hover:bg-[#005052] text-white px-8 py-3 rounded-xl font-bold text-sm transition-all shadow-xl inline-flex items-center gap-2"
                  >
                    Read Now <ArrowRight size={15} />
                  </Link>
                  <a
                    href="#chapters"
                    className="bg-white/10 hover:bg-white/20 backdrop-blur-md text-white px-8 py-3 rounded-xl font-bold text-sm border border-white/20 transition-all"
                  >
                    All Chapters
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Section 2: Manga Info + Chapter List (Design System 9a) ── */}
        <div className="flex flex-col lg:flex-row gap-12" id="chapters">
          <div className="flex-1">
            <div className="mb-16">
              {/* Cover + Meta */}
              <div className="flex flex-col sm:flex-row gap-7 mb-10">
                <div className="w-40 h-60 flex-shrink-0 bg-surface-container-highest rounded-xl shadow-xl overflow-hidden">
                  <img
                    className="w-full h-full object-cover"
                    src={coverImage}
                    alt={primaryManga?.title || site?.name || 'Manga Cover'}
                    loading="lazy"
                  />
                </div>
                <div className="flex flex-col justify-end pb-2">
                  {/* Genre tags */}
                  <div className="flex gap-2 mb-3 flex-wrap">
                    {primaryManga?.genres && primaryManga.genres.length > 0 ? (
                      primaryManga.genres.map(tag => (
                        <span
                          key={tag}
                          className="px-2 py-0.5 bg-primary-container text-on-primary-container text-[10px] font-bold uppercase tracking-wider rounded"
                        >
                          {tag}
                        </span>
                      ))
                    ) : (
                      <span className="px-2 py-0.5 bg-primary-container text-on-primary-container text-[10px] font-bold uppercase tracking-wider rounded">
                        Manga
                      </span>
                    )}
                  </div>
                  <h1 className="text-4xl font-extrabold font-headline tracking-tight text-on-surface mb-2">
                    {primaryManga?.title || site?.name || 'Manga'}
                  </h1>
                  <p className="text-secondary max-w-xl font-body leading-relaxed text-sm">
                    {primaryManga?.description || site?.description}
                  </p>
                  <div className="mt-5 flex gap-3 flex-wrap">
                    <Link
                      to={firstChapterUrl}
                      className="bg-[#006769] text-white px-7 py-2.5 rounded-lg font-bold text-sm transition-all shadow-lg hover:bg-[#005052]"
                    >
                      Read Chapter 1
                    </Link>
                    <Link
                      to={latestChapterUrl}
                      className="bg-surface-container-highest text-on-surface px-7 py-2.5 rounded-lg font-bold text-sm hover:bg-surface-container-high transition-colors"
                    >
                      Latest Chapter
                    </Link>
                  </div>
                </div>
              </div>

              {/* Chapter List Card */}
              <section className="bg-surface-container-lowest dark:bg-[#1a1d27] rounded-xl overflow-hidden shadow-sm border border-outline-variant/15">
                <div className="px-7 py-5 border-b border-outline-variant/15 flex justify-between items-center">
                  <h2 className="text-lg font-bold font-headline text-on-surface">
                    Chapters <span className="text-secondary font-normal text-sm">({chapters.length})</span>
                  </h2>
                </div>
                <div className="divide-y divide-outline-variant/10">
                  {chapters.map(ch => (
                    <Link
                      key={ch.id}
                      to={`/chapter/${ch.slug}`}
                      className="chapter-row px-7 py-4 flex items-center justify-between group cursor-pointer hover:bg-primary-container/20 transition-colors block"
                    >
                      <div className="flex items-center gap-5">
                        <p className="text-on-surface font-semibold text-sm group-hover:text-primary transition-colors">
                          Ch.{ch.chapter_number} - {ch.title}
                        </p>
                      </div>
                      <ChevronRight
                        size={18}
                        className="text-outline transition-transform group-hover:translate-x-1"
                      />
                    </Link>
                  ))}
                  {chapters.length === 0 && !loading && (
                    <p className="py-8 px-7 text-sm text-secondary">
                      No chapters available for this manga yet.
                    </p>
                  )}
                </div>
              </section>
            </div>
          </div>

          {/* Sidebar */}
          <aside className="lg:w-80 space-y-6">
            {/* Edition Details Card */}
            <div className="bg-surface-container-lowest dark:bg-[#1a1d27] rounded-xl p-6 border border-outline-variant/15 shadow-sm">
              <h3 className="text-sm font-bold font-headline text-on-surface mb-3 uppercase tracking-wider text-primary">
                About this Edition
              </h3>
              <p className="text-xs text-secondary leading-relaxed mb-4">
                {site?.description || `${site?.name || 'This edition'} is hosted on the READHUB network for optimized reader experience.`}
              </p>
              <div className="border-t border-outline-variant/15 pt-4 space-y-2.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-secondary">Language</span>
                  <b className="text-on-surface uppercase">{site?.language || 'EN'}</b>
                </div>
                <div className="flex justify-between">
                  <span className="text-secondary">Status</span>
                  <span className="px-2 py-0.5 rounded bg-green-500/10 text-green-600 font-bold text-[10px] uppercase">
                    {site?.status || 'Active'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-secondary">Available Chapters</span>
                  <b className="text-on-surface">{chapters.length}</b>
                </div>
              </div>
            </div>

            {/* Merchandise Card (Configured in Admin -> Boutique) */}
            {merchUrl && (
              <div className="bg-surface-container-lowest dark:bg-[#1a1d27] rounded-xl p-6 border border-outline-variant/15 shadow-sm">
                <div className="flex items-center gap-2 mb-2 text-primary">
                  <ShoppingBag size={16} />
                  <h4 className="text-sm font-bold font-headline text-on-surface">Official Merchandise</h4>
                </div>
                <p className="text-xs text-secondary leading-relaxed mb-4">
                  Support the series and explore official apparel, figures, and collector items.
                </p>
                <a
                  href={merchUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#006769] hover:bg-[#005052] text-white text-xs font-bold shadow transition"
                >
                  Visit Store <ExternalLink size={13} />
                </a>
              </div>
            )}

            {/* Social Links (Configured in Admin -> Réseaux sociaux) */}
            {socialSettings && (socialSettings.discord || socialSettings.x || socialSettings.instagram || socialSettings.youtube) && (
              <div className="bg-surface-container-lowest dark:bg-[#1a1d27] rounded-xl p-6 border border-outline-variant/15 shadow-sm">
                <h4 className="text-xs font-bold uppercase tracking-wider text-secondary mb-3">Community & Socials</h4>
                <div className="flex flex-wrap gap-2">
                  {socialSettings.discord && (
                    <a href={socialSettings.discord} target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg bg-surface-low dark:bg-[#1e2130] text-secondary hover:text-primary transition" title="Discord">
                      <MessageSquare size={16} />
                    </a>
                  )}
                  {socialSettings.x && (
                    <a href={socialSettings.x} target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg bg-surface-low dark:bg-[#1e2130] text-secondary hover:text-primary transition" title="X / Twitter">
                      <Twitter size={16} />
                    </a>
                  )}
                  {socialSettings.instagram && (
                    <a href={socialSettings.instagram} target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg bg-surface-low dark:bg-[#1e2130] text-secondary hover:text-primary transition" title="Instagram">
                      <Instagram size={16} />
                    </a>
                  )}
                  {socialSettings.youtube && (
                    <a href={socialSettings.youtube} target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg bg-surface-low dark:bg-[#1e2130] text-secondary hover:text-primary transition" title="YouTube">
                      <Youtube size={16} />
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Hub Return Link */}
            <div className="pt-2">
              <Link
                to="/"
                className="text-xs text-primary font-semibold hover:underline inline-flex items-center gap-1"
              >
                ← Explore more editions on READHUB
              </Link>
            </div>
          </aside>
        </div>
      </main>

      {/* ── Footer Component (Design System Section 7) ── */}
      <MangaFooter
        siteName={siteName}
        description={site?.description || 'Your premier destination for reading manga chapters online.'}
        firstChapterUrl={firstChapterUrl}
        latestChapterUrl={latestChapterUrl}
      />
    </div>
  )
}
