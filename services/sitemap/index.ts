export * from './SitemapFetcher';
export * from './SitemapParser';
export * from './SitemapDiscovery';
export * from './MangaExtractor';
export * from './ImportJobManager';

import { SitemapDiscovery } from './SitemapDiscovery';
import { MangaExtractor } from './MangaExtractor';
import { ImportJobManager } from './ImportJobManager';

export const sitemapDiscovery = new SitemapDiscovery();
export const mangaExtractor = new MangaExtractor();
export const importJobManager = new ImportJobManager();
