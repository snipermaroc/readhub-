import { useEffect, useState } from "react"
import { ExternalLink } from "lucide-react"
import { supabase } from "@/lib/mangahub-db"
import { useTranslation } from 'react-i18next'

type AdUnit = { id?: string; name?: string; position?: string; enabled?: boolean; image_url?: string; click_url?: string; alt_text?: string }
function safeWebUrl(value?: string) {
  if (!value) return null
  try { const url = new URL(value); return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null } catch { return null }
}

export default function PublicAd({ position = "PORTAL_HOME" }: { position?: string }) {
  const { t } = useTranslation()
  const [unit, setUnit] = useState<AdUnit | null>(null)
  useEffect(() => {
    let live = true
    void supabase.from("site_settings").select("value").eq("setting_key", "ads").is("site_id", null).maybeSingle().then(({ data }: { data: any }) => {
      if (!live) return
      const config = (data?.value ?? {}) as { enabled?: boolean; mode?: string; units?: AdUnit[] }
      const candidate = config.units?.find(item => item.enabled && item.position === position && safeWebUrl(item.image_url))
      if (config.enabled && config.mode !== "Désactivé" && candidate) setUnit(candidate)
    })
    return () => { live = false }
  }, [position])
  if (!unit) return null
  const imageUrl = safeWebUrl(unit.image_url)
  const clickUrl = safeWebUrl(unit.click_url)
  if (!imageUrl) return null
  const content = <><img src={imageUrl} alt={unit.alt_text || unit.name || t("Publicité")} loading="lazy" className="max-h-40 w-full object-contain"/><span className="mt-2 flex items-center justify-center gap-1 text-[10px] text-muted-foreground">{t("Publicité")}{unit.name ? ` · ${unit.name}` : ""}{clickUrl&&<ExternalLink size={11}/>}</span></>
  return <aside aria-label={t("Publicité")} className="mx-auto my-8 max-w-[1440px] px-5 md:px-10"><div className="rounded-md border border-border bg-muted/20 p-3 text-center">{clickUrl?<a href={clickUrl} target="_blank" rel="noopener noreferrer" className="mx-auto block max-w-4xl transition-opacity hover:opacity-90">{content}</a>:<div className="mx-auto max-w-4xl">{content}</div>}</div></aside>
}