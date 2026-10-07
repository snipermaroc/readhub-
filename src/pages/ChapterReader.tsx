import { useEffect, useState, useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight, BookOpen, ArrowLeft } from 'lucide-react'
import { supabase } from '@/lib/mangahub-db'
import MangaHeader from '@/components/MangaHeader'
import MangaFooter from '@/components/MangaFooter'

type Manga = {
  id: string
  title: string
  slug: string
  description: string
  cover_url: string | null
  genres: string[]
}

type Chapter = {
  id: string
  manga_id: string
  title: string
  slug: string
  chapter_number: number
  published_at: string | null
}

export default function ChapterReader() {
  const { mangaSlug, chapterSlug } = useParams<{ mangaSlug?: string; chapterSlug: string }>()
  const [manga, setManga] = useState<Manga | null>(null)
  const [chapters, setChapters] = useState<Chapter[]>([])
  const [currentChapter, setCurrentChapter] = useState<Chapter | null>(null)
  const [chapterPages, setChapterPages] = useState<string[]>([])
  const [progress, setProgress] = useState(0)
  const [loading, setLoading] = useState(true)

  // Track scroll progress for reader bar
  useEffect(() => {
    const handleScroll = () => {
      const total = document.documentElement.scrollHeight - window.innerHeight
      if (total > 0) {
        setProgress((window.scrollY / total) * 100)
      }
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    let alive = true
    const loadData = async () => {
      setLoading(true)

      // 1. Fetch chapter
      const { data: chData } = await supabase
        .from('chapters')
        .select('*')
        .eq('slug', chapterSlug)
        .maybeSingle()

      if (!alive) return

      if (chData) {
        const ch = chData as Chapter
        setCurrentChapter(ch)

        // 1b. Fetch real chapter page images
        const { data: imgRows } = await supabase
          .from('chapter_images')
          .select('image_url, sort_order')
          .eq('chapter_id', ch.id)
          .order('sort_order', { ascending: true })

        if (alive && imgRows && imgRows.length > 0) {
          setChapterPages(imgRows.map((r: any) => r.image_url))
        } else {
          setChapterPages([])
        }

        // 2. Fetch manga
        const { data: mData } = await supabase
          .from('manga')
          .select('*')
          .eq('id', ch.manga_id)
          .maybeSingle()

        if (alive && mData) {
          setManga(mData as Manga)
        }

        // 3. Fetch all chapters for this manga
        const { data: allCh } = await supabase
          .from('chapters')
          .select('*')
          .eq('manga_id', ch.manga_id)
          .order('chapter_number', { ascending: false })

        if (alive && allCh) {
          setChapters(allCh as Chapter[])
        }
      } else {
        // Fallback demo chapter if not found in db
        const fallbackCh: Chapter = {
          id: 'demo-1',
          manga_id: 'demo-manga',
          title: `Chapter ${chapterSlug || '1'}`,
          slug: chapterSlug || '1',
          chapter_number: parseFloat(chapterSlug || '1') || 1,
          published_at: new Date().toISOString(),
        }
        const fallbackManga: Manga = {
          id: 'demo-manga',
          title: 'Berserk',
          slug: 'berserk',
          description: 'Guts, a former mercenary now known as the "Black Swordsman," is out for revenge.',
          cover_url: '/assets/readhub-editorial-hero.webp',
          genres: ['Action', 'Dark Fantasy', 'Supernatural'],
        }
        setCurrentChapter(fallbackCh)
        setManga(fallbackManga)
        setChapters([fallbackCh])
        setChapterPages([])
      }

      setLoading(false)
    }

    void loadData()
    return () => {
      alive = false
    }
  }, [chapterSlug])

  // Sorted chapters ascending for Prev/Next
  const sortedAsc = useMemo(() => {
    return [...chapters].sort((a, b) => a.chapter_number - b.chapter_number)
  }, [chapters])

  const currentIndex = sortedAsc.findIndex(c => c.slug === currentChapter?.slug)
  const prevChapter = currentIndex > 0 ? sortedAsc[currentIndex - 1] : null
  const nextChapter = currentIndex >= 0 && currentIndex < sortedAsc.length - 1 ? sortedAsc[currentIndex + 1] : null

  const prevUrl = prevChapter ? `/chapter/${prevChapter.slug}` : null
  const nextUrl = nextChapter ? `/chapter/${nextChapter.slug}` : null

  // Reading pages (from database, or fallback if none)
  const pages = chapterPages.length > 0 ? chapterPages : [
    '/assets/readhub-editorial-hero.webp',
    '/assets/readhub-editorial-hero.webp',
  ]

  const mangaTitle = manga?.title || 'Read Berserk Manga Online'
  const chapterTitle = currentChapter ? `Ch.${currentChapter.chapter_number} - ${currentChapter.title}` : `Chapter ${chapterSlug}`

  return (
    <div className="min-h-screen bg-surface dark:bg-[#0f1117] text-on-surface">
      <MangaHeader
        siteName={mangaTitle}
        isReader={true}
        prevUrl={prevUrl}
        nextUrl={nextUrl}
        chapterProgress={progress}
      />

      <main className="pt-20 max-w-screen-2xl mx-auto px-6 md:px-8 pb-20">
        {/* Breadcrumb + Title + Nav */}
        <div className="py-8 flex flex-col md:flex-row md:items-end justify-between gap-5 border-b border-outline-variant/15">
          <div>
            <nav className="flex items-center gap-2 text-xs text-secondary mb-2 uppercase tracking-wide">
              <Link className="hover:text-primary transition-colors" to="/">
                Home
              </Link>
              <span>›</span>
              <span className="text-on-surface font-semibold">{chapterTitle}</span>
            </nav>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-on-surface font-headline">
              {mangaTitle} <span className="text-primary">{chapterTitle}</span>
            </h1>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {prevUrl && (
              <Link
                to={prevUrl}
                className="flex items-center gap-1 px-5 py-2.5 bg-surface-container-highest text-on-surface rounded-lg font-bold text-sm hover:bg-surface-container-high transition-colors"
              >
                <ChevronLeft size={16} /> Prev
              </Link>
            )}
            {nextUrl ? (
              <Link
                to={nextUrl}
                className="flex items-center gap-2 px-7 py-2.5 bg-[#006769] hover:bg-[#005052] text-white rounded-lg font-bold text-sm shadow-md transition-all"
              >
                Next Chapter <ChevronRight size={16} />
              </Link>
            ) : (
              <Link
                to="/"
                className="flex items-center gap-2 px-7 py-2.5 bg-[#006769] hover:bg-[#005052] text-white rounded-lg font-bold text-sm shadow-md transition-all"
              >
                All Chapters
              </Link>
            )}
          </div>
        </div>

        {/* 12-Column Grid: Reader (9 cols) + Sidebar (3 cols) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mt-8">
          {/* Reader: 9 Columns */}
          <div className="lg:col-span-9">
            <div id="reader" className="bg-surface-container-lowest dark:bg-[#1a1d27] rounded-2xl shadow-sm border border-outline-variant/10 overflow-hidden p-2 md:p-6 space-y-4">
              {pages.map((src, i) => (
                <div key={i} className="overflow-hidden rounded-lg shadow-sm">
                  <img
                    src={src}
                    alt={`Page ${i + 1}`}
                    className="w-full h-auto block object-cover"
                    loading={i === 0 ? 'eager' : 'lazy'}
                    decoding="async"
                    referrerPolicy="no-referrer"
                    crossOrigin="anonymous"
                    onError={(e) => {
                      const target = e.currentTarget;
                      if (!target.dataset.retried && src.startsWith('http') && !src.startsWith('/api/manga-import/proxy-image')) {
                        target.dataset.retried = 'true';
                        target.src = `/api/manga-import/proxy-image?url=${encodeURIComponent(src)}`;
                      }
                    }}
                  />
                </div>
              ))}
            </div>

            {/* Bottom Prev/Next navigation */}
            <div className="flex justify-center items-center gap-4 py-10">
              {prevUrl ? (
                <Link
                  to={prevUrl}
                  className="px-8 py-3 bg-surface-container-high dark:bg-[#2c3040] text-on-surface font-bold text-sm rounded-lg hover:bg-surface-container-highest transition-colors"
                >
                  ← Previous
                </Link>
              ) : null}
              {nextUrl ? (
                <Link
                  to={nextUrl}
                  className="px-10 py-3 bg-[#006769] hover:bg-[#005052] text-white font-bold text-sm rounded-lg shadow-lg transition-all"
                >
                  Read Next Chapter →
                </Link>
              ) : (
                <Link
                  to="/"
                  className="px-10 py-3 bg-[#006769] hover:bg-[#005052] text-white font-bold text-sm rounded-lg shadow-lg transition-all"
                >
                  Back to Catalogue →
                </Link>
              )}
            </div>

            {/* Description Block */}
            {manga && (
              <div className="bg-surface-container-low dark:bg-[#1e2130] p-6 rounded-2xl mb-8 border border-outline-variant/10">
                <h2 className="text-lg font-bold text-on-surface font-headline mb-3">
                  {manga.title} — {chapterTitle}
                </h2>
                <p className="text-secondary leading-relaxed text-sm">
                  {manga.description || 'Enjoy reading this manga chapter with high quality images on READHUB.'}
                </p>
              </div>
            )}
          </div>

          {/* Sidebar: 3 Columns */}
          <aside className="lg:col-span-3 space-y-6">
            <div className="bg-surface-container-lowest dark:bg-[#1a1d27] rounded-2xl shadow-sm border border-outline-variant/10 p-5 sticky top-24">
              <h3 className="text-sm font-bold text-on-surface font-headline mb-4 flex items-center justify-between">
                <span className="truncate">{mangaTitle}</span>
                <span className="text-secondary font-normal text-xs">({chapters.length} ch)</span>
              </h3>

              {/* Scrollable Chapter List */}
              <div className="space-y-1 max-h-96 overflow-y-auto pr-1 divide-y divide-outline-variant/10">
                {chapters.map(ch => {
                  const active = ch.slug === currentChapter?.slug
                  return (
                    <Link
                      key={ch.id}
                      to={`/chapter/${ch.slug}`}
                      className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-colors ${
                        active
                          ? 'bg-primary text-white font-bold'
                          : 'text-on-surface hover:bg-primary-container/30 hover:text-primary'
                      }`}
                    >
                      <span className="truncate">Ch.{ch.chapter_number} - {ch.title}</span>
                      <ChevronRight size={14} className="opacity-50 shrink-0" />
                    </Link>
                  )
                })}
              </div>
            </div>
          </aside>
        </div>
      </main>

      <MangaFooter siteName={mangaTitle} />
    </div>
  )
}
