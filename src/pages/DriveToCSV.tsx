import React, { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Download,
  ExternalLink,
  FileCode,
  FileSpreadsheet,
  FolderDown,
  FolderOpen,
  Key,
  Layers,
  Loader2,
  Plus,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Upload,
  X,
  Zap,
} from 'lucide-react'
import {
  driveToCSV,
  projects,
  type CredentialsStatus,
  type CsvFile,
  type Project,
  type ScanResult,
} from '@/lib/api'
import { useTranslation } from 'react-i18next'
import { LanguageToggle } from '@/components/LanguageToggle'
import { ThemeToggle } from '@/components/ThemeToggle'

export default function DriveToCSV() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  // Credentials
  const [creds, setCreds] = useState<CredentialsStatus | null>(null)
  const [uploading, setUploading] = useState<boolean>(false)
  const [uploadErr, setUploadErr] = useState<string>('')

  // Input fields
  const [driveUrl, setDriveUrl] = useState<string>('')
  const [mangaTitle, setMangaTitle] = useState<string>('')

  // SSE Progress
  const [scanning, setScanning] = useState<boolean>(false)
  const [progress, setProgress] = useState<string[]>([])
  const [progressPct, setProgressPct] = useState<number>(0)

  // Scan Results
  const [result, setResult] = useState<ScanResult | null>(null)
  const [error, setError] = useState<string>('')
  const [creating, setCreating] = useState<boolean>(false)
  const [created, setCreated] = useState<Project | null>(null)
  const [zipping, setZipping] = useState<boolean>(false)

  // DOM Refs
  const progressRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  // Fetch Credentials Status on Mount
  useEffect(() => {
    driveToCSV
      .credentialsStatus()
      .then(setCreds)
      .catch(() => setCreds({ configured: false }))
  }, [])

  // Auto-scroll progress log to bottom
  useEffect(() => {
    if (progressRef.current) {
      progressRef.current.scrollTop = progressRef.current.scrollHeight
    }
  }, [progress])

  // Upload credentials.json
  const handleUploadCreds = async (file: File) => {
    setUploading(true)
    setUploadErr('')
    try {
      const res = await driveToCSV.uploadCredentials(file)
      setCreds(res)
    } catch (e: any) {
      setUploadErr(e.message || 'Failed to upload credentials file')
    } finally {
      setUploading(false)
    }
  }

  // Initiate Drive folder scan via SSE
  const handleScan = () => {
    if (!driveUrl.trim()) return
    setScanning(true)
    setError('')
    setResult(null)
    setCreated(null)
    setProgress([])
    setProgressPct(0)

    const params = new URLSearchParams({
      url: driveUrl.trim(),
      mangaTitle: mangaTitle.trim() || 'Manga',
    })

    const backendUrl = `/api/drive-to-csv/scan?${params}`
    const es = new EventSource(backendUrl)

    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data)

        if (data.type === 'progress') {
          setProgress((prev) => [...prev, data.message])
          if (data.step && data.total) {
            setProgressPct(Math.round((data.step / data.total) * 100))
          }
        } else if (data.type === 'done') {
          setResult(data)
          setProgressPct(100)
          setProgress((prev) => [
            ...prev,
            `✅ Scan Complete! ${data.totalChapters} chapters, ${data.totalImages} images processed.`,
          ])
          setScanning(false)
          es.close()
        } else if (data.type === 'error') {
          setError(data.message)
          setScanning(false)
          es.close()
        }
      } catch (err) {
        console.error('SSE Message parsing error:', err)
      }
    }

    es.onerror = () => {
      setError('Connection lost or Drive API permission error. Please verify URL and Service Account access.')
      setScanning(false)
      es.close()
    }
  }

  // Browser-side single CSV download
  const downloadSingleCSV = (fileName: string, csv: string) => {
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = fileName.endsWith('.csv') ? fileName : `${fileName}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // Browser-side combined CSV download
  const downloadCombinedCSV = () => {
    if (!result) return
    const blob = new Blob([result.combinedCSV], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${result.rootName || 'manga'}-all-chapters.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // Download all as ZIP
  const downloadAllZip = async () => {
    if (!result) return
    setZipping(true)
    try {
      const blob = await driveToCSV.downloadZip(result.rootName, result.csvFiles)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${result.rootName || 'manga'}-csv-bundle.zip`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (e: any) {
      setError(e.message || 'Failed to download ZIP bundle')
    } finally {
      setZipping(false)
    }
  }

  // Create bare project shell and navigate to wizard
  const handleCreateProject = async () => {
    if (!result) return
    setCreating(true)
    setError('')
    try {
      const title = mangaTitle.trim() || result.rootName || 'Manga Edition'
      const slug = title
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')

      const p = await projects.create({
        site_name: title ? `Read ${title} Manga Online` : 'Read Manga Online',
        keyword: '',
        language: 'en',
        siteData: {
          site_name: title,
          keyword: '',
          language: 'en',
          baseUrl: '',
          manga: [
            {
              title,
              slug,
              cover: '',
              banner: '',
              summary: '',
              tags: [],
              chapters: result.chapters.map((ch) => ({
                title: ch.title,
                slug: `ch${String(ch.number).padStart(3, '0')}`,
                chapter_number: ch.number,
                images: [], // Images remain empty; user imports CSVs in wizard Step 3
              })),
            },
          ],
          config: {
            description: '',
            about_html: '',
            nav: { links: [] },
            footer: {
              about: '',
              copyright: '',
              legal: {
                privacy_link: '/privacy.html',
                tos_link: '/tos.html',
                dmca_link: '/dmca.html',
                cookie_link: '/cookies.html',
                contact_link: '/contact.html',
              },
            },
            ad_banners_list: [],
            ad_after_chapters_list: [],
            sidebar: {
              ads_list: [],
              stats: { enabled: false, rank: '', readers: '', rating: '' },
            },
            shop: {
              enabled: false,
              title: 'Editorial Collection',
              button_text: 'View Full Shop',
              button_link: '#',
              products: [],
            },
            seo: {
              author: '',
              robots: 'index, follow',
              og_image: '',
              twitter_card: 'summary_large_image',
              favicon_ico: '/favicon.ico',
              favicon_32: '/favicon-32x32.png',
              favicon_16: '/favicon-16x16.png',
              apple_touch: '/apple-touch-icon.png',
              manifest: '/site.webmanifest',
              google_verify: '',
              bing_verify: '',
              yandex_verify: '',
              ga_id: '',
              clarity_id: '',
              faq: [],
            },
          },
        },
      })

      setCreated(p)
    } catch (e: any) {
      setError(e.message || 'Failed to create project from scan results')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground pb-20">
      {/* Header */}
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
                  DRIVE TO CSV
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Convert Google Drive image folders to chapter CSV manifests
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

      {/* Main Container */}
      <main className="mx-auto max-w-5xl px-4 sm:px-6 pt-8 space-y-8">
        {/* Title Header Banner */}
        <div className="rounded-2xl border border-border bg-card p-6 md:p-8 shadow-sm">
          <div className="flex items-center gap-3 text-primary mb-2">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 border border-primary/20">
              <FolderDown size={22} />
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold font-headline tracking-tight text-foreground">
              📂 Google Drive → CSV Converter
            </h1>
          </div>
          <p className="mt-2 text-sm text-muted-foreground leading-relaxed max-w-2xl">
            Scan a shared Google Drive folder containing chapter image sub-folders. Automatically extracts all image URLs and builds formatted chapter CSV manifests ready for instant import or project creation.
          </p>
        </div>

        {/* Credentials Box */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
            <div className="flex items-center gap-2.5">
              <div className={`grid h-8 w-8 place-items-center rounded-lg ${creds?.configured ? 'bg-emerald-500/10 text-emerald-500' : 'bg-primary/10 text-primary'}`}>
                <Key size={18} />
              </div>
              <div>
                <h2 className="text-base font-bold text-foreground font-headline">
                  Google Drive Service Account
                </h2>
                <p className="text-xs text-muted-foreground">
                  GCP credentials required for folder API traversal
                </p>
              </div>
            </div>

            {/* Status Pill */}
            {creds?.configured ? (
              <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 px-3 py-1 text-xs font-semibold">
                <Check size={14} strokeWidth={3} />
                Service Account Connected
              </span>
            ) : (
              <span className="flex items-center gap-1.5 rounded-full bg-primary/10 text-primary border border-primary/20 px-3 py-1 text-xs font-semibold">
                Service Account Required
              </span>
            )}
          </div>

          {creds?.configured ? (
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-0.5">
                <p className="text-xs font-bold text-foreground font-headline">Active Credentials:</p>
                <p className="text-xs text-muted-foreground font-mono">
                  {creds.email || 'Service Account'} {creds.project ? `(${creds.project})` : ''}
                </p>
              </div>
              <div>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".json"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) void handleUploadCreds(file)
                  }}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  className="flex items-center gap-1.5 rounded-xl border border-border bg-card px-3.5 py-1.5 text-xs font-semibold text-foreground hover:bg-muted transition shadow-sm"
                >
                  {uploading ? <Loader2 size={14} className="animate-spin text-primary" /> : <RefreshCw size={14} />}
                  Replace JSON
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-2 text-xs text-muted-foreground leading-relaxed">
                <p className="font-bold text-foreground text-sm font-headline">1-Time GCP Setup Instructions:</p>
                <ol className="list-decimal pl-4 space-y-1">
                  <li>Create a GCP project at <a href="https://console.cloud.google.com" target="_blank" rel="noreferrer" className="text-primary hover:underline font-semibold">console.cloud.google.com <ExternalLink size={11} className="inline" /></a></li>
                  <li>Enable the <b>Google Drive API</b> in your GCP project library.</li>
                  <li>Go to <b>Service Accounts</b> → Create → Keys → Add Key → <b>JSON</b> → Download.</li>
                  <li>Upload the downloaded JSON file below and share your target Drive folder with the service account email (Viewer permissions).</li>
                </ol>
              </div>

              <div>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".json"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) void handleUploadCreds(file)
                  }}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-muted/30 p-4 text-xs font-bold text-foreground hover:border-primary w-full transition shadow-sm"
                >
                  {uploading ? <Loader2 size={16} className="animate-spin text-primary" /> : <Upload size={16} className="text-primary" />}
                  Upload Service Account credentials.json
                </button>
              </div>
            </div>
          )}

          {uploadErr && <p className="text-xs text-destructive font-medium">{uploadErr}</p>}
        </div>

        {/* Drive URL Inputs Card */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
          <div className="border-b border-border pb-3">
            <h2 className="text-base font-bold text-foreground font-headline">
              Drive Folder & Series Info
            </h2>
            <p className="text-xs text-muted-foreground">
              Provide the shared folder link and optional series title
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Manga Title (Optional)
              </label>
              <input
                type="text"
                value={mangaTitle}
                onChange={(e) => setMangaTitle(e.target.value)}
                placeholder="e.g. Solo Leveling"
                className="w-full rounded-xl border border-input bg-card px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 shadow-sm transition"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                Google Drive Folder URL / ID <span className="text-destructive font-bold">*</span>
              </label>
              <input
                type="url"
                value={driveUrl}
                onChange={(e) => setDriveUrl(e.target.value)}
                placeholder="https://drive.google.com/drive/folders/1A2B3C..."
                className="w-full rounded-xl border border-input bg-card px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 shadow-sm transition"
              />
            </div>
          </div>

          {/* Folder Structure Guidelines Box */}
          <div className="rounded-xl border border-border bg-muted/20 p-4 text-xs text-muted-foreground space-y-1.5">
            <p className="font-bold text-foreground font-headline flex items-center gap-1.5">
              <FolderOpen size={14} className="text-primary" /> Folder Structure Support:
            </p>
            <p>• <b>Nested Chapter Folders:</b> Root folder contains sub-folders named <code>Chapter 1</code>, <code>Ch.2 - Beginning</code>, etc. Each sub-folder becomes an individual chapter CSV.</p>
            <p>• <b>Flat Image Folder:</b> Root folder contains direct image files. Processed as a single complete chapter CSV.</p>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="button"
              onClick={handleScan}
              disabled={!driveUrl.trim() || !creds?.configured || scanning}
              className="flex items-center gap-2 rounded-xl bg-primary text-primary-foreground px-6 py-2.5 text-xs font-bold shadow-md shadow-primary/20 hover:opacity-90 disabled:opacity-50 transition"
            >
              {scanning ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} />}
              {scanning ? 'Scanning Drive Folder...' : '🔍 Scan & Convert'}
            </button>
          </div>
        </div>

        {/* SSE Progress Box (Shown while scanning / completed) */}
        {(scanning || progress.length > 0) && (
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-foreground font-headline">
                  {scanning ? 'Scanning Drive Folder...' : 'Scan Execution Log'}
                </span>
                {scanning && <Loader2 size={16} className="animate-spin text-primary" />}
              </div>
              <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary font-mono border border-primary/20">
                {progressPct}%
              </span>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
              <div
                className="bg-primary h-2 transition-all duration-300 ease-out"
                style={{ width: `${progressPct}%` }}
              />
            </div>

            {/* Log Output Box */}
            <div
              ref={progressRef}
              className="h-48 overflow-y-auto rounded-xl border border-border bg-muted/40 p-4 font-mono text-xs text-foreground/90 space-y-1 leading-relaxed shadow-inner"
            >
              {progress.map((msg, idx) => (
                <p key={idx} className="whitespace-pre-wrap">
                  {msg}
                </p>
              ))}
              {progress.length === 0 && (
                <p className="text-muted-foreground italic">Initiating connection to Google Drive API...</p>
              )}
            </div>
          </div>
        )}

        {/* Error Alert Box */}
        {error && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm font-medium text-destructive flex items-center gap-2 shadow-sm">
            <X size={18} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Results Box */}
        {result && (
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
              <div>
                <span className="text-xs uppercase font-bold text-primary tracking-wider font-headline">Scan Results</span>
                <h2 className="text-lg font-bold text-foreground font-headline mt-0.5">
                  {result.rootName || 'Manga Folder'}
                </h2>
              </div>

              {/* Stats Pills */}
              <div className="flex flex-wrap gap-2 text-xs font-bold">
                <span className="rounded-lg bg-primary/10 text-primary border border-primary/20 px-3 py-1">
                  {result.totalChapters} Chapters
                </span>
                <span className="rounded-lg bg-muted text-foreground border border-border px-3 py-1">
                  {result.totalImages} Images
                </span>
                <span className="rounded-lg bg-muted text-foreground border border-border px-3 py-1">
                  {result.csvFiles.length} CSV Files
                </span>
              </div>
            </div>

            {/* Individual Chapter CSV List */}
            <div className="space-y-3">
              <span className="text-xs font-bold text-foreground font-headline block">
                Chapter CSV Manifests ({result.csvFiles.length})
              </span>
              <div className="max-h-64 overflow-y-auto divide-y divide-border rounded-xl border border-border bg-card shadow-sm">
                {result.csvFiles.map((f, idx) => (
                  <div key={idx} className="flex items-center justify-between px-4 py-3 text-xs">
                    <div className="flex items-center gap-2.5">
                      <FileSpreadsheet size={16} className="text-primary shrink-0" />
                      <span className="font-semibold text-foreground">{f.fileName}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[11px] text-muted-foreground font-mono">
                        {f.imageCount} image URLs
                      </span>
                      <button
                        type="button"
                        onClick={() => downloadSingleCSV(f.fileName, f.csv)}
                        className="flex items-center gap-1 rounded-lg border border-border bg-muted px-2.5 py-1 text-[11px] font-semibold text-foreground hover:bg-card transition shadow-sm"
                      >
                        <Download size={12} /> CSV
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Action Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5">
              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={downloadCombinedCSV}
                  className="flex items-center gap-1.5 rounded-xl border border-border bg-card px-4 py-2.5 text-xs font-bold text-foreground hover:border-primary hover:text-primary transition shadow-sm"
                >
                  <FileSpreadsheet size={15} /> Download Combined CSV
                </button>

                <button
                  type="button"
                  onClick={downloadAllZip}
                  disabled={zipping}
                  className="flex items-center gap-1.5 rounded-xl border border-border bg-card px-4 py-2.5 text-xs font-bold text-foreground hover:border-primary hover:text-primary transition shadow-sm"
                >
                  {zipping ? <Loader2 size={15} className="animate-spin text-primary" /> : <FolderDown size={15} />}
                  Download All as ZIP
                </button>
              </div>

              <button
                type="button"
                onClick={handleCreateProject}
                disabled={creating}
                className="flex items-center gap-2 rounded-xl bg-primary text-primary-foreground px-6 py-2.5 text-xs font-bold shadow-md shadow-primary/20 hover:opacity-90 transition"
              >
                {creating ? <Loader2 size={16} className="animate-spin" /> : <RocketIcon size={16} />}
                {creating ? 'Creating Project...' : '🚀 Create Project Shell'}
              </button>
            </div>
          </div>
        )}

        {/* Project Created Success Card */}
        {created && (
          <div className="rounded-2xl border border-primary/40 bg-primary/10 p-6 shadow-xl backdrop-blur-md">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-full bg-primary text-primary-foreground">
                <Check size={22} strokeWidth={3} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-foreground font-headline">✓ Project Shell Created!</h3>
                <p className="text-xs text-primary">
                  Created project with {created.siteData?.manga?.[0]?.chapters?.length || 0} chapter placeholders.
                </p>
              </div>
            </div>

            <div className="mt-5 flex items-center justify-end">
              <button
                type="button"
                onClick={() => navigate(`/create/${created.id}`)}
                className="flex items-center gap-2 rounded-xl bg-primary text-primary-foreground px-6 py-2.5 text-xs font-bold shadow-md shadow-primary/20 hover:opacity-90 transition"
              >
                Open Site Builder Wizard <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

function RocketIcon({ size = 16 }: { size?: number }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
      <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
      <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" />
      <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
    </svg>
  )
}
