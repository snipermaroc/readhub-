import * as cheerio from 'cheerio';

export interface ParsedSitemap {
  isIndex: boolean;
  childSitemaps: string[];
  urls: {
    loc: string;
    lastmod?: string;
    changefreq?: string;
    priority?: string;
  }[];
}

export function parseSitemapXml(xmlContent: string): ParsedSitemap {
  // Use cheerio in xmlMode for safe, robust parsing without external entity execution
  const $ = cheerio.load(xmlContent, {
    xmlMode: true,
  });

  const childSitemaps: string[] = [];
  const urls: { loc: string; lastmod?: string; changefreq?: string; priority?: string }[] = [];

  // Check for Sitemap Index
  const sitemaps = $('sitemapindex > sitemap');
  if (sitemaps.length > 0) {
    sitemaps.each((_, el) => {
      const loc = $(el).find('loc').text().trim();
      if (loc && (loc.startsWith('http://') || loc.startsWith('https://'))) {
        childSitemaps.push(loc);
      }
    });

    return {
      isIndex: true,
      childSitemaps,
      urls: [],
    };
  }

  // Check for standard Urlset
  const urlNodes = $('urlset > url');
  urlNodes.each((_, el) => {
    const loc = $(el).find('loc').text().trim();
    if (loc && (loc.startsWith('http://') || loc.startsWith('https://'))) {
      const lastmod = $(el).find('lastmod').text().trim() || undefined;
      const changefreq = $(el).find('changefreq').text().trim() || undefined;
      const priority = $(el).find('priority').text().trim() || undefined;
      urls.push({ loc, lastmod, changefreq, priority });
    }
  });

  // Fallback: If not standard urlset but has loose <loc> elements
  if (urls.length === 0 && childSitemaps.length === 0) {
    $('loc').each((_, el) => {
      const loc = $(el).text().trim();
      if (loc.endsWith('.xml') || loc.includes('sitemap')) {
        childSitemaps.push(loc);
      } else if (loc.startsWith('http://') || loc.startsWith('https://')) {
        urls.push({ loc });
      }
    });
  }

  return {
    isIndex: childSitemaps.length > 0 && urls.length === 0,
    childSitemaps,
    urls,
  };
}
