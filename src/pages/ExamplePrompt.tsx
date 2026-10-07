import React, { useMemo, useRef, useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowLeft,
  Bot,
  Check,
  Copy,
  ExternalLink,
  FileCode,
  Sparkles,
  HelpCircle,
  Globe,
  ArrowRight,
  BookOpen,
  Search,
  Loader2,
  Image as ImageIcon,
  Star,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { LanguageToggle } from '@/components/LanguageToggle'
import { ThemeToggle } from '@/components/ThemeToggle'

const RAW_PROMPT = `You are an expert Manga Portal Configuration Architect and Data Engineer.
Generate a complete, production-ready, fully validated JSON configuration object for a dedicated manga niche portal.

Target Manga: [MANGA_NAME]
Reference Source URL: [MANGA_URL]

================================================================================
SECTION 1 — JSON STRUCTURE CONTRACT
================================================================================
Return ONLY a valid JSON object matching this exact schema:

{
  "site_name": "[Manga Title] Hub",
  "keyword": "read [manga title], [manga title] manga, [manga title] raw, [manga title] scans, manhwa",
  "language": "en",
  "baseUrl": "https://[manga-slug].readhub.com",
  "manga": [
    {
      "title": "[Manga Title]",
      "slug": "[manga-slug]",
      "cover": "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=600",
      "banner": "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200",
      "summary": "[Provide a detailed 2-3 paragraph official storyline synopsis for this series.]",
      "tags": ["Action", "Fantasy", "Adventure", "Super Power", "Shounen"],
      "chapters": [
        {
          "title": "Chapter 1: The Beginning",
          "slug": "chapter-1",
          "chapter_number": 1,
          "images": [
            "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=1000",
            "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=1000"
          ]
        },
        {
          "title": "Chapter 2: The Awakening",
          "slug": "chapter-2",
          "chapter_number": 2,
          "images": [
            "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1000"
          ]
        },
        {
          "title": "Chapter 3: The Trial",
          "slug": "chapter-3",
          "chapter_number": 3,
          "images": [
            "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=1000"
          ]
        }
      ]
    }
  ],
  "config": {
    "description": "Read [Manga Title] online in high quality. Updated daily with the latest official chapters, character guides, and raw scanlations.",
    "theme": {
      "primary_color": "#10b981",
      "secondary_color": "#059669",
      "accent_color": "#3b82f6",
      "background": "dark"
    },
    "layout": {
      "reader_mode": "vertical",
      "sidebar_position": "right"
    },
    "nav": {
      "links": [
        { "label": "All Chapters", "url": "#chapters" },
        { "label": "Storyline", "url": "#about" },
        { "label": "Community", "url": "#comments" }
      ]
    },
    "ads": {
      "header_banner": { "enabled": true, "html": "<div class='p-4 bg-muted text-center text-xs'>Sponsor Banner</div>" },
      "sidebar_ad": { "enabled": true, "html": "<div class='p-4 bg-muted text-center text-xs'>Sidebar Ad</div>" },
      "chapter_bottom": { "enabled": true, "html": "<div class='p-4 bg-muted text-center text-xs'>Bottom Chapter Banner</div>" }
    },
    "footer": {
      "about": "Official fan portal dedicated to [Manga Title]. Read all latest chapters online free.",
      "copyright": "© 2026 [Manga Title] Hub. All rights reserved.",
      "links": [
        { "label": "Privacy Policy", "url": "/privacy.html" },
        { "label": "Terms of Service", "url": "/tos.html" },
        { "label": "DMCA", "url": "/dmca.html" },
        { "label": "Contact", "url": "/contact.html" }
      ]
    },
    "about_html": "<h2>About [Manga Title]</h2>\\n<p>[Detailed series overview and history]</p>\\n<h3>The Plot</h3>\\n<p>[Plot breakdown]</p>\\n<h3>Why Read Here?</h3>\\n<ul>\\n  <li><strong>HD Quality:</strong> Clean scans updated fast.</li>\\n  <li><strong>Fast Reader:</strong> Zero lag and mobile friendly.</li>\\n</ul>",
    "contact": {
      "email": "contact@[manga-slug].com",
      "form_enabled": true
    },
    "seo": {
      "favicons": {
        "favicon_ico": "/favicon.ico",
        "favicon_16": "/favicon-16x16.png",
        "favicon_32": "/favicon-32x32.png",
        "apple_touch_icon": "/apple-touch-icon.png",
        "android_192": "/android-chrome-192x192.png",
        "android_512": "/android-chrome-512x512.png"
      },
      "meta": {
        "author": "[Manga Title] Hub Editorial",
        "robots": "index, follow",
        "og_image": "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200",
        "twitter_card": "summary_large_image"
      },
      "faq": [
        { "q": "Where can I read [Manga Title] online?", "a": "You can read all official chapters of [Manga Title] right here with fast updates." },
        { "q": "Is [Manga Title] free to read?", "a": "Yes, all published chapters are available free for reading online." },
        { "q": "How often are new chapters released?", "a": "New chapters are updated as soon as official raw scans and translations are released." }
      ],
      "verification": {
        "google_site_verification": "g_verify_token_here",
        "bing_site_verification": "b_verify_token_here",
        "yandex_verification": "y_verify_token_here"
      }
    },
    "analytics": {
      "google_analytics": "G-XXXXXXXXXX",
      "microsoft_clarity": "clarity_id_here"
    }
  }
}

================================================================================
SECTION 2 — FOOTER ABOUT HTML STRUCTURE
================================================================================
The \`about_html\` field inside \`config\` must contain valid HTML with this structure:
<h2>About [Manga Name]</h2>
<p>[Compelling 2-sentence intro about the series history and author]</p>
<h3>The Storyline</h3>
<p>[Detailed summary of core conflict, protagonist arc, and world-building]</p>
<h3>Why Read [Manga Name] Here?</h3>
<ul>
  <li><strong>HD Scans:</strong> Crisp, high-resolution pages formatted for mobile and desktop.</li>
  <li><strong>Instant Updates:</strong> Get notified immediately when new chapters drop.</li>
  <li><strong>Zero Distractions:</strong> Clean reader mode built for immersive reading.</li>
</ul>

================================================================================
SECTION 3 — COLOR THEME GUIDE
================================================================================
Select appropriate hex theme colors based on the series primary genre:

Genre                   | primary_color | secondary_color | accent_color
------------------------|---------------|-----------------|--------------
Dark Fantasy / Horror   | #8b5cf6       | #7c3aed          | #ec4899
Action / Shonen         | #ef4444       | #dc2626          | #fbbf24
Romance / Slice of Life | #ec4899       | #db2777          | #a78bfa
Adventure / Fantasy     | #10b981       | #059669          | #3b82f6
Mystery / Thriller      | #6366f1       | #4f46e5          | #ef4444
Comedy / Parody         | #f59e0b       | #d97706          | #10b981

================================================================================
SECTION 4 — CRITICAL VALIDATION RULES
================================================================================
1. Keywords: comma-separated list of 5-7 target search phrases.
2. Description: natural sentence, max 160 characters.
3. Base URL: must be a real or plausible deployed domain.
4. \`manga\` MUST be an array containing at least 1 manga object.
5. **FAQ ITEMS MUST USE "q" AND "a" KEYS** (Do NOT use "question" and "answer").
6. SEO Author: set to "[Manga Title] Hub Editorial".
7. Chapters: include at least 3-5 sample chapter objects with valid titles and slugs.
8. Tags: array of 6-8 relevant genre tags.
9. Do not mix keywords and descriptions into wrong fields.
10. Do not leave placeholder strings like "[Insert here]" in the final output.
11. Do not invent fake, nonsensical facts — ground the synopsis in real series lore from the reference URL.

================================================================================
SECTION 5 — OUTPUT INSTRUCTIONS
================================================================================
Please provide:
1. The complete, strictly valid JSON configuration inside a single \`\`\`json codeblock.
2. A brief 2-sentence verification summary of the storyline incorporated.
3. A 1-sentence note explaining the color theme chosen for this genre.`

interface MangaSearchResult {
  title: string
  url: string
  image: string
  score?: number
  type?: string
}

export default function ExamplePrompt() {
  const { t } = useTranslation()
  const [mangaName, setMangaName] = useState<string>('')
  const [mangaUrl, setMangaUrl] = useState<string>('')
  const [copied, setCopied] = useState<boolean>(false)

  // Live Manga Search
  const [searchResults, setSearchResults] = useState<MangaSearchResult[]>([])
  const [searching, setSearching] = useState<boolean>(false)
  const [showDropdown, setShowDropdown] = useState<boolean>(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)
    }
  }, [])

  // Auto-search MyAnimeList API when mangaName changes
  useEffect(() => {
    if (!mangaName.trim() || mangaName.trim().length < 2) {
      setSearchResults([])
      setShowDropdown(false)
      return
    }

    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)

    searchTimeoutRef.current = setTimeout(() => {
      setSearching(true)
      fetch(`https://api.jikan.moe/v4/manga?q=${encodeURIComponent(mangaName.trim())}&limit=5`)
        .then((res) => res.json())
        .then((json) => {
          if (Array.isArray(json.data)) {
            const results: MangaSearchResult[] = json.data.map((item: any) => ({
              title: item.title_english || item.title || 'Manga',
              url: item.url || `https://myanimelist.net/manga/${item.mal_id}`,
              image: item.images?.jpg?.image_url || '',
              score: item.score,
              type: item.type,
            }))
            setSearchResults(results)
            setShowDropdown(results.length > 0)
          }
        })
        .catch(() => {
          setSearchResults([])
        })
        .finally(() => {
          setSearching(false)
        })
    }, 400)
  }, [mangaName])

  const selectSearchResult = (item: MangaSearchResult) => {
    setMangaName(item.title)
    setMangaUrl(item.url)
    setShowDropdown(false)
  }

  const finalPrompt = useMemo(() => {
    return RAW_PROMPT.replace(
      /\[MANGA_NAME\]/g,
      mangaName.trim() || '[ENTER MANGA NAME HERE]'
    ).replace(
      /\[MANGA_URL\]/g,
      mangaUrl.trim() || '[ENTER MYANIMELIST/ANILIST/OFFICIAL URL HERE]'
    )
  }, [mangaName, mangaUrl])

  const isReady = Boolean(mangaName.trim() && mangaUrl.trim())

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(finalPrompt)
    } catch {
      const ta = document.createElement('textarea')
      ta.value = finalPrompt
      document.body.appendChild(ta)
      ta.select()
      // @ts-ignore
      document.execCommand('copy')
      document.body.removeChild(ta)
    }
    setCopied(true)
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(() => setCopied(false), 2500)
  }

  const queryTerm = mangaName.trim() || 'Solo Leveling'

  return (
    <div className="min-h-screen bg-background text-foreground pb-20">
      {/* Top Header */}
      <header className="sticky top-0 z-30 border-b border-border/80 bg-background/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Link
              to="/admin"
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground transition shadow-sm"
              title="Return to Admin Console"
            >
              <ArrowLeft size={18} />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold tracking-tight text-foreground font-headline">READHUB</span>
                <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-bold text-primary border border-primary/20">
                  AI PROMPT GENERATOR
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Structured prompt generator for ChatGPT & Claude
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <LanguageToggle />
            <Link
              to="/create"
              className="flex items-center gap-1.5 rounded-lg bg-primary text-primary-foreground px-3.5 py-1.5 text-xs font-semibold shadow-sm hover:opacity-90 transition"
            >
              <FileCode size={14} /> Wizard
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="mx-auto max-w-5xl px-4 sm:px-6 pt-8 space-y-8">
        {/* Title Header Banner */}
        <div className="rounded-2xl border border-border bg-card p-6 md:p-8 shadow-sm">
          <div className="flex items-center gap-3 text-primary mb-2">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 border border-primary/20">
              <Bot size={22} />
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold font-headline tracking-tight text-foreground">
              🤖 AI Manga JSON Prompt
            </h1>
          </div>
          <p className="mt-2 text-sm text-muted-foreground leading-relaxed max-w-2xl">
            Fill in the target manga title and reference source URL below to generate a tailored AI prompt. Copy and paste it into ChatGPT, Claude, or Gemini to receive a complete, valid JSON configuration ready for instant import in the Site Builder Wizard.
          </p>
        </div>

        {/* Step 1 Card: Personalization Inputs with Auto-Search */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-5">
          <div className="flex items-center justify-between border-b border-border pb-4">
            <div>
              <span className="text-xs uppercase font-bold text-primary tracking-wider font-headline">Step 1</span>
              <h2 className="text-lg font-bold text-foreground font-headline mt-0.5">
                Target Series Details
              </h2>
            </div>

            {/* Status Pill */}
            {isReady ? (
              <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 px-3 py-1 text-xs font-semibold">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                Prompt ready — copy and paste to AI
              </span>
            ) : (
              <span className="flex items-center gap-1.5 rounded-full bg-muted text-muted-foreground border border-border px-3 py-1 text-xs font-medium">
                <span className="h-2 w-2 rounded-full bg-muted-foreground/60" />
                Fill both fields to personalize prompt
              </span>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {/* Manga Name with Instant Search Suggestions */}
            <div className="space-y-1.5 relative">
              <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                Manga Name <span className="text-destructive font-bold">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={mangaName}
                  onChange={(e) => setMangaName(e.target.value)}
                  onFocus={() => searchResults.length > 0 && setShowDropdown(true)}
                  placeholder="e.g. Solo Leveling"
                  className="w-full rounded-xl border border-input bg-card px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 shadow-sm transition pr-9"
                />
                {searching ? (
                  <Loader2 size={16} className="animate-spin text-primary absolute right-3 top-3" />
                ) : (
                  <Search size={16} className="text-muted-foreground absolute right-3 top-3" />
                )}
              </div>

              {/* Instant Search Dropdown */}
              {showDropdown && searchResults.length > 0 && (
                <div className="absolute left-0 right-0 z-20 mt-1 max-h-60 overflow-y-auto rounded-xl border border-border bg-card shadow-2xl divide-y divide-border">
                  <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground bg-muted/30">
                    Auto-Discovered Series (Click to Select)
                  </div>
                  {searchResults.map((res, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => selectSearchResult(res)}
                      className="w-full flex items-center gap-3 p-2.5 text-left hover:bg-muted/50 transition"
                    >
                      {res.image ? (
                        <img src={res.image} alt="" className="h-10 w-8 object-cover rounded border border-border shrink-0" />
                      ) : (
                        <div className="h-10 w-8 bg-muted rounded border border-border grid place-items-center shrink-0">
                          <ImageIcon size={14} className="text-muted-foreground" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-foreground truncate">{res.title}</p>
                        <p className="text-[10px] text-muted-foreground truncate">{res.url}</p>
                      </div>
                      {res.score && (
                        <span className="flex items-center gap-1 text-[11px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full shrink-0">
                          <Star size={10} className="fill-primary" /> {res.score}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Manga URL Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                Manga URL / Reference Link <span className="text-destructive font-bold">*</span>
              </label>
              <input
                type="url"
                value={mangaUrl}
                onChange={(e) => setMangaUrl(e.target.value)}
                placeholder="https://myanimelist.net/manga/121496/Solo_Leveling"
                className="w-full rounded-xl border border-input bg-card px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 shadow-sm transition"
              />
              <p className="text-[11px] text-muted-foreground">
                Hint: Paste MyAnimeList, AniList, or MangaUpdates series URL above.
              </p>
            </div>
          </div>

          {/* Quick Database Search Links */}
          <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-2">
            <span className="text-xs font-bold text-foreground font-headline block">
              🔍 Quick Link Search Tools (Find & Copy Series URLs):
            </span>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <a
                href={`https://myanimelist.net/manga.php?q=${encodeURIComponent(queryTerm)}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 font-semibold text-foreground hover:border-primary hover:text-primary transition shadow-sm"
              >
                💙 Search MyAnimeList <ExternalLink size={12} />
              </a>

              <a
                href={`https://anilist.co/search/manga?search=${encodeURIComponent(queryTerm)}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 font-semibold text-foreground hover:border-primary hover:text-primary transition shadow-sm"
              >
                🟣 Search AniList <ExternalLink size={12} />
              </a>

              <a
                href={`https://www.mangaupdates.com/series.html?search=${encodeURIComponent(queryTerm)}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 font-semibold text-foreground hover:border-primary hover:text-primary transition shadow-sm"
              >
                🟠 Search MangaUpdates <ExternalLink size={12} />
              </a>

              <a
                href={`https://www.google.com/search?q=${encodeURIComponent(queryTerm + ' manga myanimelist anilist')}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 font-semibold text-foreground hover:border-primary hover:text-primary transition shadow-sm"
              >
                🔍 Search Google <ExternalLink size={12} />
              </a>
            </div>
          </div>
        </div>

        {/* Step 2 Card: Generated Prompt Textarea & Copy */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
            <div>
              <span className="text-xs uppercase font-bold text-primary tracking-wider font-headline">Step 2</span>
              <h2 className="text-lg font-bold text-foreground font-headline mt-0.5">
                Copy Prompt
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Paste this prompt into ChatGPT, Claude, or any LLM assistant.
              </p>
            </div>

            <button
              type="button"
              onClick={handleCopy}
              className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-bold transition shadow-sm ${
                copied
                  ? 'bg-emerald-600 text-white font-bold'
                  : isReady
                  ? 'bg-primary text-primary-foreground hover:opacity-90 shadow-primary/20 shadow-md'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {copied ? (
                <>
                  <Check size={16} strokeWidth={3} />
                  ✓ Copied!
                </>
              ) : (
                <>
                  <Copy size={16} />
                  📋 Copy Prompt
                </>
              )}
            </button>
          </div>

          {/* Injected Values Preview */}
          {isReady && (
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-3.5 text-xs flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-0.5">
                <p className="font-semibold text-foreground">Injected Personalization Values:</p>
                <p className="text-muted-foreground">
                  <span className="font-medium text-primary">Manga Name:</span> {mangaName.trim()} &nbsp;·&nbsp;{' '}
                  <span className="font-medium text-primary">Source:</span> {mangaUrl.trim()}
                </p>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary px-2 py-0.5 rounded font-mono">
                Live Dynamic Interpolation
              </span>
            </div>
          )}

          {/* Readonly Textarea */}
          <div className="relative">
            <textarea
              readOnly
              value={finalPrompt}
              onClick={(e) => (e.target as HTMLTextAreaElement).select()}
              rows={16}
              className="w-full font-mono text-xs rounded-xl border border-input bg-card p-4 text-foreground/90 leading-relaxed focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 shadow-inner select-all"
            />
            <div className="mt-1 text-[11px] text-muted-foreground flex justify-between items-center">
              <span>Tip: Click inside the box to select all text automatically.</span>
              <span>{finalPrompt.length} characters</span>
            </div>
          </div>
        </div>

        {/* Step 3 Card: Next Steps Workflow Guide */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
          <div className="border-b border-border pb-3">
            <span className="text-xs uppercase font-bold text-primary tracking-wider font-headline">Step 3</span>
            <h2 className="text-lg font-bold text-foreground font-headline mt-0.5">
              Use the Generated JSON Configuration
            </h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 pt-1">
            <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary text-xs font-bold">
                1
              </div>
              <p className="text-xs font-bold text-foreground font-headline">Copy Prompt</p>
              <p className="text-[11px] text-muted-foreground leading-normal">
                Click the Copy button above and paste into ChatGPT, Claude, or Gemini.
              </p>
            </div>

            <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary text-xs font-bold">
                2
              </div>
              <p className="text-xs font-bold text-foreground font-headline">Receive AI JSON</p>
              <p className="text-[11px] text-muted-foreground leading-normal">
                The AI assistant will reply with a complete, structured JSON response block.
              </p>
            </div>

            <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary text-xs font-bold">
                3
              </div>
              <p className="text-xs font-bold text-foreground font-headline">Import in Wizard</p>
              <p className="text-[11px] text-muted-foreground leading-normal">
                Open <Link to="/create" className="text-primary font-semibold hover:underline">Create New Site</Link> → click "Import JSON" → paste.
              </p>
            </div>

            <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary text-xs font-bold">
                4
              </div>
              <p className="text-xs font-bold text-foreground font-headline">Generate Site</p>
              <p className="text-[11px] text-muted-foreground leading-normal">
                Review the 8-step wizard form, auto-save settings, and click ⚡ Generate Site.
              </p>
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <Link
              to="/create"
              className="flex items-center gap-2 rounded-xl bg-primary text-primary-foreground px-5 py-2.5 text-xs font-bold shadow-md shadow-primary/20 hover:opacity-90 transition"
            >
              Open Site Builder Wizard <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}
