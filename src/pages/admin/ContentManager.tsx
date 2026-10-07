import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react"
import { BookOpen, Check, ChevronDown, FileImage, FileText, Plus, UploadCloud, Bot, Sparkles, AlertCircle, RefreshCw, CheckCircle2, Trash2, Eye, ExternalLink, Layers, MoreVertical } from "lucide-react"
import { supabase } from "@/lib/mangahub-db"
import { getAuthHeader } from "@/lib/postgres"

type Site = { id: string; name: string; subdomain: string }
type Manga = { id: string; site_id: string; title: string; slug: string; status: string; cover_url: string | null; description: string; genres: string[] }
type Chapter = { id: string; manga_id: string; title: string; slug: string; chapter_number: number; status: string; published_at: string | null }

const slugify = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")

export default function ContentManager() {
  const [sites, setSites] = useState<Site[]>([])
  const [manga, setManga] = useState<Manga[]>([])
  const [chapters, setChapters] = useState<Chapter[]>([])
  const [selectedSite, setSelectedSite] = useState("")
  const [selectedManga, setSelectedManga] = useState("")
  const [tab, setTab] = useState<"manga" | "chapters">("manga")
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")
  const [selectedChapter, setSelectedChapter] = useState("")

  // Standard Form States
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [cover, setCover] = useState("")
  const [genres, setGenres] = useState("")

  // Magic AI Wizard States
  const [mangaCreationMode, setMangaCreationMode] = useState<"standard" | "wizard">("standard")
  const [rawJsonPromptInput, setRawJsonPromptInput] = useState("")
  const [parsedWizardData, setParsedWizardData] = useState<any | null>(null)
  const [wizardParsingError, setParsedWizardError] = useState("")
  const [wizardProgress, setWizardProgress] = useState("")

  // Chapter state
  const [chapterTitle, setChapterTitle] = useState("")
  const [chapterNo, setChapterNo] = useState("1")
  const [chapterFiles, setChapterFiles] = useState<File[]>([])
  const [uploading, setUploading] = useState(false)
  const [images, setImages] = useState<any[]>([])

  const refresh = useCallback(async () => {
    setLoading(true)
    const [{ data: siteRows }, { data: mangaRows }, { data: chapterRows }] = await Promise.all([
      supabase.from("manga_sites").select("id,name,subdomain").order("name"),
      supabase.from("manga").select("*").order("created_at", { ascending: false }).limit(300),
      supabase.from("chapters").select("*").order("created_at", { ascending: false }).limit(300),
    ])
    const nextSites = (siteRows ?? []) as Site[]
    const nextManga = (mangaRows ?? []) as Manga[]
    setSites(nextSites)
    setManga(nextManga)
    setChapters((chapterRows ?? []) as Chapter[])
    setSelectedSite(current => current || nextSites[0]?.id || "")
    setLoading(false)
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const siteManga = useMemo(() => manga.filter(row => row.site_id === selectedSite), [manga, selectedSite])
  const siteChapters = useMemo(() => {
    const ids = new Set(siteManga.map(row => row.id))
    return chapters.filter(row => ids.has(row.manga_id))
  }, [chapters, siteManga])

  useEffect(() => {
    if (!selectedManga && siteManga[0]) setSelectedManga(siteManga[0].id)
  }, [siteManga, selectedManga])

  const flash = (message: string) => {
    setNotice(message)
    window.setTimeout(() => setNotice(""), 3500)
  }

  // Standard Form Manga Creator
  const createManga = async (e: FormEvent) => {
    e.preventDefault()
    setError("")
    if (!selectedSite) {
      setError("Créez d’abord un site manga.")
      return
    }
    setBusy(true)
    const { error: saveError } = await supabase.from("manga").insert({
      site_id: selectedSite,
      title: title.trim(),
      slug: slugify(title),
      description: description.trim(),
      cover_url: cover.trim() || null,
      genres: genres.split(",").map(x => x.trim()).filter(Boolean),
      status: "draft"
    })
    setBusy(false)
    if (saveError) {
      setError(saveError.message.includes("duplicate") ? "Ce titre existe déjà sur ce site." : "Enregistrement impossible. Réessayez.")
      return
    }
    setTitle("")
    setDescription("")
    setCover("")
    setGenres("")
    setFormOpen(false)
    flash("Manga ajouté en brouillon.")
    await refresh()
  }

  // Live JSON Parser for the AI Wizard
  useEffect(() => {
    if (mangaCreationMode !== "wizard" || !rawJsonPromptInput.trim()) {
      setParsedWizardData(null)
      setParsedWizardError("")
      return
    }

    try {
      // Find JSON block boundary if they copy-pasted full conversational text surrounding it
      let jsonString = rawJsonPromptInput.trim()
      const jsonStart = jsonString.indexOf("{")
      const jsonEnd = jsonString.lastIndexOf("}")
      
      if (jsonStart !== -1 && jsonEnd !== -1) {
        jsonString = jsonString.substring(jsonStart, jsonEnd + 1)
      }

      const parsed = JSON.parse(jsonString)
      
      // Auto-validate structure elements
      let mangaObj = null
      if (Array.isArray(parsed.manga) && parsed.manga.length > 0) {
        mangaObj = parsed.manga[0]
      } else if (parsed.title) {
        mangaObj = parsed
      }

      if (!mangaObj || !mangaObj.title) {
        setParsedWizardError("Le JSON n'a pas pu être identifié comme une configuration de manga valide (clé 'title' manquante).")
        setParsedWizardData(null)
        return
      }

      setParsedWizardError("")
      setParsedWizardData({
        title: mangaObj.title,
        summary: mangaObj.summary || mangaObj.description || "",
        cover: mangaObj.cover || mangaObj.cover_url || "",
        genres: mangaObj.tags || mangaObj.genres || [],
        chapters: mangaObj.chapters || []
      })
    } catch (err: any) {
      setParsedWizardError(`Format JSON Invalide: ${err.message}. Assurez-vous d'avoir copié le bloc JSON complet.`)
      setParsedWizardData(null)
    }
  }, [rawJsonPromptInput, mangaCreationMode])

  // Magic Wizard Import Publisher Executer
  const executeMagicWizardImport = async () => {
    if (!parsedWizardData || !selectedSite) return
    setBusy(true)
    setError("")
    setWizardProgress("Création de la fiche manga via l'API sécurisée...")

    try {
      const response = await fetch("/api/manga-import/wizard", {
        method: "POST",
        headers: {
          ...getAuthHeader(),
        },
        credentials: "include",
        body: JSON.stringify({
          wizardData: parsedWizardData,
          targetSiteId: selectedSite,
        }),
      })

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}))
        throw new Error(errData.error || `Erreur serveur (${response.status}) lors de l'importation.`)
      }

      setWizardProgress("")
      setRawJsonPromptInput("")
      setParsedWizardData(null)
      setFormOpen(false)
      flash(`⚡ Succès! "${parsedWizardData.title}" a été importé avec succès via le pipeline de validation serveur.`);
      await refresh()
    } catch (err: any) {
      setError(err.message || "Erreur critique de l'assistant de publication.")
    } finally {
      setBusy(false)
    }
  }

  // Create Custom Chapter
  const createChapter = async (e: FormEvent) => {
    e.preventDefault()
    setError("")
    if (!selectedManga) {
      setError("Choisissez un manga avant de créer un chapitre.")
      return
    }
    const num = Number(chapterNo)
    if (!Number.isFinite(num) || num < 0) {
      setError("Le numéro de chapitre est invalide.")
      return
    }
    setBusy(true)
    const { data, error: createError } = await supabase.from("chapters").insert({
      manga_id: selectedManga,
      title: chapterTitle.trim() || `Chapitre ${num}`,
      slug: `chapitre-${slugify(chapterNo)}`,
      chapter_number: num,
      status: "draft"
    }).select("id").single()

    setBusy(false)
    if (createError || !data) {
      setError(createError?.message.includes("duplicate") ? "Ce numéro de chapitre existe déjà." : "Création impossible. Réessayez.")
      return
    }
    setChapterTitle("")
    setChapterNo(String(num + 1))
    setChapterFiles([])
    setImages([])
    setFormOpen(false)
    setSelectedChapter(data.id)
    flash("Chapitre créé en brouillon. Vous pouvez maintenant ajouter ses pages.")
    await refresh()
  }

  const togglePublish = async (row: Chapter) => {
    const next = row.status === "published" ? "draft" : "published"
    const { error: updateError } = await supabase.from("chapters").update({
      status: next,
      published_at: next === "published" ? new Date().toISOString() : null,
      updated_at: new Date().toISOString()
    }).eq("id", row.id)

    if (updateError) {
      setError("Changement de statut impossible.")
      return
    }
    flash(next === "published" ? "Chapitre publié sur le portail central." : "Chapitre repassé en brouillon.")
    await refresh()
  }

  const uploadPages = async (chapter: Chapter) => {
    if (chapterFiles.length === 0) return
    setError("")
    setUploading(true)
    const { data: existing } = await supabase.from("chapter_images").select("sort_order").eq("chapter_id", chapter.id).order("sort_order", { ascending: false }).limit(1)
    let order = (existing?.[0]?.sort_order ?? -1) + 1
    let failed = 0

    for (const file of chapterFiles) {
      if (file.size > 12 * 1024 * 1024 || !/^image\/(jpeg|png|webp|avif)$/.test(file.type)) {
        failed++
        continue
      }
      const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_")
      const path = `chapters/${chapter.id}/${crypto.randomUUID()}-${safe}`
      const { error: uploadError } = await supabase.storage.from("chantan-public").upload(path, file, { upsert: false, contentType: file.type })
      
      if (uploadError) {
        failed++
        continue
      }
      const { data: { publicUrl } } = supabase.storage.from("chantan-public").getPublicUrl(path)
      const { error: rowError } = await supabase.from("chapter_images").insert({
        chapter_id: chapter.id,
        image_url: publicUrl,
        sort_order: order++
      })
      if (rowError) {
        failed++
        await supabase.storage.from("chantan-public").remove([path])
      }
    }
    setUploading(false)
    setChapterFiles([])
    await loadImages(chapter.id)
    flash(failed ? `Pages chargées avec ${failed} fichier(s) à vérifier.` : "Pages ajoutées au chapitre.")
  }

  const loadImages = async (id: string) => {
    const { data } = await supabase.from("chapter_images").select("*").eq("chapter_id", id).order("sort_order")
    setImages(data ?? [])
  }

  return (
    <section className="space-y-6">
      {/* Upper header block */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[.18em] text-muted-foreground">Édition & publication</p>
          <h2 className="mt-2 text-3xl font-headline font-black">Bibliothèque de contenu</h2>
          <p className="mt-2 text-sm text-muted-foreground">Mangas, chapitres et pages restent séparés par site.</p>
        </div>
        <label className="text-xs font-semibold text-muted-foreground">
          SITE ACTIF
          <select
            value={selectedSite}
            onChange={e => {
              setSelectedSite(e.target.value)
              setSelectedManga("")
            }}
            className="mt-2 block h-10 min-w-48 rounded-lg border border-input bg-card px-3 text-sm text-foreground shadow-sm outline-none"
          >
            {sites.map(site => (
              <option key={site.id} value={site.id}>
                {site.name} · {site.subdomain}
              </option>
            ))}
          </select>
        </label>
      </div>

      {notice && (
        <p role="status" className="flex items-center gap-2 text-sm text-green-600 bg-green-500/10 p-3 rounded-lg font-medium">
          <Check size={16} /> {notice}
        </p>
      )}
      {error && (
        <p role="alert" className="text-sm text-red-500 bg-red-500/10 p-3 rounded-lg font-medium">
          {error}
        </p>
      )}

      {/* Tabs bar selector */}
      <div className="flex items-center justify-between border-b border-border">
        <div className="flex gap-5">
          {(["manga", "chapters"] as const).map(value => (
            <button
              key={value}
              onClick={() => {
                setTab(value)
                setFormOpen(false)
              }}
              className={`border-b-2 px-1 pb-3 text-sm font-semibold transition ${
                tab === value ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {value === "manga" ? `Mangas (${siteManga.length})` : `Chapitres (${siteChapters.length})`}
            </button>
          ))}
        </div>
        <button
          onClick={() => {
            setFormOpen(!formOpen)
            setError("")
            setMangaCreationMode("standard")
            setRawJsonPromptInput("")
            setParsedWizardData(null)
          }}
          className="mb-2 inline-flex items-center gap-2 rounded-lg bg-primary hover:opacity-95 px-3.5 py-2 text-xs font-bold text-primary-foreground shadow"
        >
          <Plus size={15} /> {tab === "manga" ? "Nouveau manga" : "Nouveau chapitre"}
        </button>
      </div>

      {/* Conditional Form / Wizard render container */}
      {formOpen && (
        <div className="border border-border bg-card p-5 rounded-2xl shadow-sm space-y-5">
          {tab === "manga" ? (
            /* WIZARD OR STANDARD SELECTION FOR NEW MANGA */
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <h3 className="font-headline font-bold text-sm text-foreground flex items-center gap-1.5">
                  <Sparkles size={16} className="text-primary" /> Ajouter un Nouveau Manga
                </h3>
                <div className="flex rounded-lg p-1 bg-muted text-xs font-bold border border-border">
                  <button
                    type="button"
                    onClick={() => {
                      setMangaCreationMode("standard")
                      setError("")
                    }}
                    className={`px-3 py-1.5 rounded-md transition ${mangaCreationMode === "standard" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}
                  >
                    Formulaire Simple
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMangaCreationMode("wizard")
                      setError("")
                    }}
                    className={`px-3 py-1.5 rounded-md transition flex items-center gap-1 ${mangaCreationMode === "wizard" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}
                  >
                    <Bot size={13} className="text-primary" /> Assistant AI JSON
                  </button>
                </div>
              </div>

              {mangaCreationMode === "standard" ? (
                /* Standard Manga creation fields */
                <form onSubmit={createManga} className="grid gap-4 sm:grid-cols-2">
                  <Field label="Titre du Manga" value={title} set={setTitle} required />
                  <Field label="Genres (Ex: Action, Adventure, Fantasy)" value={genres} set={setGenres} />
                  <Field label="Image de couverture (URL)" value={cover} set={setCover} />
                  <label className="text-xs font-semibold text-foreground sm:col-span-2">
                    Résumé / Synopsis
                    <textarea
                      value={description}
                      onChange={e => setDescription(e.target.value)}
                      rows={3}
                      className="mt-2 w-full rounded-lg border border-input bg-card p-3 text-sm focus:border-primary outline-none"
                      placeholder="Introduisez la trame narrative ici..."
                    />
                  </label>
                  {error && <p className="text-xs text-red-500 sm:col-span-2">{error}</p>}
                  <div className="flex justify-end gap-2 sm:col-span-2 border-t border-border pt-4">
                    <button type="button" onClick={() => setFormOpen(false)} className="rounded-lg border border-border px-4 py-2 text-xs font-bold">
                      Annuler
                    </button>
                    <button disabled={busy} className="rounded-lg bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow">
                      {busy ? "Enregistrement…" : "Créer en brouillon"}
                    </button>
                  </div>
                </form>
              ) : (
                /* Interactive Magic AI JSON Wizard */
                <div className="space-y-4">
                  <p className="text-xs text-secondary leading-relaxed">
                    Collez le bloc configuration **JSON** complet retourné par ChatGPT, Claude, ou Gemini pour ce manga. Notre assistant l'analysera, créera la fiche, générera automatiquement les chapitres, et publiera directement toutes les images de scans associées !
                  </p>

                  <div className="grid gap-4 md:grid-cols-2 items-start">
                    {/* Raw Text Input on left */}
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                        Contenu JSON de l'AI
                        {wizardProgress && <span className="text-[10px] text-primary animate-pulse font-bold">{wizardProgress}</span>}
                      </label>
                      <textarea
                        rows={11}
                        value={rawJsonPromptInput}
                        onChange={e => setRawJsonPromptInput(e.target.value)}
                        placeholder='Collez ici la réponse JSON de votre modèle AI...'
                        className="w-full font-mono text-[11px] p-3 border border-input rounded-xl bg-muted/20 text-foreground outline-none focus:border-primary"
                      />
                    </div>

                    {/* Interactive Live Analyzer on right */}
                    <div className="border border-border rounded-xl p-4 bg-muted/10 space-y-4 min-h-[220px]">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                        <Sparkles size={13} className="text-primary" /> Visualisation & Validation
                      </h4>

                      {wizardParsingError && (
                        <div className="text-xs text-red-500 bg-red-500/10 p-3 rounded-lg flex items-start gap-1.5 font-medium leading-relaxed">
                          <AlertCircle size={14} className="shrink-0 mt-0.5" />
                          <span>{wizardParsingError}</span>
                        </div>
                      )}

                      {!parsedWizardData && !wizardParsingError && (
                        <div className="text-center py-10 text-xs text-muted-foreground">
                          Collez le JSON à gauche pour lancer l'analyse de validation automatique...
                        </div>
                      )}

                      {parsedWizardData && (
                        <div className="space-y-3.5 text-xs text-secondary">
                          <div className="flex gap-3">
                            {parsedWizardData.cover && (
                              <img src={parsedWizardData.cover} alt="" className="w-14 h-20 object-cover rounded border border-border bg-card shrink-0" />
                            )}
                            <div className="space-y-1">
                              <h5 className="font-bold text-foreground text-sm leading-none">{parsedWizardData.title}</h5>
                              <p className="text-[10px] line-clamp-3 leading-normal mt-1">{parsedWizardData.summary}</p>
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-1">
                            {parsedWizardData.genres.map((g: string) => (
                              <span key={g} className="px-2 py-0.5 rounded bg-primary/10 text-primary font-bold text-[9px] uppercase tracking-wider">
                                {g}
                              </span>
                            ))}
                          </div>

                          <div className="border-t border-border/80 pt-3 space-y-2">
                            <div className="flex justify-between items-center text-[10px]">
                              <span>Chapitres Détectés:</span>
                              <b className="text-foreground font-mono">{parsedWizardData.chapters?.length || 0}</b>
                            </div>
                            <div className="flex justify-between items-center text-[10px]">
                              <span>Images / Pages Total:</span>
                              <b className="text-foreground font-mono">
                                {parsedWizardData.chapters?.reduce((sum: number, c: any) => sum + (c.images?.length || 0), 0) || 0} pages
                              </b>
                            </div>
                          </div>

                          {/* Trigger Import */}
                          <div className="pt-2 border-t border-border/80">
                            <button
                              type="button"
                              disabled={busy}
                              onClick={executeMagicWizardImport}
                              className="w-full inline-flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-bold text-white shadow shadow-emerald-500/10 text-xs disabled:opacity-60 transition"
                            >
                              {busy ? (
                                <>
                                  <RefreshCw size={13} className="animate-spin" /> {wizardProgress || "Importation..."}
                                </>
                              ) : (
                                <>
                                  ⚡ Confirmer & Publier Tout le Manga ({parsedWizardData.chapters?.length} chapitres)
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 border-t border-border pt-4">
                    <button type="button" onClick={() => setFormOpen(false)} className="rounded-lg border border-border px-4 py-2 text-xs font-bold">
                      Annuler
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Custom Chapter creation form */
            <form onSubmit={createChapter} className="grid gap-3 sm:grid-cols-2">
              <label className="text-xs font-semibold text-foreground">
                Manga Associé <span className="text-destructive font-bold">*</span>
                <select
                  required
                  value={selectedManga}
                  onChange={e => setSelectedManga(e.target.value)}
                  className="mt-2 h-10 w-full rounded-lg border border-input bg-card px-3 text-sm text-foreground outline-none"
                >
                  {siteManga.map(row => (
                    <option key={row.id} value={row.id}>
                      {row.title}
                    </option>
                  ))}
                </select>
              </label>
              <Field label="Numéro de Chapitre" value={chapterNo} set={setChapterNo} required />
              <Field label="Titre du chapitre (facultatif)" value={chapterTitle} set={setChapterTitle} />
              {error && <p className="text-sm text-red-500 sm:col-span-2">{error}</p>}
              <div className="flex justify-end gap-2 sm:col-span-2 border-t border-border pt-4">
                <button type="button" onClick={() => setFormOpen(false)} className="rounded-lg border border-border px-4 py-2 text-xs font-bold">
                  Annuler
                </button>
                <button disabled={busy} className="rounded-lg bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow">
                  {busy ? "Enregistrement…" : "Créer en brouillon"}
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Content directory lists rendering layout */}
      {loading ? (
        <p className="py-8 text-center text-sm text-muted-foreground">Chargement du contenu…</p>
      ) : tab === "manga" ? (
        <div className="mt-3 divide-y divide-border border border-border bg-card rounded-xl px-4 shadow-sm">
          {siteManga.map(row => (
            <article key={row.id} className="flex items-center gap-4 py-4">
              <div className="grid h-12 w-10 place-items-center overflow-hidden rounded bg-muted">
                {row.cover_url ? (
                  <img src={row.cover_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <BookOpen size={17} className="text-muted-foreground" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="truncate text-sm font-bold text-foreground">{row.title}</h3>
                <p className="mt-1 truncate text-xs text-muted-foreground font-semibold">
                  {row.genres?.join(" · ") || "Aucun genre"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${row.status === "published" ? "bg-emerald-500/10 text-emerald-500" : "bg-amber-500/10 text-amber-500"}`}>
                  {row.status === "published" ? "Publié" : "Brouillon"}
                </span>
                <MangaActionDropdown
                  manga={row}
                  onToggleStatus={async () => {
                    const next = row.status === "published" ? "draft" : "published"
                    await supabase.from("manga").update({ status: next, updated_at: new Date().toISOString() }).eq("id", row.id)
                    flash(next === "published" ? "Manga publié." : "Manga repassé en brouillon.")
                    void refresh()
                  }}
                  onViewChapters={() => {
                    setSelectedManga(row.id)
                    setTab("chapters")
                  }}
                  onDelete={async () => {
                    if (confirm(`Voulez-vous vraiment supprimer "${row.title}" et tous ses chapitres ?`)) {
                      await supabase.from("manga").delete().eq("id", row.id)
                      flash("Manga supprimé.")
                      void refresh()
                    }
                  }}
                />
              </div>
            </article>
          ))}
          {siteManga.length === 0 && <Empty label="Aucun manga sur ce site" />}
        </div>
      ) : (
        <div className="mt-3 divide-y divide-border border border-border bg-card rounded-xl px-4 shadow-sm">
          {siteChapters.map(row => (
            <article key={row.id} className="flex flex-wrap items-center gap-3 py-4">
              <div className="grid h-10 w-10 place-items-center rounded bg-muted">
                <FileText size={17} className="text-muted-foreground" />
              </div>
              <div className="min-w-[160px] flex-1">
                <h3 className="text-sm font-bold text-foreground">
                  {manga.find(m => m.id === row.manga_id)?.title} · Chapitre {row.chapter_number}
                </h3>
                <p className="mt-1 text-xs text-muted-foreground font-medium">
                  {row.title} · {row.status === "published" ? "Publié" : "Brouillon"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <ChapterActionDropdown
                  chapter={row}
                  pagesCount={images.length && selectedChapter === row.id ? images.length : undefined}
                  onViewPages={() => {
                    setSelectedChapter(row.id)
                    void loadImages(row.id)
                  }}
                  onToggleStatus={() => void togglePublish(row)}
                  onDelete={async () => {
                    if (confirm(`Supprimer le chapitre ${row.chapter_number} ?`)) {
                      await supabase.from("chapters").delete().eq("id", row.id)
                      flash("Chapitre supprimé.")
                      void refresh()
                    }
                  }}
                />
                <label className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-bold hover:bg-muted transition shadow-sm">
                  <UploadCloud size={13} />
                  <span>{uploading && selectedChapter === row.id ? "Envoi…" : "Pages"}</span>
                  <input
                    type="file"
                    multiple
                    accept="image/jpeg,image/png,image/webp,image/avif"
                    className="hidden"
                    onChange={e => {
                      setSelectedChapter(row.id)
                      setChapterFiles(Array.from(e.target.files ?? []))
                    }}
                  />
                </label>
                {selectedChapter === row.id && chapterFiles.length > 0 && (
                  <button onClick={() => void uploadPages(row)} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow">
                    Importer {chapterFiles.length}
                  </button>
                )}
              </div>
            </article>
          ))}
          {siteChapters.length === 0 && <Empty label="Aucun chapitre sur ce site" />}
        </div>
      )}

      {/* Chapter loaded images grid */}
      {tab === "chapters" && selectedChapter && (
        <div className="mt-5 border-t border-border pt-4 space-y-3">
          <p className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">
            <FileImage size={15} /> PAGES CHARGÉES {images.length ? `· ${images.length}` : ""}
          </p>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-6 md:grid-cols-8">
            {images.map((image, index) => (
              <div key={image.id} className="relative aspect-[3/4] overflow-hidden rounded-xl border border-border bg-muted/30">
                <img src={image.image_url} alt={`Page ${index + 1}`} loading="lazy" className="h-full w-full object-cover" />
                <span className="absolute bottom-1 right-1 rounded-md bg-background/90 px-1.5 py-0.5 text-[9px] font-bold font-mono">
                  {image.sort_order + 1}
                </span>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-muted-foreground">
            JPG, PNG, WEBP et AVIF · 12 Mo maximum par image. Chargement direct dans le stockage public.
          </p>
        </div>
      )}
    </section>
  )
}

function Field({ label, value, set, required }: { label: string; value: string; set: (v: string) => void; required?: boolean }) {
  return (
    <label className="text-xs font-semibold text-foreground">
      {label} {required && <span className="text-red-500 font-bold">*</span>}
      <input
        required={required}
        value={value}
        onChange={e => set(e.target.value)}
        className="mt-2 h-10 w-full rounded-lg border border-input bg-card px-3 text-sm text-foreground focus:border-primary outline-none focus:ring-2 focus:ring-primary/10 transition"
      />
    </label>
  )
}

function Empty({ label }: { label: string }) {
  return (
    <div className="py-12 text-center text-sm text-muted-foreground border border-dashed border-border rounded-xl mt-4">
      {label}. Créez un élément pour commencer.
    </div>
  )
}

function MangaActionDropdown({
  manga,
  onToggleStatus,
  onViewChapters,
  onDelete,
}: {
  manga: Manga
  onToggleStatus: () => void
  onViewChapters: () => void
  onDelete: () => void
}) {
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside)
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [open])

  return (
    <div className="relative inline-block text-left" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-card hover:bg-muted text-xs font-bold text-foreground transition shadow-sm"
      >
        <span>Actions</span>
        <ChevronDown size={13} className={`transition-transform duration-150 ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 z-50 w-48 rounded-xl border border-border bg-card p-1.5 shadow-2xl animate-in fade-in zoom-in-95 duration-100 text-left">
          <button
            type="button"
            onClick={() => {
              setOpen(false)
              onViewChapters()
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-foreground hover:bg-muted transition"
          >
            <Layers size={14} className="text-primary" />
            <span>Voir les chapitres</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setOpen(false)
              onToggleStatus()
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-foreground hover:bg-muted transition"
          >
            <RefreshCw size={14} className="text-teal-500" />
            <span>{manga.status === "published" ? "Dépublier" : "Publier"}</span>
          </button>

          <div className="my-1 border-t border-border/60" />

          <button
            type="button"
            onClick={() => {
              setOpen(false)
              onDelete()
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-destructive hover:bg-destructive/10 transition"
          >
            <Trash2 size={14} />
            <span>Supprimer le manga</span>
          </button>
        </div>
      )}
    </div>
  )
}

function ChapterActionDropdown({
  chapter,
  pagesCount,
  onViewPages,
  onToggleStatus,
  onDelete,
}: {
  chapter: Chapter
  pagesCount?: number
  onViewPages: () => void
  onToggleStatus: () => void
  onDelete: () => void
}) {
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside)
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [open])

  return (
    <div className="relative inline-block text-left" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-card hover:bg-muted text-xs font-bold text-foreground transition shadow-sm"
      >
        <span>Actions</span>
        <ChevronDown size={13} className={`transition-transform duration-150 ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 z-50 w-48 rounded-xl border border-border bg-card p-1.5 shadow-2xl animate-in fade-in zoom-in-95 duration-100 text-left">
          <button
            type="button"
            onClick={() => {
              setOpen(false)
              onViewPages()
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-foreground hover:bg-muted transition"
          >
            <Eye size={14} className="text-primary" />
            <span>Afficher les pages {pagesCount ? `(${pagesCount})` : ""}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setOpen(false)
              onToggleStatus()
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-foreground hover:bg-muted transition"
          >
            <RefreshCw size={14} className="text-teal-500" />
            <span>{chapter.status === "published" ? "Dépublier" : "Publier"}</span>
          </button>

          <div className="my-1 border-t border-border/60" />

          <button
            type="button"
            onClick={() => {
              setOpen(false)
              onDelete()
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-destructive hover:bg-destructive/10 transition"
          >
            <Trash2 size={14} />
            <span>Supprimer le chapitre</span>
          </button>
        </div>
      )}
    </div>
  )
}
