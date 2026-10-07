import { useEffect, useState, type FormEvent } from "react"
import { Activity, Check, Globe2, Save, ShieldCheck } from "lucide-react"
import { supabase } from "@/lib/mangahub-db"
import { useTranslation } from 'react-i18next'

type Site={id:string;name:string;subdomain:string}
type Field={key:string;label:string;kind?:"text"|"textarea"|"toggle"|"select";options?:string[];hint?:string}
const fields:Record<string,Field[]>={
  seo:[{key:"title",label:"Titre SEO"},{key:"description",label:"Description",kind:"textarea"},{key:"canonical_url",label:"URL canonique"},{key:"og_image",label:"Image Open Graph"},{key:"robots",label:"Directives robots"}],
  analytics:[{key:"enabled",label:"Activer les statistiques",kind:"toggle"},{key:"provider",label:"Outil",kind:"select",options:["Aucun","Google Analytics","Google Tag Manager","Matomo","Personnalisé"]},{key:"tracking_id",label:"Identifiant de mesure"},{key:"anonymous",label:"Suivi anonyme",kind:"toggle"},{key:"respect_dnt",label:"Respecter Do Not Track",kind:"toggle"},{key:"ip_anonymization",label:"Anonymiser l’adresse IP",kind:"toggle"}],
  ads:[{key:"mode",label:"Mode publicitaire",kind:"select",options:["Désactivé","Configuration globale","Publicités personnalisées"]},{key:"enabled",label:"Activer les publicités",kind:"toggle"},{key:"positions",label:"Emplacements actifs",kind:"textarea",hint:"Un emplacement par ligne : HEADER, SIDEBAR, READER_BOTTOM…"},{key:"code_note",label:"Note de configuration",kind:"textarea",hint:"Le code enregistré ici n’est pas exécuté automatiquement."}],
  merch:[{key:"mode",label:"Mode boutique",kind:"select",options:["Désactivée","Boutique globale","Boutique personnalisée"]},{key:"enabled",label:"Afficher la boutique",kind:"toggle"},{key:"shop_title",label:"Titre de la boutique"},{key:"currency",label:"Devise"},{key:"product_url",label:"Lien de boutique / affiliation"}],
  privacy:[{key:"cookie_banner",label:"Afficher le bandeau cookies",kind:"toggle"},{key:"cookie_consent",label:"Demander le consentement",kind:"toggle"},{key:"respect_dnt",label:"Respecter Do Not Track",kind:"toggle"},{key:"anonymous_analytics",label:"Statistiques anonymes uniquement",kind:"toggle"},{key:"tracking_disabled",label:"Désactiver le suivi",kind:"toggle"}],
  theme:[{key:"primary_color",label:"Couleur principale"},{key:"secondary_color",label:"Couleur secondaire"},{key:"background_color",label:"Arrière-plan"},{key:"font_family",label:"Famille typographique"},{key:"header_style",label:"Style de navigation"},{key:"reader_mode",label:"Présentation du lecteur"}],
  social:[{key:"facebook",label:"Facebook"},{key:"instagram",label:"Instagram"},{key:"tiktok",label:"TikTok"},{key:"x",label:"X"},{key:"youtube",label:"YouTube"},{key:"discord",label:"Discord"},{key:"telegram",label:"Telegram"}],
  scripts:[{key:"head",label:"Scripts d’en-tête",kind:"textarea",hint:"Conservés comme configuration; aucun script n’est injecté automatiquement."},{key:"body_start",label:"Scripts début de page",kind:"textarea"},{key:"body_end",label:"Scripts fin de page",kind:"textarea"},{key:"custom_css",label:"CSS personnalisé",kind:"textarea"}],
}

export default function SettingsManager({section,initialSiteId="global",onSiteIdChange}:{section:string;initialSiteId?:string;onSiteIdChange?:(id:string)=>void}){
  const { t } = useTranslation()
  const [sites,setSites]=useState<Site[]>([]),[siteId,setSiteId]=useState(initialSiteId),[subsection,setSubsection]=useState("theme"),[values,setValues]=useState<Record<string,any>>({}),[recordId,setRecordId]=useState<string|null>(null),[loading,setLoading]=useState(true),[saving,setSaving]=useState(false),[message,setMessage]=useState(""),[error,setError]=useState("")
  const activeSub=section==="system"?subsection:section
  const settingKey=activeSub
  useEffect(()=>{void supabase.from("manga_sites").select("id,name,subdomain").order("name").then(({data}:{data:any})=>{const rows=(data??[]) as Site[];setSites(rows);setSiteId(initialSiteId)})},[initialSiteId])
  useEffect(()=>{
    let live=true;setLoading(true);setError("")
    const loadData = async () => {
      try {
        let request = supabase.from("site_settings").select("id,value").eq("setting_key", settingKey)
        request = siteId === "global" ? request.is("site_id", null) : request.eq("site_id", siteId)
        
        const { data, error: readError } = await request.maybeSingle()
        if (!live) return

        if (readError) {
          setError("Impossible de charger ces réglages.")
          setLoading(false)
          return
        }

        if (data) {
          setRecordId(data.id)
          setValues(data.value ?? {})
        } else if (siteId !== "global") {
          // Fallback: extract config from projects table
          const { data: proj } = await supabase.from("projects").select("site_data").eq("id", siteId).maybeSingle()
          if (!live) return

          if (proj?.site_data) {
            const parsed = typeof proj.site_data === "string" ? JSON.parse(proj.site_data) : proj.site_data
            const extractedValues: Record<string, any> = {}

            if (settingKey === "seo") {
              extractedValues.title = parsed.site_name || ""
              extractedValues.description = parsed.config?.description || ""
              extractedValues.canonical_url = parsed.baseUrl || ""
              extractedValues.og_image = parsed.config?.seo?.og_image || ""
              extractedValues.robots = parsed.config?.seo?.robots || "index, follow"
            } else if (settingKey === "analytics") {
              const gaId = parsed.config?.seo?.ga_id || parsed.config?.seo?.gaId || parsed.config?.analytics?.google_analytics || ""
              const clarityId = parsed.config?.seo?.clarity_id || parsed.config?.seo?.clarityId || parsed.config?.analytics?.clarity || ""
              extractedValues.enabled = Boolean(gaId || clarityId)
              extractedValues.provider = gaId ? "Google Analytics" : "Aucun"
              extractedValues.tracking_id = gaId || clarityId || ""
              extractedValues.anonymous = true
              extractedValues.respect_dnt = true
              extractedValues.ip_anonymization = true
            } else if (settingKey === "ads") {
              const adBanners = parsed.config?.ad_banners_list || []
              extractedValues.enabled = adBanners.length > 0
              extractedValues.mode = adBanners.length > 0 ? "Publicités personnalisées" : "Désactivé"
              extractedValues.positions = "HEADER\nSIDEBAR"
              extractedValues.units = adBanners.map((ad: any) => ({
                id: crypto.randomUUID(),
                name: ad.label || "Bannière",
                position: "TOP",
                enabled: ad.enabled !== false,
                image_url: ad.image_url || "",
                click_url: ad.link_url || "",
                alt_text: ad.label || "Ad"
              }))
            } else if (settingKey === "merch") {
              const shop = parsed.config?.shop || {}
              extractedValues.enabled = Boolean(shop.enabled)
              extractedValues.mode = shop.enabled ? "Boutique personnalisée" : "Désactivée"
              extractedValues.shop_title = shop.title || "Boutique"
              extractedValues.currency = "EUR"
              extractedValues.product_url = shop.button_link || ""
            }

            setRecordId(null)
            setValues(extractedValues)
          } else {
            setRecordId(null)
            setValues({})
          }
        } else {
          setRecordId(null)
          setValues({})
        }
      } catch (err) {
        console.error("Failed to load settings fallback:", err)
      } finally {
        if (live) setLoading(false)
      }
    }

    void loadData()
    return () => {
      live = false
    }
  }, [siteId, settingKey])
  const save=async(e:FormEvent)=>{e.preventDefault();setSaving(true);setMessage("");setError("")
    const payload={setting_key:settingKey,value:values,updated_at:new Date().toISOString(),...(siteId==="global"?{site_id:null}:{site_id:siteId})}
    const result=recordId?await supabase.from("site_settings").update(payload).eq("id",recordId):await supabase.from("site_settings").insert(payload).select("id").single()
    setSaving(false);if(result.error){setError("Enregistrement impossible. Vérifiez les droits et réessayez.");return}if(!recordId&&result.data)setRecordId((result.data as {id:string}).id);setMessage("Réglages enregistrés.");window.setTimeout(()=>setMessage(""),3000)
  }
  const currentFields=fields[activeSub]??fields.theme
  const labels:Record<string,string>={seo:"Référencement",analytics:"Statistiques",ads:"Publicités",merch:"Boutique",privacy:"Confidentialité",theme:"Thème",social:"Réseaux sociaux",scripts:"Scripts & styles"}
  return <section>
    <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs uppercase tracking-[.18em] text-muted-foreground">{t("Configuration isolée par site")}</p><h2 className="mt-2 text-3xl">{t(labels[activeSub])??t("Réglages")}</h2><p className="mt-2 text-sm text-muted-foreground">{t("Les réglages enregistrés ici ne s’appliquent qu’au site choisi.")}</p></div><label className="text-xs font-semibold text-muted-foreground">{t("SITE À CONFIGURER")}<select value={siteId} onChange={e=>{const next=e.target.value;setSiteId(next);onSiteIdChange?.(next)}} className="mt-2 block h-10 min-w-52 rounded-lg border border-input bg-background px-3 text-sm text-foreground"><option value="global">{t("Configuration globale")}</option>{sites.map(site=><option key={site.id} value={site.id}>{site.name} · {site.subdomain}</option>)}</select></label></div>
    {section==="system"&&<div className="mt-7 flex flex-wrap gap-2">{[["theme","Thème"],["privacy","Confidentialité"],["social","Réseaux sociaux"],["scripts","Scripts & styles"]].map(([key,label])=><button key={key} onClick={()=>setSubsection(key)} className={`rounded-md border px-3 py-2 text-xs transition ${subsection===key?"border-primary bg-accent text-accent-foreground":"border-border hover:bg-muted"}`}>{label}</button>)}</div>}
    <form onSubmit={save} className="mt-7 max-w-3xl border-y border-border">{loading?<p className="py-8 text-sm text-muted-foreground">{t("Chargement des réglages…")}</p>:currentFields.map(field=><div key={field.key} className="grid gap-3 border-b border-border py-5 sm:grid-cols-[.7fr_1fr] sm:items-center"><div><label htmlFor={`setting-${field.key}`} className="text-sm font-semibold">{t(field.label)}</label>{field.hint&&<p className="mt-1 text-xs leading-5 text-muted-foreground">{t(field.hint)}</p>}</div>{field.kind==="toggle"?<button id={`setting-${field.key}`} type="button" role="switch" aria-checked={!!values[field.key]} onClick={()=>setValues({...values,[field.key]:!values[field.key]})} className={`flex h-7 w-12 items-center rounded-full p-1 transition ${values[field.key]?"bg-primary":"bg-muted"}`}><span className={`h-5 w-5 rounded-full bg-background shadow-sm transition-transform ${values[field.key]?"translate-x-5":"translate-x-0"}`}/></button>:field.kind==="textarea"?<textarea id={`setting-${field.key}`} value={values[field.key]??""} onChange={e=>setValues({...values,[field.key]:e.target.value})} rows={4} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary"/>:field.kind==="select"?<select id={`setting-${field.key}`} value={values[field.key]??field.options?.[0]} onChange={e=>setValues({...values,[field.key]:e.target.value})} className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm">{field.options?.map(option=><option key={option}>{t(option)}</option>)}</select>:<input id={`setting-${field.key}`} value={values[field.key]??""} onChange={e=>setValues({...values,[field.key]:e.target.value})} className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:border-primary"/>}</div>)}
      {!loading&&activeSub==="ads"&&<AdUnitsEditor values={values} setValues={setValues}/>}{!loading&&<div className="flex flex-wrap items-center justify-between gap-3 py-5"><div className="text-xs text-muted-foreground">{siteId==="global"?<span className="inline-flex items-center gap-1"><Globe2 size={14}/> {t("Valeur de repli globale")}</span>:<span className="inline-flex items-center gap-1"><ShieldCheck size={14}/> {t("Prioritaire pour ce site")}</span>}</div><button disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60"><Save size={15}/>{saving?t("Enregistrement…"):t("Enregistrer")}</button></div>}
    </form>{message&&<p role="status" className="mt-4 flex items-center gap-2 text-sm"><Check size={15} className="text-success"/>{t(message)}</p>}{error&&<p role="alert" className="mt-4 text-sm text-destructive">{t(error)}</p>}
    {section==="analytics"&&<AnalyticsSummary siteId={siteId} siteName={sites.find(site=>site.id===siteId)?.name??t("Tous les sites")}/>}
  </section>
}

function AdUnitsEditor({values,setValues}:{values:Record<string,any>;setValues:(value:Record<string,any>)=>void}){
  const { t } = useTranslation()
  const units=Array.isArray(values.units)?values.units:[]
  const update=(index:number,field:string,value:string|boolean)=>setValues({...values,units:units.map((unit:any,i:number)=>i===index?{...unit,[field]:value}:unit)})
  const add=()=>setValues({...values,enabled:true,mode:values.mode??"Publicités personnalisées",units:[...units,{id:crypto.randomUUID(),name:"Nouvelle bannière",position:"PORTAL_HOME",enabled:true,image_url:"",click_url:"",alt_text:""}]})
  const remove=(index:number)=>setValues({...values,units:units.filter((_:any,i:number)=>i!==index)})
  return <div className="border-b border-border py-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="text-sm font-semibold">{t("Bannières visibles sur le portail")}</h3><p className="mt-1 text-xs text-muted-foreground">{t("Seules les images HTTPS/HTTP sont affichées. Les scripts publicitaires ne sont jamais exécutés.")}</p></div><button type="button" onClick={add} className="rounded-md border border-border px-3 py-2 text-xs font-semibold transition hover:bg-muted">{t("Ajouter une bannière")}</button></div><div className="mt-4 space-y-4">{units.map((unit:any,index:number)=><article key={unit.id??index} className="grid gap-3 rounded-md border border-border p-4 sm:grid-cols-2"><label className="text-xs font-medium">{t("Nom")}<input value={unit.name??""} onChange={e=>update(index,"name",e.target.value)} className="mt-1 h-9 w-full rounded-md border border-input bg-background px-3 text-sm"/></label><label className="text-xs font-medium">{t("Emplacement")}<select value={unit.position??"PORTAL_HOME"} onChange={e=>update(index,"position",e.target.value)} className="mt-1 h-9 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="PORTAL_HOME">{t("Accueil du portail")}</option><option value="HEADER">{t("En-tête")}</option><option value="TOP">{t("Haut de page")}</option><option value="SIDEBAR">{t("Barre latérale")}</option><option value="FOOTER">{t("Pied de page")}</option></select></label><label className="text-xs font-medium sm:col-span-2">{t("URL de l’image")}<input type="url" value={unit.image_url??""} onChange={e=>update(index,"image_url",e.target.value)} placeholder="https://…" className="mt-1 h-9 w-full rounded-md border border-input bg-background px-3 text-sm"/></label><label className="text-xs font-medium">{t("Lien au clic")}<input type="url" value={unit.click_url??""} onChange={e=>update(index,"click_url",e.target.value)} placeholder="https://…" className="mt-1 h-9 w-full rounded-md border border-input bg-background px-3 text-sm"/></label><label className="text-xs font-medium">{t("Texte alternatif")}<input value={unit.alt_text??""} onChange={e=>update(index,"alt_text",e.target.value)} className="mt-1 h-9 w-full rounded-md border border-input bg-background px-3 text-sm"/></label><div className="flex items-center justify-between sm:col-span-2"><label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={!!unit.enabled} onChange={e=>update(index,"enabled",e.target.checked)} className="h-4 w-4 accent-primary"/>{t("Active")}</label><button type="button" onClick={()=>remove(index)} className="text-xs text-destructive hover:underline">{t("Retirer")}</button></div></article>)}{units.length===0&&<p className="text-xs text-muted-foreground">{t("Aucune bannière configurée. Ajoutez une image puis enregistrez pour l’afficher sur le portail.")}</p>}</div></div>
}

function AnalyticsSummary({siteId,siteName}:{siteId:string;siteName:string}){
  const { t } = useTranslation()
  const [stats,setStats]=useState({pageViews:0,chapterViews:0}),[loading,setLoading]=useState(true)
  useEffect(()=>{let live=true;setLoading(true);const since=new Date(Date.now()-30*24*60*60*1000).toISOString();const load=async()=>{let pages=supabase.from("analytics_events").select("id",{count:"exact",head:true}).eq("event_type","page_view").gte("created_at",since);let chapters=supabase.from("analytics_events").select("id",{count:"exact",head:true}).eq("event_type","chapter_view").gte("created_at",since);if(siteId!=="global"){pages=pages.eq("site_id",siteId);chapters=chapters.eq("site_id",siteId)}const [pageResult,chapterResult]=await Promise.all([pages,chapters]);if(live){setStats({pageViews:pageResult.count??0,chapterViews:chapterResult.count??0});setLoading(false)}};void load();return()=>{live=false}},[siteId])
  return <section className="mt-10 max-w-3xl"><div className="border-b border-border pb-4"><p className="text-xs uppercase tracking-[.16em] text-muted-foreground">{t("Activité des 30 derniers jours ·")} {siteName}</p><h3 className="mt-2 text-xl">{t("Audience enregistrée")}</h3></div><div className="grid gap-5 sm:grid-cols-2">{[{label:"Pages consultées",value:stats.pageViews},{label:"Chapitres consultés",value:stats.chapterViews}].map(item=><article key={item.label} className="border-b border-border py-5"><p className="text-sm text-muted-foreground">{t(item.label)}</p><strong className="mt-2 block font-display text-4xl font-medium">{loading?"—":item.value.toLocaleString("fr-FR")}</strong></article>)}</div><p className="mt-3 text-xs text-muted-foreground">{t("Ces chiffres reflètent les événements déjà enregistrés dans READHUB.")}</p></section>
}

export function MonitoringPanel({initialSiteId="global",onSiteIdChange}:{initialSiteId?:string;onSiteIdChange?:(id:string)=>void}){
  const { t } = useTranslation()
  const [sites,setSites]=useState<Site[]>([]),[siteId,setSiteId]=useState(initialSiteId),[jobs,setJobs]=useState<any[]>([]),[logs,setLogs]=useState<any[]>([]),[failed,setFailed]=useState(0),[loading,setLoading]=useState(true)
  useEffect(()=>{void supabase.from("manga_sites").select("id,name,subdomain").order("name").then(({data}:{data:any})=>{const rows=(data??[]) as Site[];setSites(rows);setSiteId(initialSiteId)})},[initialSiteId])
  useEffect(()=>{let live=true;setLoading(true);let jobRequest=supabase.from("import_jobs").select("id,kind,status,progress,files_processed,files_failed,created_at").order("created_at",{ascending:false}).limit(12);if(siteId!=="global")jobRequest=jobRequest.eq("site_id",siteId);void Promise.all([jobRequest,supabase.from("activity_logs").select("id,action,entity_type,created_at").order("created_at",{ascending:false}).limit(10)]).then(([a,b])=>{if(!live)return;setJobs(a.data??[]);setLogs(b.data??[]);setFailed((a.data??[]).filter((x:any)=>x.status==="failed").length);setLoading(false)});return()=>{live=false}},[siteId])
  return <section><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs uppercase tracking-[.16em] text-muted-foreground">{t("Santé & opérations")}</p><h2 className="mt-2 text-3xl">{t("Surveillance")}</h2><p className="mt-2 text-sm text-muted-foreground">{t("Suivez les imports et l’activité liés au site sélectionné.")}</p></div><label className="text-xs font-semibold text-muted-foreground">{t("SITE À SURVEILLER")}<select value={siteId} onChange={e=>{const next=e.target.value;setSiteId(next);onSiteIdChange?.(next)}} className="mt-2 block h-10 min-w-52 rounded-lg border border-input bg-background px-3 text-sm text-foreground"><option value="global">{t("Tous les sites")}</option>{sites.map(site=><option key={site.id} value={site.id}>{site.name} · {site.subdomain}</option>)}</select></label></div><div className="mt-10"><div className="flex items-end justify-between border-b border-border pb-4"><div><p className="text-xs uppercase tracking-[.16em] text-muted-foreground">{t("Flux d’opérations")}</p><h3 className="mt-2 text-xl">{t("Imports récents")}</h3></div><span className="flex items-center gap-2 text-xs text-muted-foreground"><Activity size={14}/>{failed} {t("échec(s) récent(s)")}</span></div><div className="divide-y divide-border">{jobs.map(job=><div key={job.id} className="flex flex-wrap items-center gap-3 py-3 text-sm"><span className="min-w-24 font-medium">{job.kind}</span><span className="text-muted-foreground">{job.status} · {job.progress}% · {job.files_processed} {t("fichiers")}</span><span className="ml-auto text-xs text-muted-foreground">{new Date(job.created_at).toLocaleString("fr-FR")}</span></div>)}{!loading&&jobs.length===0&&<p className="py-6 text-sm text-muted-foreground">{t("Aucun import enregistré pour ce site.")}</p>}{loading&&<p className="py-6 text-sm text-muted-foreground">{t("Chargement des opérations…")}</p>}</div><h4 className="mt-8 text-sm font-semibold">{t("Journal d’activité de la plateforme")}</h4><div className="divide-y divide-border">{logs.map(log=><div key={log.id} className="flex gap-3 py-3 text-sm"><span className="font-medium">{log.action}</span><span className="text-muted-foreground">{log.entity_type}</span><span className="ml-auto text-xs text-muted-foreground">{new Date(log.created_at).toLocaleString("fr-FR")}</span></div>)}{logs.length===0&&<p className="py-5 text-sm text-muted-foreground">{t("Les actions d’administration apparaîtront ici.")}</p>}</div></div></section>
}
