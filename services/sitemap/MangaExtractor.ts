import * as cheerio from 'cheerio';
import { fetchText } from './SitemapFetcher';
import { parseChapterNumber, DiscoveredChapter, DiscoveredManga } from './SitemapDiscovery';

export interface ExtractedChapter {
  id?: string;
  title: string;
  slug: string;
  chapter_number: number;
  sourceUrl: string;
  images: string[];
  validPagesCount: number;
  rejectedAssetsCount: number;
}

export interface ExtractedManga {
  title: string;
  slug: string;
  cover: string;
  banner: string;
  summary: string;
  author?: string;
  artist?: string;
  status: string;
  tags: string[];
  alternative_titles?: string[];
  release_year?: string;
  rating?: string;
  sourceUrl: string;
  chapters: ExtractedChapter[];
}

// Check if image URL looks like an advertisement, icon, logo, avatar, or tracker
export function isInvalidMangaPage(src: string, alt: string = '', width?: number, height?: number): boolean {
  if (!src) return true;
  const s = src.toLowerCase();

  // Reject tracking pixels and 1x1 gifs
  if (s.startsWith('data:image/gif;base64,r0lgod') || s.includes('pixel') || s.includes('tracker')) {
    return true;
  }

  // Reject logos, avatars, icons, badges, ads, buttons
  if (
    s.includes('logo') ||
    s.includes('avatar') ||
    s.includes('favicon') ||
    s.includes('icon') ||
    s.includes('/ad/') ||
    s.includes('ads.') ||
    s.includes('banner-ad') ||
    s.includes('donate') ||
    s.includes('patreon') ||
    s.includes('discord') ||
    s.includes('social') ||
    s.includes('badge') ||
    s.includes('watermark') ||
    s.includes('footer') ||
    s.includes('spinner') ||
    s.includes('loader') ||
    s.includes('placeholder')
  ) {
    return true;
  }

  const a = alt.toLowerCase();
  if (a.includes('logo') || a.includes('avatar') || a.includes('icon') || a.includes('advertisement') || a.includes('discord')) {
    return true;
  }

  // Dimension check if specified
  if (width && height && (width < 250 || height < 250)) {
    return true;
  }

  return false;
}

// Select best quality image from attributes
function getBestImageSrc(img: any, $: cheerio.CheerioAPI): string {
  const el = $(img);
  const candidates = [
    el.attr('data-src'),
    el.attr('data-lazy-src'),
    el.attr('data-original'),
    el.attr('data-full-src'),
    el.attr('data-cdn'),
    el.attr('data-url'),
    el.attr('src'),
  ];

  // Also check srcset
  const srcset = el.attr('srcset');
  if (srcset) {
    const parts = srcset.split(',').map(p => p.trim().split(' ')[0]);
    if (parts.length > 0) {
      candidates.unshift(parts[parts.length - 1]); // Highest res is often last
    }
  }

  for (const c of candidates) {
    if (c && typeof c === 'string') {
      const trimmed = c.trim();
      if (trimmed.startsWith('//')) {
        return `https:${trimmed}`;
      }
      if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
        return trimmed;
      }
    }
  }

  return '';
}

// Sort images numerically if page numbers appear in URL / filename
export function sortPageImages(images: string[]): string[] {
  return [...images].sort((a, b) => {
    const numA = extractPageNumber(a);
    const numB = extractPageNumber(b);
    if (numA !== null && numB !== null) {
      return numA - numB;
    }
    return 0; // preserve DOM order
  });
}

function extractPageNumber(url: string): number | null {
  try {
    const filename = url.split('/').pop()?.split('?')[0] || '';
    const match = filename.match(/(?:page[-_]?|p[-_]?|^)(\d+)(?:\.[a-z0-9]+)?$/i) ||
                  filename.match(/(\d+)\.(?:jpg|jpeg|png|webp|avif)/i);
    if (match && match[1]) {
      return parseInt(match[1], 10);
    }
  } catch {}
  return null;
}

export class MangaExtractor {
  // Extract Manga Page Metadata
  async extractMangaDetails(sourceMangaUrl: string, existingChapters: DiscoveredChapter[] = []): Promise<ExtractedManga> {
    const { text } = await fetchText(sourceMangaUrl, { timeoutMs: 15000 });
    const $ = cheerio.load(text);

    // 1. Title Extraction
    let title =
      $('meta[property="og:title"]').attr('content') ||
      $('h1.entry-title').text().trim() ||
      $('h1.post-title').text().trim() ||
      $('.manga-info h1').text().trim() ||
      $('.post-content h1').text().trim() ||
      $('h1').first().text().trim() ||
      $('meta[name="twitter:title"]').attr('content') ||
      $('title').text().replace(/[-–|].*$/, '').trim() ||
      'Untitled Manga';

    title = title.replace(/\s+manga\s*(?:online|raw|free)?/i, '').trim();

    // 2. Slug
    const slug = sourceMangaUrl.replace(/\/+$/, '').split('/').pop() ||
      title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

    // 3. Cover URL
    let cover =
      $('meta[property="og:image"]').attr('content') ||
      $('meta[name="twitter:image"]').attr('content') ||
      $('.summary_image img').attr('src') ||
      $('.summary_image img').attr('data-src') ||
      $('.tab-summary img').attr('src') ||
      $('.manga-poster img').attr('src') ||
      $('.thumb img').attr('src') ||
      $('img.attachment-post-thumbnail').attr('src') ||
      '';

    if (cover.startsWith('//')) cover = `https:${cover}`;

    // 4. Banner URL
    let banner =
      $('.manga-banner img').attr('src') ||
      $('.banner-image img').attr('src') ||
      $('meta[property="og:image:secure_url"]').attr('content') ||
      cover;

    if (banner.startsWith('//')) banner = `https:${banner}`;

    // 5. Description / Summary
    let summary =
      $('meta[property="og:description"]').attr('content') ||
      $('meta[name="description"]').attr('content') ||
      $('.manga-excerpt').text().trim() ||
      $('.description-summary .summary__content').text().trim() ||
      $('.panel-story-info-description').text().trim() ||
      $('.entry-content p').first().text().trim() ||
      'Read manga online with high quality pages and fast loading.';

    summary = summary.replace(/^synopsis\s*:\s*/i, '').trim();

    // 6. Genres & Tags
    const tagsSet = new Set<string>();
    $('a[href*="/genre/"], a[href*="/genres/"], a[href*="/tag/"], .genres-content a, .manga-tags a').each((_, el) => {
      const g = $(el).text().trim();
      if (g && g.length < 30 && !g.toLowerCase().includes('all')) {
        tagsSet.add(g.charAt(0).toUpperCase() + g.slice(1));
      }
    });

    const tags = Array.from(tagsSet);
    if (tags.length === 0) {
      tags.push('Action', 'Shonen', 'Adventure');
    }

    // 7. Author & Artist & Status
    const author = $('.author-content a').text().trim() || $('.manga-authors').text().trim() || undefined;
    const artist = $('.artist-content a').text().trim() || undefined;
    let status = $('.post-status .summary-content').text().trim() || 'ongoing';
    if (/complete/i.test(status)) status = 'completed';
    else status = 'ongoing';

    // 8. Discover additional chapters listed directly on the manga page
    const onPageChapters: DiscoveredChapter[] = [];
    $('a[href*="/chapter"], a[href*="/ch-"], li.wp-manga-chapter a, ul.row-content-chapter li a').each((_, el) => {
      const href = $(el).attr('href');
      if (href && (href.startsWith('http://') || href.startsWith('https://'))) {
        const textLabel = $(el).text().trim();
        const chSlug = href.replace(/\/+$/, '').split('/').pop() || '';
        const chNum = parseChapterNumber(textLabel || chSlug);
        onPageChapters.push({
          sourceUrl: href,
          title: textLabel || `Chapter ${chNum}`,
          chapterNumber: chNum,
          slug: chSlug,
        });
      }
    });

    // Merge existing discovered sitemap chapters with on-page chapters
    const chapterMap = new Map<number, DiscoveredChapter>();

    const addChapterWithCollisionHandling = (ch: DiscoveredChapter) => {
      const num = ch.chapterNumber;
      if (!chapterMap.has(num)) {
        chapterMap.set(num, ch);
        return;
      }

      // If it is the exact same URL, it is a duplicate list item, ignore
      if (chapterMap.get(num)!.sourceUrl === ch.sourceUrl) {
        return;
      }

      // Collision detected! Log warning and append decimal suffix
      console.warn(`⚠️ Warning: Chapter number collision detected for chapter ${num} ("${ch.title}" vs "${chapterMap.get(num)!.title}"). Resolving with decimal suffix.`);

      let suffix = 0.1;
      let resolvedNum = Math.round((num + suffix) * 10) / 10;
      while (chapterMap.has(resolvedNum)) {
        suffix += 0.1;
        resolvedNum = Math.round((num + suffix) * 10) / 10;
      }

      const adjustedChapter = {
        ...ch,
        chapterNumber: resolvedNum,
        title: ch.title.includes(String(num)) ? ch.title.replace(String(num), String(resolvedNum)) : `${ch.title} (v${resolvedNum})`
      };

      chapterMap.set(resolvedNum, adjustedChapter);
    };

    for (const ch of existingChapters) {
      addChapterWithCollisionHandling(ch);
    }
    for (const ch of onPageChapters) {
      addChapterWithCollisionHandling(ch);
    }

    // Sort chapters numerically ascending (1, 2, 3...)
    const mergedChapters = Array.from(chapterMap.values()).sort((a, b) => a.chapterNumber - b.chapterNumber);

    const initialChapters: ExtractedChapter[] = mergedChapters.map((ch) => ({
      title: ch.title,
      slug: ch.slug || `chapter-${ch.chapterNumber}`,
      chapter_number: ch.chapterNumber,
      sourceUrl: ch.sourceUrl,
      images: [],
      validPagesCount: 0,
      rejectedAssetsCount: 0,
    }));

    return {
      title,
      slug,
      cover,
      banner,
      summary,
      author,
      artist,
      status,
      tags,
      sourceUrl: sourceMangaUrl,
      chapters: initialChapters,
    };
  }

  // Extract Images from Chapter Page
  async extractChapterImages(chapterUrl: string): Promise<{ images: string[]; validCount: number; rejectedCount: number }> {
    const { text } = await fetchText(chapterUrl, { timeoutMs: 15000 });
    const $ = cheerio.load(text);

    const rawCandidates: string[] = [];
    let rejectedCount = 0;

    // Selector sets used by major manga sites & CMS
    const readerSelectors = [
      '.reading-content img',
      '.page-break img',
      '.chapter-content img',
      '#readerarea img',
      '.reader-content img',
      '.wp-manga-chapter-img',
      '.js-page',
      '.vung-doc img',
      '#chapter-images img',
      '.separator img',
      'img[data-src]',
      'img[data-lazy-src]',
      'img[data-original]',
      'img.lazy',
    ];

    let foundImages: cheerio.Cheerio<any> = $([]);
    for (const sel of readerSelectors) {
      const match = $(sel);
      if (match.length >= 2) {
        foundImages = match;
        break;
      }
    }

    // Fallback: search all images in container with reader or chapter in class/id
    if (foundImages.length === 0) {
      const readerBox = $('[class*="reader"], [id*="reader"], [class*="chapter"], [id*="chapter"]');
      if (readerBox.length > 0) {
        foundImages = readerBox.find('img');
      }
    }

    // Secondary fallback: all images with large aspect ratio or lazy-loaded
    if (foundImages.length === 0) {
      foundImages = $('img');
    }

    foundImages.each((_, el) => {
      const src = getBestImageSrc(el, $);
      const alt = $(el).attr('alt') || '';
      const w = parseInt($(el).attr('width') || '0', 10);
      const h = parseInt($(el).attr('height') || '0', 10);

      if (src) {
        if (!isInvalidMangaPage(src, alt, w, h)) {
          if (!rawCandidates.includes(src)) {
            rawCandidates.push(src);
          }
        } else {
          rejectedCount++;
        }
      }
    });

    // Fallback: If scraper got scripts with embedded JSON image arrays
    if (rawCandidates.length === 0) {
      $('script').each((_, el) => {
        const code = $(el).html() || '';
        // Look for arrays of image urls in js variables
        const matches = code.match(/https?:\/\/[^"'\s\\]+\.(?:jpg|jpeg|png|webp|avif)/gi);
        if (matches && matches.length >= 3) {
          for (const m of matches) {
            if (!isInvalidMangaPage(m) && !rawCandidates.includes(m)) {
              rawCandidates.push(m);
            }
          }
        }
      });
    }

    // Sort page images into exact numerical or DOM order
    const orderedImages = sortPageImages(rawCandidates);

    return {
      images: orderedImages,
      validCount: orderedImages.length,
      rejectedCount,
    };
  }
}
