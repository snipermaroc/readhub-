import React, { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Check,
  Code,
  FileCode,
  Image as ImageIcon,
  Loader2,
  Plus,
  RefreshCw,
  Sparkles,
  Star,
  Trash2,
  Upload,
  Zap,
} from 'lucide-react'
import { projects, generate, type Project, type PopularItem } from '@/lib/api'
import { LanguageToggle } from '@/components/LanguageToggle'
import { ThemeToggle } from '@/components/ThemeToggle'

export default function PopularManager() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [project, setProject] = useState<Project | null>(null)
  const [items, setItems] = useState<PopularItem[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [saving, setSaving] = useState<boolean>(false)
  const [generating, setGenerating] = useState<boolean>(false)
  const [msg, setMsg] = useState<string>('')
  const [err, setErr] = useState<string>('')

  // JSON Import Modal
  const [jsonModal, setJsonModal] = useState<boolean>(false)
  const [jsonText, setJsonText] = useState<string>('')

  useEffect(() => {
    if (!id) return
    setLoading(true)
    projects
      .get(id)
      .then((p) => {
        setProject(p)
        const popList = p.siteData?.config?.popular_manga
        if (Array.isArray(popList)) {
          setItems(
            popList.map((item: any) => ({
              title: item.title || '',
              cover: item.cover || item.cover_url || '',
              link: item.link || item.url || '#',
            }))
          )
        }
      })
      .catch((e: any) => setErr(e.message || 'Failed to load project'))
      .finally(() => setLoading(false))
  }, [id])

  const save = async (newItems: PopularItem[]): Promise<Project | null> => {
    if (!id || !project) return null
    setSaving(true)
    setErr('')
    setMsg('')

    try {
      const updatedSiteData = {
        ...project.siteData,
        config: {
          ...(project.siteData?.config || {}),
          popular_manga: newItems,
        },
      }

      const updated = await projects.update(id, {
        ...project,
        siteData: updatedSiteData as any,
      })

      setProject(updated)
      setItems(newItems)
      setMsg('✓ Popular manga list saved successfully')
      return updated
    } catch (e: any) {
      setErr(e.message || 'Failed to save popular manga list')
      return null
    } finally {
      setSaving(false)
    }
  }

  const handleAddItem = () => {
    const newItems = [
      ...items,
      {
        title: '',
        cover: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=600',
        link: '#',
      },
    ]
    setItems(newItems)
  }

  const handleUpdateItem = (index: number, field: keyof PopularItem, value: string) => {
    const copy = [...items]
    copy[index] = { ...copy[index], [field]: value }
    setItems(copy)
  }

  const handleRemoveItem = (index: number) => {
    const copy = items.filter((_, i) => i !== index)
    setItems(copy)
  }

  const handleUploadCover = async (index: number, file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    try {
      const res = await fetch('/api/upload/image', {
        method: 'POST',
        body: formData,
      })
      if (!res.ok) throw new Error('Cover upload failed')
      const data = await res.json()
      if (data.url) handleUpdateItem(index, 'cover', data.url)
    } catch (e: any) {
      setErr(e.message || 'Failed to upload cover image')
    }
  }

  const handleGeneratePopular = async () => {
    if (!id) return
    setGenerating(true)
    setErr('')
    setMsg('')
    try {
      const saved = await save(items)
      if (!saved) return
      await generate.popular(id)
      setMsg('⚡ popular.html generated successfully!')
    } catch (e: any) {
      setErr(e.message || 'Failed to generate popular.html page')
    } finally {
      setGenerating(false)
    }
  }

  const handleClearAll = async () => {
    if (!id) return
    if (!window.confirm('Clear all popular manga items and delete popular.html?')) return
    try {
      await save([])
      await generate.deletePopular(id)
      setMsg('Cleared all popular manga items')
    } catch (e: any) {
      setErr(e.message || 'Failed to clear popular items')
    }
  }

  const handleApplyJson = () => {
    try {
      const parsed = JSON.parse(jsonText)
      const list = Array.isArray(parsed) ? parsed : parsed.popular_manga || []
      const formatted: PopularItem[] = list.map((item: any) => ({
        title: item.title || '',
        cover: item.cover || item.cover_url || item.image || '',
        link: item.link || item.url || '#',
      }))

      // Appends to existing items
      const combined = [...items, ...formatted]
      setItems(combined)
      setJsonModal(false)
      setJsonText('')
      void save(combined)
    } catch (e: any) {
      setErr('Invalid JSON structure. Expected array of popular items.')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-foreground grid place-items-center">
        <Loader2 size={32} className="animate-spin text-primary" />
      </div>
    )
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
              title="Return to Admin"
            >
              <ArrowLeft size={18} />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold tracking-tight text-foreground font-headline">READHUB</span>
                <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-bold text-primary border border-primary/20">
                  POPULAR MANGA MANAGER
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground truncate max-w-xs sm:max-w-md">
                {project?.site_name || 'Popular Page Builder'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <LanguageToggle />
            <button
              type="button"
              onClick={() => setJsonModal(true)}
              className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted transition"
            >
              <Code size={14} /> Import JSON
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="mx-auto max-w-5xl px-4 sm:px-6 pt-8 space-y-8">
        {/* Banner */}
        <div className="rounded-2xl border border-border bg-card p-6 md:p-8 shadow-sm">
          <div className="flex items-center gap-3 text-primary mb-2">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 border border-primary/20">
              <Star size={22} className="fill-primary" />
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold font-headline tracking-tight text-foreground">
              ⭐ Popular Manga Showcase (`popular.html`)
            </h1>
          </div>
          <p className="mt-2 text-sm text-muted-foreground leading-relaxed max-w-2xl">
            Manage the featured series grid for this website. Generate a dedicated <code>popular.html</code> showcase page or embed featured cards across your portal.
          </p>
        </div>

        {/* Notifications */}
        {msg && (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-xs font-bold text-emerald-600 dark:text-emerald-400 shadow-sm flex items-center gap-2">
            <Check size={16} /> {msg}
          </div>
        )}
        {err && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-xs font-bold text-destructive shadow-sm">
            {err}
          </div>
        )}

        {/* Card Grid Container */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
            <div>
              <span className="text-xs uppercase font-bold text-primary tracking-wider font-headline">Showcase Items</span>
              <h2 className="text-lg font-bold text-foreground font-headline mt-0.5">
                Featured Manga Entries ({items.length})
              </h2>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleAddItem}
                className="flex items-center gap-1.5 rounded-xl border border-border bg-card px-3.5 py-2 text-xs font-bold text-foreground hover:border-primary transition shadow-sm"
              >
                <Plus size={14} /> Add Series
              </button>

              <button
                type="button"
                onClick={() => void save(items)}
                disabled={saving}
                className="flex items-center gap-1.5 rounded-xl border border-border bg-card px-4 py-2 text-xs font-bold text-foreground hover:border-primary transition shadow-sm"
              >
                {saving ? <Loader2 size={14} className="animate-spin text-primary" /> : <RefreshCw size={14} />}
                Save Changes
              </button>

              <button
                type="button"
                onClick={handleGeneratePopular}
                disabled={generating}
                className="flex items-center gap-2 rounded-xl bg-primary text-primary-foreground px-5 py-2 text-xs font-bold shadow-md shadow-primary/20 hover:opacity-90 transition"
              >
                {generating ? <Loader2 size={15} className="animate-spin" /> : <Zap size={15} />}
                Generate popular.html
              </button>
            </div>
          </div>

          {/* Cards List */}
          {items.length === 0 ? (
            <div className="text-center py-16 rounded-xl border border-dashed border-border bg-muted/20 space-y-3">
              <p className="text-sm font-bold text-foreground">No popular manga cards added yet.</p>
              <button
                type="button"
                onClick={handleAddItem}
                className="inline-flex items-center gap-2 rounded-xl bg-primary text-primary-foreground px-4 py-2 text-xs font-bold shadow-sm"
              >
                <Plus size={14} /> Add First Entry
              </button>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {items.map((item, idx) => (
                <div
                  key={idx}
                  className="rounded-xl border border-border bg-muted/20 p-4 space-y-3 flex items-start gap-3 relative shadow-sm"
                >
                  {/* Cover Preview (80x112px) */}
                  <div className="w-20 h-28 shrink-0 rounded-lg overflow-hidden border border-border bg-card shadow-sm">
                    {item.cover ? (
                      <img src={item.cover} alt={item.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full grid place-items-center bg-muted text-muted-foreground">
                        <ImageIcon size={16} />
                      </div>
                    )}
                  </div>

                  {/* Inputs */}
                  <div className="flex-1 space-y-2 text-xs">
                    <div>
                      <label className="font-semibold text-foreground block mb-1">Series Title</label>
                      <input
                        type="text"
                        value={item.title}
                        onChange={(e) => handleUpdateItem(idx, 'title', e.target.value)}
                        placeholder="e.g. Solo Leveling"
                        className="w-full rounded-lg border border-input bg-card px-2.5 py-1.5 text-xs text-foreground focus:border-primary focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="font-semibold text-foreground flex items-center justify-between mb-1">
                        <span>Cover URL</span>
                        <label className="text-[10px] text-primary font-bold cursor-pointer hover:underline flex items-center gap-1">
                          <Upload size={10} /> Upload
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              const f = e.target.files?.[0]
                              if (f) void handleUploadCover(idx, f)
                            }}
                            className="hidden"
                          />
                        </label>
                      </label>
                      <input
                        type="url"
                        value={item.cover}
                        onChange={(e) => handleUpdateItem(idx, 'cover', e.target.value)}
                        placeholder="https://..."
                        className="w-full rounded-lg border border-input bg-card px-2.5 py-1.5 text-xs text-foreground focus:border-primary focus:outline-none font-mono text-[11px]"
                      />
                    </div>

                    <div>
                      <label className="font-semibold text-foreground block mb-1">Target Link URL</label>
                      <input
                        type="text"
                        value={item.link}
                        onChange={(e) => handleUpdateItem(idx, 'link', e.target.value)}
                        placeholder="/manga/solo-leveling"
                        className="w-full rounded-lg border border-input bg-card px-2.5 py-1.5 text-xs text-foreground focus:border-primary focus:outline-none font-mono text-[11px]"
                      />
                    </div>
                  </div>

                  {/* Remove Button */}
                  <button
                    type="button"
                    onClick={() => handleRemoveItem(idx)}
                    className="p-1.5 text-muted-foreground hover:text-destructive rounded-lg transition"
                    title="Remove entry"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {items.length > 0 && (
            <div className="pt-4 border-t border-border flex justify-between items-center">
              <button
                type="button"
                onClick={handleClearAll}
                className="text-xs font-bold text-destructive hover:underline"
              >
                Clear All Popular Entries
              </button>

              <span className="text-xs text-muted-foreground font-mono">
                {items.length} items configured
              </span>
            </div>
          )}
        </div>
      </main>

      {/* JSON Import Modal */}
      {jsonModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm grid place-items-center p-4">
          <div className="w-full max-w-xl rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-foreground font-headline">Import Popular Manga JSON</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Paste a JSON array of popular manga objects. New entries will be appended to your existing list.
            </p>
            <textarea
              value={jsonText}
              onChange={(e) => setJsonText(e.target.value)}
              placeholder='[ { "title": "Solo Leveling", "cover": "https://...", "link": "/manga/solo-leveling" } ]'
              rows={8}
              className="w-full rounded-xl border border-input bg-card p-3 font-mono text-xs text-foreground focus:border-primary focus:outline-none"
            />
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setJsonModal(false)}
                className="rounded-xl border border-border bg-card px-4 py-2 text-xs font-semibold text-foreground hover:bg-muted"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApplyJson}
                className="rounded-xl bg-primary text-primary-foreground px-5 py-2 text-xs font-bold shadow-md shadow-primary/20 hover:opacity-90"
              >
                Append Items
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
