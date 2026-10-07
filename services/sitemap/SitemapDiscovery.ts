import { fetchText } from './SitemapFetcher';
import { parseSitemapXml } from './SitemapParser';

export type UrlClassification = 'manga' | 'chapter' | 'unknown';

export interface DiscoveredChapter {
  sourceUrl: string;
  title: string;
  chapterNumber: number;
  slug: string;
}

export interface DiscoveredManga {
  sourceUrl: string;
  title: string;
  slug: string;
  cover?: string;
  summary?: string;
  tags?: string[];
  chapters: DiscoveredChapter[];
  status?: string;
}

export interface DiscoveryResult {
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

// Extract numeric chapter number from string or slug
export function parseChapterNumber(raw: string): number {
  if (!raw) return 1;

  // Patterns like chapter-1.5, ch-12, 001, 10
  const clean = raw.toLowerCase().replace(/_/g, '-');

  // Match e.g. "chapter-10-5" or "chapter-10.5" or "ch-10" or "chapter-10"
  const decMatch = clean.match(/chapter[^\d]*(\d+(?:[.-]\d+)?)/i) ||
                   clean.match(/ch[^\d]*(\d+(?:[.-]\d+)?)/i) ||
                   clean.match(/episode[^\d]*(\d+(?:[.-]\d+)?)/i) ||
                   clean.match(/ep[^\d]*(\d+(?:[.-]\d+)?)/i) ||
                   clean.match(/(\d+(?:\.\d+)?)(?:st|nd|rd|th)?(?:-chapter)?$/i) ||
                   clean.match(/\b(\d+(?:\.\d+)?)\b/);

  if (decMatch && decMatch[1]) {
    const val = parseFloat(decMatch[1].replace('-', '.'));
    if (!isNaN(val)) return val;
  }

  // Fallback: extract last consecutive digits
  const lastDigits = clean.match(/(\d+)/g);
  if (lastDigits && lastDigits.length > 0) {
    const num = parseInt(lastDigits[lastDigits.length - 1], 10);
    if (!isNaN(num)) return num;
  }

  return 1;
}

// Clean title from slug or url segment
export function cleanTitleFromSlug(slug: string): string {
  if (!slug) return 'Unknown Title';
  return slug
    .replace(/[-_]+/g, ' ')
    .trim()
    .split(' ')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

// Classify URL into 'manga' | 'chapter' | 'unknown'
export function classifyUrl(urlStr: string): { classification: UrlClassification; mangaSlug?: string; chapterSlug?: string } {
  try {
    const parsed = new URL(urlStr);
    const path = parsed.pathname.replace(/\/+$/, ''); // Strip trailing slash
    const segments = path.split('/').filter(Boolean);

    if (segments.length === 0) {
      return { classification: 'unknown' };
    }

    // Common non-manga endpoints
    const ignored = ['about', 'contact', 'privacy', 'dmca', 'terms', 'cookies', 'login', 'register', 'author', 'tag', 'genre', 'categories', 'category', 'blog', 'news', 'feed', 'search'];
    if (segments.length === 1 && ignored.includes(segments[0].toLowerCase())) {
      return { classification: 'unknown' };
    }

    // Pattern 1: Nested pattern: /manga/solo-leveling/chapter-1
    // or /series/one-piece/ch-1050
    // or /read/naruto/chapter-50
    if (segments.length >= 3) {
      const parentPrefix = segments[segments.length - 3].toLowerCase();
      const parentManga = segments[segments.length - 2].toLowerCase();
      const lastSeg = segments[segments.length - 1].toLowerCase();

      if (['manga', 'series', 'comic', 'comics', 'manhwa', 'manhua', 'webtoon', 'read'].includes(parentPrefix)) {
        if (/chapter|ch-|\bch\b|episode|ep-|\d+/.test(lastSeg)) {
          return {
            classification: 'chapter',
            mangaSlug: parentManga,
            chapterSlug: lastSeg,
          };
        }
      }
    }

    // Pattern 2: Two segments: /manga/solo-leveling or /chapter/solo-leveling-chapter-1
    if (segments.length === 2) {
      const prefix = segments[0].toLowerCase();
      const slug = segments[1].toLowerCase();

      // Check if prefix indicates chapter
      if (['chapter', 'ch', 'episode', 'ep'].includes(prefix) || /chapter|ch-|\bch\b/.test(slug)) {
        // e.g. /chapter/solo-leveling-chapter-1
        // Extract manga slug by stripping chapter suffix
        const mangaSlug = slug.replace(/[-_]?(?:chapter|ch|ep|episode)[-_]?\d+(?:\.\d+)?.*$/i, '') || slug;
        return {
          classification: 'chapter',
          mangaSlug,
          chapterSlug: slug,
        };
      }

      // Check if prefix indicates manga
      if (['manga', 'series', 'comic', 'comics', 'manhwa', 'manhua', 'webtoon', 'read'].includes(prefix)) {
        // If the slug itself has chapter in it
        if (/chapter|ch-|\bch\b/.test(slug)) {
          const mangaSlug = slug.replace(/[-_]?(?:chapter|ch|ep|episode)[-_]?\d+(?:\.\d+)?.*$/i, '') || slug;
          return {
            classification: 'chapter',
            mangaSlug,
            chapterSlug: slug,
          };
        }

        return {
          classification: 'manga',
          mangaSlug: slug,
        };
      }
    }

    // Pattern 3: Single segment /solo-leveling-chapter-1/ vs /solo-leveling/
    if (segments.length === 1) {
      const seg = segments[0].toLowerCase();
      if (/chapter|ch-|\bch\b|episode/.test(seg)) {
        const mangaSlug = seg.replace(/[-_]?(?:chapter|ch|ep|episode)[-_]?\d+(?:\.\d+)?.*$/i, '') || seg;
        return {
          classification: 'chapter',
          mangaSlug,
          chapterSlug: seg,
        };
      }
      // Single segment might be a manga or generic page
      return {
        classification: 'manga',
        mangaSlug: seg,
      };
    }

    // Subpath check
    const fullPath = path.toLowerCase();
    if (fullPath.includes('/chapter-') || fullPath.includes('/ch-') || fullPath.includes('/chapter/')) {
      const lastSeg = segments[segments.length - 1];
      const prevSeg = segments[segments.length - 2] || lastSeg;
      return {
        classification: 'chapter',
        mangaSlug: prevSeg.replace(/chapter.*$/, '') || prevSeg,
        chapterSlug: lastSeg,
      };
    }

    if (fullPath.includes('/manga/') || fullPath.includes('/series/')) {
      const lastSeg = segments[segments.length - 1];
      return {
        classification: 'manga',
        mangaSlug: lastSeg,
      };
    }

    return { classification: 'unknown' };
  } catch {
    return { classification: 'unknown' };
  }
}

export class SitemapDiscovery {
  private visitedSitemaps = new Set<string>();
  private discoveredUrls: string[] = [];
  private logs: string[] = [];
  private maxDepth = 4;
  private maxTotalUrls = 1500;

  async analyze(rootSitemapUrl: string): Promise<DiscoveryResult> {
    this.visitedSitemaps.clear();
    this.discoveredUrls = [];
    this.logs = [];

    this.logs.push(`🔍 Starting sitemap analysis for: ${rootSitemapUrl}`);
    await this.traverseSitemap(rootSitemapUrl, 1);

    this.logs.push(`✓ Finished crawling. Discovered ${this.discoveredUrls.length} total URLs.`);

    // Classify all URLs
    const mangaMap = new Map<string, DiscoveredManga>();
    const orphanChapters: { chapter: DiscoveredChapter; mangaSlug: string }[] = [];
    const unknownUrls: string[] = [];

    let mangaCount = 0;
    let chapterCount = 0;

    for (const url of this.discoveredUrls) {
      const { classification, mangaSlug, chapterSlug } = classifyUrl(url);

      if (classification === 'manga' && mangaSlug) {
        if (!mangaMap.has(mangaSlug)) {
          mangaCount++;
          mangaMap.set(mangaSlug, {
            sourceUrl: url,
            title: cleanTitleFromSlug(mangaSlug),
            slug: mangaSlug,
            chapters: [],
            status: 'ongoing',
          });
        }
      } else if (classification === 'chapter' && chapterSlug) {
        chapterCount++;
        const targetMangaSlug = mangaSlug || 'unknown-series';
        const chNumber = parseChapterNumber(chapterSlug);
        const chItem: DiscoveredChapter = {
          sourceUrl: url,
          title: `Chapter ${chNumber}`,
          chapterNumber: chNumber,
          slug: chapterSlug,
        };

        if (mangaMap.has(targetMangaSlug)) {
          mangaMap.get(targetMangaSlug)!.chapters.push(chItem);
        } else {
          orphanChapters.push({ chapter: chItem, mangaSlug: targetMangaSlug });
        }
      } else {
        unknownUrls.push(url);
      }
    }

    // Attach orphan chapters to created or inferred manga
    for (const orphan of orphanChapters) {
      let manga = mangaMap.get(orphan.mangaSlug);
      if (!manga) {
        mangaCount++;
        manga = {
          sourceUrl: orphan.chapter.sourceUrl.replace(/\/(?:chapter|ch)[^/]*\/?$/, ''),
          title: cleanTitleFromSlug(orphan.mangaSlug),
          slug: orphan.mangaSlug,
          chapters: [],
          status: 'ongoing',
        };
        mangaMap.set(orphan.mangaSlug, manga);
      }
      manga.chapters.push(orphan.chapter);
    }

    // Deduplicate and sort chapters numerically for each manga
    const catalog: DiscoveredManga[] = [];
    for (const [_, manga] of mangaMap) {
      const seenChUrls = new Set<string>();
      const deduped: DiscoveredChapter[] = [];

      for (const ch of manga.chapters) {
        if (!seenChUrls.has(ch.sourceUrl)) {
          seenChUrls.add(ch.sourceUrl);
          deduped.push(ch);
        }
      }

      // Sort numerically ascending (Chapter 1, 2, 3, 10, 11)
      deduped.sort((a, b) => a.chapterNumber - b.chapterNumber);
      manga.chapters = deduped;
      catalog.push(manga);
    }

    // Sort manga alphabetically
    catalog.sort((a, b) => a.title.localeCompare(b.title));

    return {
      sourceSitemap: rootSitemapUrl,
      totalUrls: this.discoveredUrls.length,
      childSitemapsDiscovered: Math.max(0, this.visitedSitemaps.size - 1),
      mangaCount: catalog.length,
      chapterCount,
      unknownCount: unknownUrls.length,
      catalog,
      unknownUrls: unknownUrls.slice(0, 100),
      logs: this.logs,
    };
  }

  private async traverseSitemap(sitemapUrl: string, depth: number): Promise<void> {
    if (depth > this.maxDepth) {
      this.logs.push(`⚠️ Max recursion depth reached for: ${sitemapUrl}`);
      return;
    }

    const normUrl = sitemapUrl.trim();
    if (this.visitedSitemaps.has(normUrl)) {
      return; // Already visited (avoids circular references)
    }

    if (this.discoveredUrls.length >= this.maxTotalUrls) {
      this.logs.push(`⚠️ Maximum discovery URL threshold reached (${this.maxTotalUrls}).`);
      return;
    }

    this.visitedSitemaps.add(normUrl);

    try {
      this.logs.push(`Fetching sitemap: ${normUrl}`);
      const { text } = await fetchText(normUrl, { timeoutMs: 12000 });
      const parsed = parseSitemapXml(text);

      if (parsed.isIndex) {
        this.logs.push(`→ Detected sitemap index with ${parsed.childSitemaps.length} child sitemaps`);
        for (const childUrl of parsed.childSitemaps) {
          if (this.discoveredUrls.length >= this.maxTotalUrls) break;
          await this.traverseSitemap(childUrl, depth + 1);
        }
      } else {
        this.logs.push(`→ Found urlset with ${parsed.urls.length} URLs`);
        for (const u of parsed.urls) {
          if (!this.discoveredUrls.includes(u.loc)) {
            this.discoveredUrls.push(u.loc);
          }
          if (this.discoveredUrls.length >= this.maxTotalUrls) break;
        }
      }
    } catch (err: any) {
      this.logs.push(`❌ Failed to fetch/parse sitemap (${normUrl}): ${err.message}`);
    }
  }
}
