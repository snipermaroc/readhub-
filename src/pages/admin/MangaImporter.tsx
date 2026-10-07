import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Globe,
  Search,
  DownloadCloud,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Eye,
  FileCode,
  Layers,
  Sparkles,
  ChevronDown,
  ChevronRight,
  RefreshCw,
  ExternalLink,
  BookOpen,
  ShieldCheck,
  Zap,
  Clock,
  ArrowRight,
  Filter,
  CheckSquare,
  Square,
  Copy,
  Check,
} from 'lucide-react';
import { supabase } from '@/lib/mangahub-db';

interface DiscoveredChapter {
  sourceUrl: string;
  title: string;
  chapterNumber: number;
  slug: string;
}

interface DiscoveredManga {
  sourceUrl: string;
  title: string;
  slug: string;
  chapters: DiscoveredChapter[];
  alreadyExists?: boolean;
  existingMangaId?: string;
  existingChapterCount?: number;
  newChaptersCount?: number;
  status?: string;
}

interface DiscoveryData {
  sourceSitemap: string;
  totalUrls: number;
  childSitemapsDiscovered: number;
  mangaCount: number;
  chapterCount: number;
  unknownCount: number;
  catalog: DiscoveredManga[];
  unknownUrls: string[];
  logs: string[];
}

interface ExtractedChapter {
  title: string;
  slug: string;
  chapter_number: number;
  sourceUrl: string;
  images: string[];
  validPagesCount: number;
  rejectedAssetsCount: number;
}

interface ExtractedManga {
  title: string;
  slug: string;
  cover: string;
  banner: string;
  summary: string;
  author?: string;
  artist?: string;
  status: string;
  tags: string[];
  sourceUrl: string;
  chapters: ExtractedChapter[];
}

interface PreviewResponse {
  preview: ExtractedManga;
  generatedData: any;
  totalDetectedImages: number;
  alreadyExists: boolean;
  existingChapterCount: number;
  newChapterCount: number;
  testMode: boolean;
}

interface ImportJob {
  id: string;
  sourceSitemap: string;
  mangaTitle: string;
  mangaSlug: string;
  sourceMangaUrl: string;
  status: 'pending' | 'running' | 'completed' | 'completed_with_warnings' | 'failed';
  steps: { name: string; label: string; status: string; progress?: number }[];
  currentStepDescription: string;
  chaptersTotal: number;
  chaptersProcessed: number;
  pagesTotal: number;
  pagesSuccess: number;
  pagesFailed: number;
  failedItems: { id: string; chapterTitle: string; url: string; reason: string; retried: boolean }[];
  startTime: string;
  endTime?: string;
  durationSeconds?: number;
  logs: string[];
}

export default function MangaImporter() {
  // Input & Configuration state
  const [sitemapUrl, setSitemapUrl] = useState('');
  const [testMode, setTestMode] = useState(true);
  const [chapterLimit, setChapterLimit] = useState<'10' | '25' | '50' | 'all'>('25');
  const [targetSiteId, setTargetSiteId] = useState<string>('auto');
  const [sites, setSites] = useState<any[]>([]);

  // Discovery State
  const [analyzing, setAnalyzing] = useState(false);
  const [discovery, setDiscovery] = useState<DiscoveryData | null>(null);
  const [analysisError, setAnalysisError] = useState('');
  const [selectedMangaUrls, setSelectedMangaUrls] = useState<Set<string>>(new Set());
  const [expandedMangaSlug, setExpandedMangaSlug] = useState<string | null>(null);
  const [catalogSearch, setCatalogSearch] = useState('');

  // Preview State
  const [previewing, setPreviewing] = useState(false);
  const [previewData, setPreviewData] = useState<PreviewResponse | null>(null);
  const [previewError, setPreviewError] = useState('');
  const [showJsonModal, setShowJsonModal] = useState(false);
  const [copiedJson, setCopiedJson] = useState(false);

  // Chapter Pages Breakdown Inspection & Direct Import State
  const [inspectingChapter, setInspectingChapter] = useState<ExtractedChapter | null>(null);
  const [selectedBreakdownSlugs, setSelectedBreakdownSlugs] = useState<Set<string>>(new Set());
  const [importingBreakdown, setImportingBreakdown] = useState(false);
  const [importSuccessBanner, setImportSuccessBanner] = useState<{ message: string; mangaSlug: string; chapterSlug?: string } | null>(null);

  // Active Job State
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [activeJob, setActiveJob] = useState<ImportJob | null>(null);
  const [retrying, setRetrying] = useState(false);

  // History State
  const [history, setHistory] = useState<ImportJob[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Load existing sites for target selector
  useEffect(() => {
    supabase
      .from('manga_sites')
      .select('id,name,slug,subdomain')
      .order('name')
      .then(({ data }: { data: any }) => {
        if (data) setSites(data);
      });

    loadHistory();
  }, []);

  const loadHistory = async () => {
    setLoadingHistory(true);
    try {
      const res = await fetch('/api/manga-import/history');
      const json = await res.json();
      if (json.jobs) setHistory(json.jobs);
    } catch {}
    setLoadingHistory(false);
  };

  // Poll active job status
  useEffect(() => {
    if (!activeJobId) return;
    let timer: any;

    const poll = async () => {
      try {
        const res = await fetch(`/api/manga-import/status/${activeJobId}`);
        if (res.ok) {
          const json = await res.json();
          if (json.job) {
            setActiveJob(json.job);
            if (json.job.status === 'completed' || json.job.status === 'completed_with_warnings' || json.job.status === 'failed') {
              loadHistory();
              return; // Stop polling
            }
          }
        }
      } catch {}
      timer = setTimeout(poll, 1500);
    };

    void poll();
    return () => clearTimeout(timer);
  }, [activeJobId]);

  // 1. Analyze Sitemap
  const handleAnalyze = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const url = sitemapUrl.trim();
    if (!url) {
      setAnalysisError('Please enter a valid HTTP/HTTPS sitemap URL.');
      return;
    }

    setAnalyzing(true);
    setAnalysisError('');
    setDiscovery(null);
    setPreviewData(null);
    setSelectedMangaUrls(new Set());

    try {
      const res = await fetch('/api/manga-import/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sitemapUrl: url }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to analyze sitemap');
      }

      setDiscovery(data);
      // Auto-select first manga by default
      if (data.catalog && data.catalog.length > 0) {
        setSelectedMangaUrls(new Set([data.catalog[0].sourceUrl]));
      }
    } catch (err: any) {
      setAnalysisError(err.message || 'Analysis error');
    } finally {
      setAnalyzing(false);
    }
  };

  // 2. Preview Selected Manga
  const handlePreviewManga = async (manga: DiscoveredManga) => {
    setPreviewing(true);
    setPreviewError('');
    setPreviewData(null);

    try {
      const limit = testMode ? 3 : chapterLimit === 'all' ? 'all' : parseInt(chapterLimit, 10);
      const res = await fetch('/api/manga-import/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mangaUrl: manga.sourceUrl,
          chapters: manga.chapters,
          limitChapters: limit,
          testMode,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate preview');
      }

      setPreviewData(data);
      if (data?.preview?.chapters) {
        setSelectedBreakdownSlugs(new Set(data.preview.chapters.map((c: any) => c.slug)));
      }
    } catch (err: any) {
      setPreviewError(err.message || 'Failed to preview manga');
    } finally {
      setPreviewing(false);
    }
  };

  // Direct Import for Chapter Pages Breakdown
  const handleDirectImportChapters = async (chaptersToImport: ExtractedChapter[]) => {
    if (!previewData?.preview || chaptersToImport.length === 0) return;
    setImportingBreakdown(true);
    setImportSuccessBanner(null);

    try {
      const res = await fetch('/api/manga-import/import-chapters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mangaData: previewData.preview,
          chapters: chaptersToImport,
          targetSiteId: targetSiteId === 'auto' ? undefined : targetSiteId,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Failed to import chapters');
      }

      setImportSuccessBanner({
        message: `Successfully imported ${chaptersToImport.length} chapter(s) and ${chaptersToImport.reduce((sum, c) => sum + (c.images?.length || 0), 0)} page images into Manga Hub!`,
        mangaSlug: previewData.preview.slug,
        chapterSlug: chaptersToImport[0]?.slug,
      });

      loadHistory();
    } catch (err: any) {
      alert(`Import error: ${err.message}`);
    } finally {
      setImportingBreakdown(false);
    }
  };

  // 3. Start Background Import
  const handleStartImport = async () => {
    if (!previewData?.preview) return;

    try {
      const limit = testMode ? 3 : chapterLimit === 'all' ? 'all' : parseInt(chapterLimit, 10);
      const res = await fetch('/api/manga-import/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceSitemap: discovery?.sourceSitemap || sitemapUrl,
          mangaData: previewData.preview,
          limitChapters: limit,
          targetSiteId: targetSiteId === 'auto' ? undefined : targetSiteId,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to initiate import job');
      }

      setActiveJobId(data.jobId);
      setActiveJob(data.job);
      // Scroll to job progress panel
      window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    } catch (err: any) {
      alert(`Could not start import: ${err.message}`);
    }
  };

  // 4. Retry Failed Items
  const handleRetryFailed = async (jobId: string) => {
    setRetrying(true);
    try {
      await fetch(`/api/manga-import/retry/${jobId}`, { method: 'POST' });
      setActiveJobId(jobId);
    } catch {}
    setRetrying(false);
  };

  // Filter catalog
  const filteredCatalog = (discovery?.catalog || []).filter((m) => {
    if (!catalogSearch) return true;
    const term = catalogSearch.toLowerCase();
    return m.title.toLowerCase().includes(term) || m.slug.toLowerCase().includes(term);
  });

  const toggleSelectManga = (sourceUrl: string) => {
    const next = new Set(selectedMangaUrls);
    if (next.has(sourceUrl)) next.delete(sourceUrl);
    else next.add(sourceUrl);
    setSelectedMangaUrls(next);
  };

  const toggleSelectAll = () => {
    if (selectedMangaUrls.size === filteredCatalog.length) {
      setSelectedMangaUrls(new Set());
    } else {
      setSelectedMangaUrls(new Set(filteredCatalog.map((m) => m.sourceUrl)));
    }
  };

  const copyJsonToClipboard = () => {
    if (!previewData?.generatedData) return;
    navigator.clipboard.writeText(JSON.stringify(previewData.generatedData, null, 2));
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 2000);
  };

  return (
    <div className="space-y-10 pb-16">
      {/* ── Page Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/60 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Zap className="h-3 w-3" /> Automated Discovery
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
              PostgreSQL Sync
            </span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight font-headline">Manga Importer</h1>
          <p className="text-muted-foreground text-sm mt-1 max-w-2xl">
            Recursively crawls <code className="text-xs bg-muted px-1.5 py-0.5 rounded text-foreground font-mono">sitemap.xml</code> or <code className="text-xs bg-muted px-1.5 py-0.5 rounded text-foreground font-mono">sitemapindex</code>, extracts manga metadata, discovers chapters, downloads pages in exact reading order, and seamlessly publishes into your live Manga Hub website.
          </p>
        </div>

        {/* Global Controls */}
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-card border border-border shadow-sm cursor-pointer select-none text-xs font-medium hover:border-border/80 transition-colors">
            <input
              type="checkbox"
              checked={testMode}
              onChange={(e) => setTestMode(e.target.checked)}
              className="rounded border-border text-primary focus:ring-primary h-4 w-4"
            />
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              <span>Test Mode (First 3 Ch.)</span>
            </span>
          </label>

          <button
            onClick={() => {
              setSitemapUrl('https://ww2.readsakadays.com/sitemap.xml');
            }}
            type="button"
            className="text-xs px-3 py-2 rounded-xl bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors border border-border/50"
          >
            Example Sitemap
          </button>
        </div>
      </div>

      {/* ── STEP 1: Sitemap URL Input & Configuration ── */}
      <section className="bg-card border border-border rounded-2xl p-6 shadow-sm">
        <form onSubmit={handleAnalyze} className="space-y-5">
          <div className="flex flex-col gap-2">
            <label htmlFor="sitemap-url" className="text-sm font-bold flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-primary" /> Sitemap URL
              </span>
              <span className="text-xs text-muted-foreground font-normal">Supports &lt;urlset&gt; & &lt;sitemapindex&gt; (gzip supported)</span>
            </label>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <input
                  id="sitemap-url"
                  type="url"
                  required
                  placeholder="https://example.com/sitemap.xml or sitemap_index.xml"
                  value={sitemapUrl}
                  onChange={(e) => setSitemapUrl(e.target.value)}
                  disabled={analyzing}
                  className="w-full h-12 pl-4 pr-10 rounded-xl bg-background border border-border text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all font-mono"
                />
                {sitemapUrl && (
                  <button
                    type="button"
                    onClick={() => setSitemapUrl('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs"
                  >
                    Clear
                  </button>
                )}
              </div>
              <button
                type="submit"
                disabled={analyzing || !sitemapUrl.trim()}
                className="h-12 px-7 bg-[#006769] hover:bg-[#005254] text-white rounded-xl font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
              >
                {analyzing ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Analyzing Sitemap...</span>
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4" />
                    <span>Analyze Sitemap</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Import Settings Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pt-4 border-t border-border/60">
            {/* Chapters Limit */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Chapters per Manga</label>
              <div className="flex items-center gap-2">
                {(['10', '25', '50', 'all'] as const).map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setChapterLimit(opt)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      chapterLimit === opt
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'bg-muted/70 hover:bg-muted text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {opt === 'all' ? 'All' : `First ${opt}`}
                  </button>
                ))}
              </div>
            </div>

            {/* Target Manga Site */}
            <div className="space-y-1.5">
              <label htmlFor="target-site-select" className="text-xs font-semibold text-muted-foreground">Publish Destination</label>
              <select
                id="target-site-select"
                aria-label="Publish Destination"
                value={targetSiteId}
                onChange={(e) => setTargetSiteId(e.target.value)}
                className="w-full h-9 px-3 rounded-lg bg-background border border-border text-xs focus:ring-1 focus:ring-primary"
              >
                <option value="auto">⚡ Auto-Create Dedicated Edition Site</option>
                {sites.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.subdomain || s.slug})
                  </option>
                ))}
              </select>
            </div>

            {/* Safety status */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Security & Guardrails</label>
              <div className="flex items-center gap-2 text-xs text-muted-foreground pt-1.5">
                <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
                <span>SSRF blocked, rate-limited, order preserved</span>
              </div>
            </div>
          </div>
        </form>

        {analysisError && (
          <div className="mt-4 p-4 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-sm flex items-start gap-3">
            <XCircle className="h-5 w-5 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Sitemap Analysis Failed</p>
              <p className="text-xs mt-0.5 opacity-90">{analysisError}</p>
            </div>
          </div>
        )}
      </section>

      {/* ── STEP 2: Discovery Overview & Discovered Manga Table ── */}
      {discovery && (
        <section className="space-y-6 animate-in fade-in duration-300">
          {/* Analysis Stats Overview Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between text-muted-foreground text-xs mb-2">
                <span>Discovered Manga</span>
                <BookOpen className="h-4 w-4 text-primary" />
              </div>
              <p className="text-3xl font-extrabold text-foreground">{discovery.mangaCount}</p>
              <p className="text-xs text-emerald-500 font-medium mt-1">✓ Ready for classification</p>
            </div>

            <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between text-muted-foreground text-xs mb-2">
                <span>Total Chapters</span>
                <Layers className="h-4 w-4 text-teal-400" />
              </div>
              <p className="text-3xl font-extrabold text-foreground">{discovery.chapterCount}</p>
              <p className="text-xs text-muted-foreground mt-1">Categorized by number</p>
            </div>

            <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between text-muted-foreground text-xs mb-2">
                <span>Child Sitemaps</span>
                <Globe className="h-4 w-4 text-blue-400" />
              </div>
              <p className="text-3xl font-extrabold text-foreground">{discovery.childSitemapsDiscovered}</p>
              <p className="text-xs text-muted-foreground mt-1">Nested indexes crawled</p>
            </div>

            <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between text-muted-foreground text-xs mb-2">
                <span>Total URLs Discovered</span>
                <FileCode className="h-4 w-4 text-amber-400" />
              </div>
              <p className="text-3xl font-extrabold text-foreground">{discovery.totalUrls}</p>
              <p className="text-xs text-muted-foreground mt-1">{discovery.unknownCount} ignored / non-manga</p>
            </div>
          </div>

          {/* Catalog Selection & Filter Bar */}
          <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
            <div className="p-5 border-b border-border/70 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={toggleSelectAll}
                  className="flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors"
                >
                  {selectedMangaUrls.size === filteredCatalog.length && filteredCatalog.length > 0 ? (
                    <CheckSquare className="h-4 w-4 text-primary" />
                  ) : (
                    <Square className="h-4 w-4" />
                  )}
                  <span>Select All ({selectedMangaUrls.size} selected)</span>
                </button>
                <span className="text-muted-foreground text-xs">|</span>
                <span className="text-xs text-muted-foreground">
                  Showing {filteredCatalog.length} of {discovery.catalog.length} manga
                </span>
              </div>

              <div className="relative w-full sm:w-64">
                <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Filter by manga title or slug..."
                  value={catalogSearch}
                  onChange={(e) => setCatalogSearch(e.target.value)}
                  className="w-full h-9 pl-9 pr-3 rounded-lg bg-background border border-border text-xs focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            {/* Manga Catalog List */}
            <div className="divide-y divide-border/60">
              {filteredCatalog.map((manga) => {
                const isSelected = selectedMangaUrls.has(manga.sourceUrl);
                const isExpanded = expandedMangaSlug === manga.slug;

                return (
                  <div key={manga.slug} className={`transition-colors ${isSelected ? 'bg-primary/5' : 'hover:bg-muted/30'}`}>
                    <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      {/* Left: Checkbox + Title + Meta */}
                      <div className="flex items-start sm:items-center gap-3.5 flex-1 min-w-0">
                        <button
                          type="button"
                          onClick={() => toggleSelectManga(manga.sourceUrl)}
                          className="mt-1 sm:mt-0 text-muted-foreground hover:text-primary transition-colors shrink-0"
                        >
                          {isSelected ? (
                            <CheckSquare className="h-5 w-5 text-primary" />
                          ) : (
                            <Square className="h-5 w-5" />
                          )}
                        </button>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-base font-bold text-foreground truncate">{manga.title}</h3>
                            {manga.alreadyExists ? (
                              <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                {manga.status}
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                New Series
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1 flex-wrap font-mono">
                            <span>slug: {manga.slug}</span>
                            <span>•</span>
                            <span className="text-primary font-sans font-medium">{manga.chapters.length} chapters discovered</span>
                            <span>•</span>
                            <a
                              href={manga.sourceUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="hover:underline flex items-center gap-1 font-sans text-xs"
                            >
                              Source <ExternalLink className="h-3 w-3" />
                            </a>
                          </div>
                        </div>
                      </div>

                      {/* Right: Actions */}
                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                        <button
                          type="button"
                          onClick={() => setExpandedMangaSlug(isExpanded ? null : manga.slug)}
                          className="px-3 py-1.5 rounded-lg bg-muted text-xs font-semibold hover:bg-muted/80 text-foreground transition-colors flex items-center gap-1"
                        >
                          {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                          <span>Chapters ({manga.chapters.length})</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handlePreviewManga(manga)}
                          disabled={previewing}
                          className="px-4 py-1.5 rounded-lg bg-[#006769] hover:bg-[#005254] text-white text-xs font-bold shadow-sm transition-all flex items-center gap-1.5"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          <span>Preview Import</span>
                        </button>
                      </div>
                    </div>

                    {/* Expandable Chapter List */}
                    {isExpanded && (
                      <div className="p-5 bg-background/50 border-t border-border/60">
                        <div className="flex items-center justify-between text-xs text-muted-foreground mb-3 font-semibold">
                          <span>Discovered Chapters (Numerical Order)</span>
                          <span>Sorted ascending (1 → {manga.chapters[manga.chapters.length - 1]?.chapterNumber || 'N'})</span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 max-h-60 overflow-y-auto pr-2">
                          {manga.chapters.map((ch) => (
                            <a
                              key={ch.sourceUrl}
                              href={ch.sourceUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="p-2 rounded-lg bg-card border border-border text-xs hover:border-primary hover:text-primary transition-all truncate block"
                              title={ch.title}
                            >
                              <p className="font-bold truncate">Ch. {ch.chapterNumber}</p>
                              <p className="text-[10px] text-muted-foreground truncate">{ch.title}</p>
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ── STEP 3: Preview Before Publishing Modal / Card ── */}
      {previewing && (
        <div className="bg-card border border-primary/30 rounded-2xl p-10 text-center shadow-lg animate-pulse">
          <RefreshCw className="h-8 w-8 text-primary animate-spin mx-auto mb-3" />
          <h3 className="text-lg font-bold">Fetching Manga Details & Reader Pages...</h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
            Extracting synopsis, high-res cover, tags, and inspecting chapter reader containers to detect valid manga images.
          </p>
        </div>
      )}

      {previewError && (
        <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-sm flex items-start gap-3">
          <XCircle className="h-5 w-5 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">Preview Extraction Failed</p>
            <p className="text-xs mt-0.5 opacity-90">{previewError}</p>
          </div>
        </div>
      )}

      {previewData && (
        <section className="bg-card border border-primary/40 rounded-2xl p-6 sm:p-8 shadow-xl space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border/60 pb-5">
            <div>
              <span className="text-xs font-bold text-primary tracking-wide uppercase">Step 3: Verification & Ingestion</span>
              <h2 className="text-2xl font-extrabold font-headline mt-1">Import Preview</h2>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setShowJsonModal(true)}
                className="px-3.5 py-2 rounded-xl bg-muted text-foreground text-xs font-bold hover:bg-muted/80 transition-colors flex items-center gap-1.5 border border-border"
              >
                <FileCode className="h-4 w-4 text-primary" />
                <span>View Generated JSON</span>
              </button>

              <button
                type="button"
                onClick={handleStartImport}
                className="px-6 py-2.5 rounded-xl bg-[#006769] hover:bg-[#005254] text-white text-sm font-bold shadow-lg transition-all flex items-center gap-2"
              >
                <DownloadCloud className="h-4 w-4" />
                <span>{previewData.alreadyExists ? 'Update Existing Manga' : 'Import Manga'}</span>
              </button>
            </div>
          </div>

          {/* Manga Card & Metadata Preview */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
            {/* Cover Column */}
            <div className="md:col-span-3">
              <div className="relative aspect-[3/4] rounded-2xl overflow-hidden bg-muted border border-border shadow-md">
                {previewData.preview.cover ? (
                  <img
                    src={previewData.preview.cover}
                    alt={previewData.preview.title}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground p-4 text-center">
                    <BookOpen className="h-10 w-10 mb-2 opacity-50" />
                    <span className="text-xs">No Cover Extracted</span>
                  </div>
                )}
                <div className="absolute top-2 left-2 px-2.5 py-1 rounded-md bg-black/70 backdrop-blur-md text-[11px] font-bold text-white uppercase tracking-wider">
                  {previewData.preview.status}
                </div>
              </div>
            </div>

            {/* Details Column */}
            <div className="md:col-span-9 space-y-4">
              <div>
                <h3 className="text-2xl font-black text-foreground">{previewData.preview.title}</h3>
                <p className="text-xs font-mono text-muted-foreground mt-0.5">slug: {previewData.preview.slug}</p>
              </div>

              {/* Tags / Genres */}
              <div className="flex flex-wrap gap-1.5">
                {previewData.preview.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-muted text-foreground border border-border/80"
                  >
                    {tag}
                  </span>
                ))}
              </div>

              {/* Synopsis */}
              <div>
                <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-1">Synopsis</h4>
                <p className="text-sm text-foreground/90 leading-relaxed line-clamp-4 bg-muted/30 p-3.5 rounded-xl border border-border/50">
                  {previewData.preview.summary}
                </p>
              </div>

              {/* Ingestion Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                <div className="p-3 rounded-xl bg-background border border-border">
                  <span className="text-[11px] text-muted-foreground block">Chapters Ready</span>
                  <span className="text-lg font-black text-foreground">{previewData.preview.chapters.length}</span>
                </div>
                <div className="p-3 rounded-xl bg-background border border-border">
                  <span className="text-[11px] text-muted-foreground block">Pages Detected</span>
                  <span className="text-lg font-black text-emerald-400">{previewData.totalDetectedImages}</span>
                </div>
                <div className="p-3 rounded-xl bg-background border border-border">
                  <span className="text-[11px] text-muted-foreground block">Duplicate Status</span>
                  <span className="text-xs font-bold text-foreground block mt-1">
                    {previewData.alreadyExists ? 'Already in Database' : 'Fresh Series'}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-background border border-border">
                  <span className="text-[11px] text-muted-foreground block">Publish Destination</span>
                  <span className="text-xs font-bold text-primary block mt-1 truncate">
                    {targetSiteId === 'auto' ? 'Dedicated Site' : 'Selected Site'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* ── Chapter Pages Breakdown & Direct Import Section ── */}
          <div className="space-y-4 pt-6 border-t border-border/60">
            {/* Header with Direct Import Action */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-muted/20 p-4 rounded-xl border border-border/60">
              <div>
                <h4 className="text-base font-extrabold flex items-center gap-2">
                  <Layers className="h-4 w-4 text-primary" />
                  <span>Chapter Pages Breakdown ({previewData.preview.chapters.length} chapters)</span>
                </h4>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {previewData.totalDetectedImages} total page images extracted • Ads, logos, and tracking pixels filtered
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => {
                    if (selectedBreakdownSlugs.size === previewData.preview.chapters.length) {
                      setSelectedBreakdownSlugs(new Set());
                    } else {
                      setSelectedBreakdownSlugs(new Set(previewData.preview.chapters.map((c) => c.slug)));
                    }
                  }}
                  className="px-3 py-1.5 rounded-lg bg-muted text-xs font-semibold hover:bg-muted/80 text-foreground transition-colors"
                >
                  {selectedBreakdownSlugs.size === previewData.preview.chapters.length ? 'Deselect All' : `Select All (${selectedBreakdownSlugs.size})`}
                </button>

                <button
                  type="button"
                  disabled={importingBreakdown || selectedBreakdownSlugs.size === 0}
                  onClick={() => {
                    const selectedChs = previewData.preview.chapters.filter((c) => selectedBreakdownSlugs.has(c.slug));
                    void handleDirectImportChapters(selectedChs);
                  }}
                  className="px-4 py-2 rounded-xl bg-[#006769] hover:bg-[#005254] text-white text-xs font-bold shadow-md transition-all flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {importingBreakdown ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      <span>Importing Pages & Data...</span>
                    </>
                  ) : (
                    <>
                      <DownloadCloud className="h-3.5 w-3.5" />
                      <span>Import Chapter Pages & Data ({selectedBreakdownSlugs.size})</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Direct Import Success Banner */}
            {importSuccessBanner && (
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in duration-200">
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
                  <div>
                    <p className="font-bold text-sm text-foreground">{importSuccessBanner.message}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">Written to PostgreSQL chapters & chapter_images tables with local disk persistence.</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {importSuccessBanner.chapterSlug && (
                    <Link
                      to={`/chapter/${importSuccessBanner.chapterSlug}`}
                      className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1 shadow-sm transition-all"
                    >
                      <BookOpen className="h-3.5 w-3.5" />
                      <span>Open in Reader</span>
                    </Link>
                  )}
                  <Link
                    to={`/manga/${importSuccessBanner.mangaSlug}`}
                    className="px-3.5 py-1.5 rounded-lg bg-card border border-border text-foreground hover:bg-muted font-bold text-xs flex items-center gap-1 transition-all"
                  >
                    <span>View Manga</span>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            )}

            {/* Chapter Cards with Page Thumbnails and Quick Actions */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 max-h-[460px] overflow-y-auto pr-1">
              {previewData.preview.chapters.map((ch) => {
                const isSelected = selectedBreakdownSlugs.has(ch.slug);

                return (
                  <div
                    key={ch.slug}
                    className={`p-3.5 rounded-xl border transition-all flex flex-col justify-between gap-3 ${
                      isSelected ? 'bg-primary/5 border-primary/40 shadow-sm' : 'bg-background border-border hover:border-border/80'
                    }`}
                  >
                    <div>
                      {/* Top Row: Select Checkbox + Title + Counts */}
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <button
                            type="button"
                            onClick={() => {
                              const next = new Set(selectedBreakdownSlugs);
                              if (next.has(ch.slug)) next.delete(ch.slug);
                              else next.add(ch.slug);
                              setSelectedBreakdownSlugs(next);
                            }}
                            className="text-muted-foreground hover:text-primary transition-colors shrink-0"
                          >
                            {isSelected ? <CheckSquare className="h-4 w-4 text-primary" /> : <Square className="h-4 w-4" />}
                          </button>
                          <div className="min-w-0">
                            <p className="font-bold text-xs truncate text-foreground">{ch.title}</p>
                            <p className="text-[10px] text-muted-foreground font-mono truncate">{ch.slug}</p>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="font-bold text-xs text-emerald-400 block">{ch.validPagesCount} pages</span>
                          {ch.rejectedAssetsCount > 0 && (
                            <span className="text-[10px] text-muted-foreground block">({ch.rejectedAssetsCount} filtered)</span>
                          )}
                        </div>
                      </div>

                      {/* Thumbnail Preview Strip */}
                      {ch.images && ch.images.length > 0 ? (
                        <div
                          onClick={() => setInspectingChapter(ch)}
                          className="flex items-center gap-1.5 p-1 rounded-lg bg-muted/40 border border-border/50 cursor-pointer hover:border-primary/50 transition-colors overflow-hidden"
                          title="Click to inspect all pages in gallery"
                        >
                          {ch.images.slice(0, 4).map((imgUrl, idx) => (
                            <div key={idx} className="relative w-12 h-14 rounded overflow-hidden bg-background border border-border/60 shrink-0">
                              <img
                                src={imgUrl}
                                alt={`P${idx + 1}`}
                                className="w-full h-full object-cover"
                                loading="lazy"
                                referrerPolicy="no-referrer"
                                crossOrigin="anonymous"
                                onError={(e) => {
                                  const target = e.currentTarget;
                                  if (!target.dataset.retried) {
                                    target.dataset.retried = 'true';
                                    target.src = `/api/manga-import/proxy-image?url=${encodeURIComponent(imgUrl)}`;
                                  }
                                }}
                              />
                              <span className="absolute bottom-0 right-0 px-1 text-[8px] bg-black/70 text-white font-mono rounded-tl">
                                {idx + 1}
                              </span>
                            </div>
                          ))}
                          {ch.images.length > 4 && (
                            <div className="flex-1 h-14 rounded bg-muted/70 flex items-center justify-center text-[10px] font-bold text-muted-foreground text-center">
                              +{ch.images.length - 4} more
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="p-2 rounded bg-muted/20 text-[10px] text-muted-foreground italic text-center">
                          Pages ready for download
                        </div>
                      )}
                    </div>

                    {/* Bottom Action Buttons */}
                    <div className="flex items-center gap-2 pt-2 border-t border-border/40">
                      <button
                        type="button"
                        onClick={() => setInspectingChapter(ch)}
                        className="flex-1 py-1.5 px-2 rounded-lg bg-muted text-foreground text-xs font-semibold hover:bg-muted/80 transition-colors flex items-center justify-center gap-1"
                      >
                        <Eye className="h-3.5 w-3.5 text-primary" />
                        <span>Inspect Pages</span>
                      </button>

                      <button
                        type="button"
                        disabled={importingBreakdown}
                        onClick={() => void handleDirectImportChapters([ch])}
                        className="py-1.5 px-3 rounded-lg bg-[#006769] hover:bg-[#005254] text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1 disabled:opacity-50"
                        title="Import only this chapter immediately"
                      >
                        <DownloadCloud className="h-3 w-3" />
                        <span>Import</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ── Chapter Page Images Gallery Inspector Modal ── */}
      {inspectingChapter && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-5 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-primary/10 text-primary border border-primary/20">
                    Ch. {inspectingChapter.chapter_number}
                  </span>
                  <span className="text-xs text-muted-foreground font-mono truncate max-w-xs">{inspectingChapter.slug}</span>
                </div>
                <h3 className="text-lg font-black text-foreground">{inspectingChapter.title}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {inspectingChapter.images.length} valid manga reader pages detected in sequence
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={importingBreakdown}
                  onClick={async () => {
                    await handleDirectImportChapters([inspectingChapter]);
                    setInspectingChapter(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-[#006769] hover:bg-[#005254] text-white text-xs font-bold shadow-md transition-all flex items-center gap-1.5"
                >
                  <DownloadCloud className="h-4 w-4" />
                  <span>Import This Chapter Now</span>
                </button>

                <button
                  type="button"
                  onClick={() => setInspectingChapter(null)}
                  className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Gallery Content */}
            <div className="p-5 overflow-y-auto flex-1 space-y-4">
              {inspectingChapter.images.length === 0 ? (
                <div className="py-16 text-center text-sm text-muted-foreground">
                  No images detected for this chapter.
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
                  {inspectingChapter.images.map((imgUrl, pageIdx) => (
                    <div
                      key={pageIdx}
                      className="bg-background rounded-xl border border-border overflow-hidden shadow-sm flex flex-col justify-between group"
                    >
                      {/* Image Thumbnail with proxy fallback */}
                      <div className="relative aspect-[3/4] bg-muted/40 overflow-hidden">
                        <img
                          src={imgUrl}
                          alt={`Page ${pageIdx + 1}`}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          loading="lazy"
                          referrerPolicy="no-referrer"
                          crossOrigin="anonymous"
                          onError={(e) => {
                            const target = e.currentTarget;
                            if (!target.dataset.retried) {
                              target.dataset.retried = 'true';
                              target.src = `/api/manga-import/proxy-image?url=${encodeURIComponent(imgUrl)}`;
                            }
                          }}
                        />
                        <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/80 backdrop-blur-sm text-[10px] font-bold text-white">
                          Page {pageIdx + 1}
                        </div>
                      </div>

                      {/* Footer Info */}
                      <div className="p-2 flex items-center justify-between text-[10px] text-muted-foreground border-t border-border/50">
                        <span className="font-mono">#{pageIdx + 1}</span>
                        <a
                          href={imgUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-primary hover:underline flex items-center gap-0.5"
                        >
                          <span>Full Res</span>
                          <ExternalLink className="h-2.5 w-2.5" />
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── STEP 4: Live Import Job Progress Console ── */}
      {activeJob && (
        <section className="bg-card border border-primary/50 rounded-2xl p-6 sm:p-8 shadow-xl space-y-6 animate-in fade-in duration-300">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-5">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                  activeJob.status === 'completed'
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : activeJob.status === 'running'
                    ? 'bg-primary/10 text-primary border border-primary/20 animate-pulse'
                    : activeJob.status === 'failed'
                    ? 'bg-destructive/10 text-destructive border border-destructive/20'
                    : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                }`}>
                  {activeJob.status.replace(/_/g, ' ')}
                </span>
                <span className="text-xs text-muted-foreground font-mono">Job ID: {activeJob.id}</span>
              </div>
              <h2 className="text-xl font-black font-headline">
                Importing: <span className="text-primary">{activeJob.mangaTitle}</span>
              </h2>
            </div>

            {/* Quick Actions after completion */}
            <div className="flex items-center gap-3">
              {activeJob.status === 'completed' || activeJob.status === 'completed_with_warnings' ? (
                <>
                  <Link
                    to={`/manga/${activeJob.mangaSlug}`}
                    className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md transition-all flex items-center gap-1.5"
                  >
                    <BookOpen className="h-4 w-4" />
                    <span>View Public Manga Page</span>
                  </Link>

                  <Link
                    to="/"
                    className="px-4 py-2 rounded-xl bg-muted text-foreground text-xs font-bold hover:bg-muted/80 transition-all flex items-center gap-1.5"
                  >
                    <span>View Central Portal</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </>
              ) : activeJob.status === 'running' ? (
                <div className="flex items-center gap-2 text-xs text-primary font-bold">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Processing chapters...</span>
                </div>
              ) : null}
            </div>
          </div>

          {/* Stepper Breakdown */}
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
            {activeJob.steps.map((st, i) => (
              <div
                key={st.name}
                className={`p-3.5 rounded-xl border text-xs transition-all ${
                  st.status === 'completed'
                    ? 'bg-emerald-500/5 border-emerald-500/30 text-emerald-400'
                    : st.status === 'running'
                    ? 'bg-primary/10 border-primary text-primary shadow-sm'
                    : 'bg-muted/30 border-border text-muted-foreground'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-bold">Step {i + 1}</span>
                  {st.status === 'completed' ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  ) : st.status === 'running' ? (
                    <RefreshCw className="h-4 w-4 animate-spin text-primary" />
                  ) : (
                    <Clock className="h-4 w-4 opacity-40" />
                  )}
                </div>
                <p className="font-semibold text-foreground truncate">{st.label}</p>
                {st.progress !== undefined && st.status === 'running' && (
                  <div className="w-full bg-border/60 rounded-full h-1.5 mt-2 overflow-hidden">
                    <div className="bg-primary h-full transition-all duration-300" style={{ width: `${st.progress}%` }} />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Current Activity & Progress Bar */}
          <div className="p-4 rounded-xl bg-background border border-border space-y-3">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="flex items-center gap-2 text-foreground truncate">
                <Sparkles className="h-4 w-4 text-primary shrink-0" />
                <span>{activeJob.currentStepDescription}</span>
              </span>
              <span className="text-muted-foreground font-mono">
                {activeJob.chaptersProcessed} / {activeJob.chaptersTotal} ch
              </span>
            </div>

            <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
              <div
                className="bg-primary h-full transition-all duration-300"
                style={{
                  width: `${activeJob.chaptersTotal > 0 ? (activeJob.chaptersProcessed / activeJob.chaptersTotal) * 100 : 0}%`,
                }}
              />
            </div>

            {/* Counters */}
            <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
              <span>Pages Success: <b className="text-emerald-400 font-bold">{activeJob.pagesSuccess}</b></span>
              <span>Pages Failed: <b className={activeJob.pagesFailed > 0 ? 'text-destructive font-bold' : 'text-foreground'}>{activeJob.pagesFailed}</b></span>
              {activeJob.durationSeconds && <span>Duration: <b>{activeJob.durationSeconds}s</b></span>}
            </div>
          </div>

          {/* Failed Items & Retry (Step 19) */}
          {activeJob.failedItems.length > 0 && (
            <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-destructive flex items-center gap-1.5">
                  <AlertTriangle className="h-4 w-4" />
                  <span>{activeJob.failedItems.length} Warning(s) / Failed Chapters</span>
                </span>
                <button
                  type="button"
                  onClick={() => handleRetryFailed(activeJob.id)}
                  disabled={retrying}
                  className="px-3 py-1 rounded-lg bg-destructive text-destructive-foreground text-xs font-bold hover:bg-destructive/90 transition-colors flex items-center gap-1"
                >
                  <RefreshCw className={`h-3 w-3 ${retrying ? 'animate-spin' : ''}`} />
                  <span>Retry Failed</span>
                </button>
              </div>

              <div className="space-y-1.5 max-h-36 overflow-y-auto">
                {activeJob.failedItems.map((fail) => (
                  <div key={fail.id} className="p-2 rounded bg-background/80 text-xs flex items-center justify-between gap-2 border border-destructive/10">
                    <span className="font-mono text-foreground truncate">{fail.chapterTitle}: {fail.reason}</span>
                    <span className="text-[10px] text-muted-foreground shrink-0">{fail.retried ? 'Retried' : 'Pending'}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Job Logs Console */}
          <div className="space-y-1.5">
            <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Live Import Logs</h4>
            <div className="p-3 rounded-xl bg-black/80 font-mono text-[11px] text-emerald-400 max-h-40 overflow-y-auto space-y-1 select-text">
              {activeJob.logs.map((log, idx) => (
                <p key={idx} className="leading-relaxed">{log}</p>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── STEP 5: Import History (Step 20) ── */}
      <section className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold font-headline">Import History</h2>
            <p className="text-xs text-muted-foreground">Log of automated sitemap ingestions and updates.</p>
          </div>
          <button
            type="button"
            onClick={loadHistory}
            disabled={loadingHistory}
            className="p-2 rounded-lg bg-muted text-muted-foreground hover:text-foreground transition-colors"
            title="Refresh history"
          >
            <RefreshCw className={`h-4 w-4 ${loadingHistory ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {history.length === 0 ? (
          <div className="py-8 text-center text-xs text-muted-foreground">
            No previous sitemap imports yet. Run your first import above!
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-border/80 text-muted-foreground font-semibold">
                <tr>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Manga</th>
                  <th className="py-2.5 px-3">Source Sitemap</th>
                  <th className="py-2.5 px-3">Chapters</th>
                  <th className="py-2.5 px-3">Pages</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {history.map((job) => (
                  <tr key={job.id} className="hover:bg-muted/40 transition-colors">
                    <td className="py-3 px-3 font-mono text-muted-foreground">
                      {new Date(job.startTime).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-3 font-bold text-foreground">
                      {job.mangaTitle}
                    </td>
                    <td className="py-3 px-3 font-mono text-muted-foreground truncate max-w-[200px]" title={job.sourceSitemap}>
                      {job.sourceSitemap}
                    </td>
                    <td className="py-3 px-3">
                      {job.chaptersProcessed} / {job.chaptersTotal}
                    </td>
                    <td className="py-3 px-3 text-emerald-400 font-semibold">
                      {job.pagesSuccess}
                    </td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        job.status === 'completed'
                          ? 'bg-emerald-500/10 text-emerald-400'
                          : job.status === 'failed'
                          ? 'bg-destructive/10 text-destructive'
                          : 'bg-amber-500/10 text-amber-400'
                      }`}>
                        {job.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <HistoryActionDropdown
                        job={job}
                        onInspect={() => {
                          setActiveJobId(job.id);
                          setActiveJob(job);
                        }}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ── Generated JSON Modal (Step 25) ── */}
      {showJsonModal && previewData?.generatedData && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm">Generated Manga Hub JSON</h3>
                <p className="text-xs text-muted-foreground">Exact data structure written to PostgreSQL</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={copyJsonToClipboard}
                  className="px-3 py-1.5 rounded-lg bg-muted text-xs font-semibold hover:bg-muted/80 flex items-center gap-1.5"
                >
                  {copiedJson ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                  <span>{copiedJson ? 'Copied!' : 'Copy'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowJsonModal(false)}
                  className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground"
                >
                  ✕
                </button>
              </div>
            </div>
            <div className="p-4 overflow-y-auto flex-1 bg-black/90 font-mono text-xs text-emerald-400 select-text">
              <pre>{JSON.stringify(previewData.generatedData, null, 2)}</pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function HistoryActionDropdown({
  job,
  onInspect,
}: {
  job: ImportJob;
  onInspect: () => void;
}) {
  const [open, setOpen] = useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open]);

  return (
    <div className="relative inline-block text-left" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-border bg-card hover:bg-muted text-xs font-bold text-foreground transition shadow-sm"
      >
        <span>Actions</span>
        <ChevronDown size={12} className={`transition-transform duration-150 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 w-44 rounded-xl border border-border bg-card p-1.5 shadow-2xl animate-in fade-in zoom-in-95 duration-100 text-left">
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onInspect();
            }}
            className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold text-foreground hover:bg-primary/10 hover:text-primary transition"
          >
            <Eye size={13} className="text-primary" />
            <span>Inspect Logs</span>
          </button>

          <Link
            to={`/manga/${job.mangaSlug}`}
            className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold text-foreground hover:bg-muted transition"
          >
            <ExternalLink size={13} className="text-teal-500" />
            <span>View Manga</span>
          </Link>
        </div>
      )}
    </div>
  );
}
