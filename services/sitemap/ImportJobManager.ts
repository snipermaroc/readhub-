import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { ExtractedManga, MangaExtractor } from './MangaExtractor';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const historyFile = path.join(__dirname, '..', '..', 'data', 'import_history.json');

export interface FailedItem {
  id: string;
  chapterSlug: string;
  chapterTitle: string;
  pageNumber?: number;
  url: string;
  reason: string;
  retried: boolean;
}

export interface ImportStep {
  name: string;
  label: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress?: number;
}

export interface ImportJob {
  id: string;
  sourceSitemap: string;
  mangaTitle: string;
  mangaSlug: string;
  sourceMangaUrl: string;
  targetSiteId?: string;
  status: 'pending' | 'running' | 'completed' | 'completed_with_warnings' | 'failed';
  steps: ImportStep[];
  currentStepDescription: string;
  chaptersTotal: number;
  chaptersProcessed: number;
  pagesTotal: number;
  pagesSuccess: number;
  pagesFailed: number;
  failedItems: FailedItem[];
  startTime: string;
  endTime?: string;
  durationSeconds?: number;
  extractedManga?: ExtractedManga;
  logs: string[];
}

export class ImportJobManager {
  private jobs = new Map<string, ImportJob>();
  private extractor = new MangaExtractor();

  constructor() {
    this.loadHistory();
  }

  private loadHistory() {
    try {
      if (fs.existsSync(historyFile)) {
        const raw = fs.readFileSync(historyFile, 'utf8');
        const list: ImportJob[] = JSON.parse(raw);
        for (const job of list) {
          this.jobs.set(job.id, job);
        }
      }
    } catch {}
  }

  private saveHistory() {
    try {
      const dir = path.dirname(historyFile);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      const list = Array.from(this.jobs.values()).slice(-50); // Keep last 50
      
      // Trim in-memory map to prevent unbounded memory growth
      this.jobs.clear();
      for (const job of list) {
        this.jobs.set(job.id, job);
      }

      fs.writeFileSync(historyFile, JSON.stringify(list, null, 2), 'utf8');
    } catch {}
  }

  getJob(id: string): ImportJob | undefined {
    return this.jobs.get(id);
  }

  getAllJobs(): ImportJob[] {
    return Array.from(this.jobs.values()).sort(
      (a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
    );
  }

  createJob(params: {
    sourceSitemap: string;
    mangaTitle: string;
    mangaSlug: string;
    sourceMangaUrl: string;
    targetSiteId?: string;
  }): ImportJob {
    const id = `job_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    const job: ImportJob = {
      id,
      sourceSitemap: params.sourceSitemap,
      mangaTitle: params.mangaTitle,
      mangaSlug: params.mangaSlug,
      sourceMangaUrl: params.sourceMangaUrl,
      targetSiteId: params.targetSiteId,
      status: 'pending',
      steps: [
        { name: 'sitemap_analysis', label: 'Sitemap Analysis', status: 'completed' },
        { name: 'manga_metadata', label: 'Manga Metadata', status: 'pending' },
        { name: 'chapter_discovery', label: 'Chapter Discovery', status: 'pending' },
        { name: 'pages_extraction', label: 'Pages & Images Extraction', status: 'pending' },
        { name: 'database_publish', label: 'Publish to Manga Hub', status: 'pending' },
      ],
      currentStepDescription: 'Queued for import...',
      chaptersTotal: 0,
      chaptersProcessed: 0,
      pagesTotal: 0,
      pagesSuccess: 0,
      pagesFailed: 0,
      failedItems: [],
      startTime: new Date().toISOString(),
      logs: [],
    };

    this.jobs.set(id, job);
    this.saveHistory();
    return job;
  }

  // Execute Import Job Async
  async startJob(
    jobId: string,
    extractedManga: ExtractedManga,
    chaptersToImport: number | 'all',
    onSaveToDb: (manga: ExtractedManga, targetSiteId?: string) => Promise<any>
  ) {
    const job = this.jobs.get(jobId);
    if (!job) return;

    job.status = 'running';
    job.extractedManga = extractedManga;
    const startTimestamp = Date.now();

    try {
      // Step 1: Manga Metadata
      const metaStep = job.steps.find((s) => s.name === 'manga_metadata');
      if (metaStep) metaStep.status = 'running';
      job.currentStepDescription = `Extracting full metadata for "${extractedManga.title}"...`;
      job.logs.push(`Starting import job for ${extractedManga.title} (${extractedManga.sourceUrl})`);

      // Limit chapters if requested
      let targetChapters = [...extractedManga.chapters];
      if (typeof chaptersToImport === 'number') {
        targetChapters = targetChapters.slice(0, chaptersToImport);
      }

      job.chaptersTotal = targetChapters.length;
      if (metaStep) metaStep.status = 'completed';

      // Step 2: Chapter Discovery
      const chStep = job.steps.find((s) => s.name === 'chapter_discovery');
      if (chStep) chStep.status = 'completed';

      // Step 3: Extract Images for each Chapter
      const pageStep = job.steps.find((s) => s.name === 'pages_extraction');
      if (pageStep) pageStep.status = 'running';

      for (let i = 0; i < targetChapters.length; i++) {
        const ch = targetChapters[i];
        job.chaptersProcessed = i + 1;
        job.currentStepDescription = `Fetching Chapter ${ch.chapter_number} (${i + 1}/${targetChapters.length}): ${ch.title}`;
        job.logs.push(`Processing Chapter ${ch.chapter_number} (${ch.sourceUrl})`);

        // Update step progress
        if (pageStep) {
          pageStep.progress = Math.round(((i + 1) / targetChapters.length) * 100);
        }

        try {
          // If images were already extracted during preview, reuse them
          if (!ch.images || ch.images.length === 0) {
            const { images, validCount, rejectedCount } = await this.extractor.extractChapterImages(ch.sourceUrl);
            ch.images = images;
            ch.validPagesCount = validCount;
            ch.rejectedAssetsCount = rejectedCount;
          }

          job.pagesTotal += ch.images.length;
          job.pagesSuccess += ch.images.length;

          if (ch.images.length === 0) {
            job.pagesFailed += 1;
            job.failedItems.push({
              id: crypto.randomUUID(),
              chapterSlug: ch.slug,
              chapterTitle: ch.title,
              url: ch.sourceUrl,
              reason: 'No valid manga page images detected in reader container',
              retried: false,
            });
            job.logs.push(`⚠️ Chapter ${ch.chapter_number}: 0 valid images found`);
          } else {
            job.logs.push(`✓ Chapter ${ch.chapter_number}: extracted ${ch.images.length} pages (${ch.rejectedAssetsCount} filtered ads)`);
          }
        } catch (err: any) {
          job.pagesFailed += 1;
          job.failedItems.push({
            id: crypto.randomUUID(),
            chapterSlug: ch.slug,
            chapterTitle: ch.title,
            url: ch.sourceUrl,
            reason: err.message || 'Fetch error',
            retried: false,
          });
          job.logs.push(`❌ Failed to extract chapter ${ch.chapter_number}: ${err.message}`);
        }

        // Polite delay (250ms) between chapter scrapes to respect rate limits
        await new Promise((r) => setTimeout(r, 250));
      }

      if (pageStep) pageStep.status = 'completed';

      // Step 4: Publish into Manga Hub Database
      const pubStep = job.steps.find((s) => s.name === 'database_publish');
      if (pubStep) pubStep.status = 'running';
      job.currentStepDescription = `Writing manga records and chapters to Manga Hub PostgreSQL...`;

      extractedManga.chapters = targetChapters;
      await onSaveToDb(extractedManga, job.targetSiteId);

      if (pubStep) pubStep.status = 'completed';

      job.endTime = new Date().toISOString();
      job.durationSeconds = Math.round((Date.now() - startTimestamp) / 1000);
      job.status = job.failedItems.length > 0 ? 'completed_with_warnings' : 'completed';
      job.currentStepDescription = `Import finished! ${targetChapters.length} chapters and ${job.pagesSuccess} pages saved.`;
      job.logs.push(`🎉 Import completed in ${job.durationSeconds}s!`);
    } catch (err: any) {
      job.status = 'failed';
      job.endTime = new Date().toISOString();
      job.durationSeconds = Math.round((Date.now() - startTimestamp) / 1000);
      job.currentStepDescription = `Import failed: ${err.message}`;
      job.logs.push(`🔥 Fatal import job error: ${err.message}`);
    } finally {
      this.saveHistory();
    }
  }

  // Retry Failed Chapters
  async retryFailed(jobId: string, onSaveToDb: (manga: ExtractedManga, targetSiteId?: string) => Promise<any>) {
    const job = this.jobs.get(jobId);
    if (!job || !job.extractedManga) return;

    job.status = 'running';
    job.currentStepDescription = `Retrying ${job.failedItems.length} failed items...`;

    for (const fail of job.failedItems) {
      if (fail.retried) continue;
      try {
        const { images, validCount } = await this.extractor.extractChapterImages(fail.url);
        if (images.length > 0) {
          const ch = job.extractedManga.chapters.find((c) => c.slug === fail.chapterSlug);
          if (ch) {
            ch.images = images;
            ch.validPagesCount = validCount;
          }
          fail.retried = true;
          job.pagesSuccess += images.length;
          if (job.pagesFailed > 0) job.pagesFailed -= 1;
        }
      } catch (err: any) {
        fail.reason = `Retry error: ${err.message}`;
      }
    }

    // Re-save database records
    await onSaveToDb(job.extractedManga, job.targetSiteId);
    job.status = job.failedItems.filter((f) => !f.retried).length > 0 ? 'completed_with_warnings' : 'completed';
    job.currentStepDescription = `Retry cycle complete.`;
    this.saveHistory();
  }
}
