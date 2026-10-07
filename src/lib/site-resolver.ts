import { supabase } from "@/lib/mangahub-db"

const RESERVED = new Set(["www", "admin", "api", "app", "mail", "ftp", "cdn", "assets", "static", "support", "help", "blog", "status"])
const CACHE_MS = 60_000
const siteCache = new Map<string, { at: number; value: any }>()
const configCache = new Map<string, { at: number; value: Record<string, unknown> }>()

export function resolveSubdomain(hostname: string) {
  const host = hostname.toLowerCase().split(":")[0].replace(/\.$/, "")
  if (host === "readhub.com" || host === "www.readhub.com") return null
  if (host.endsWith(".readhub.com")) {
    const label = host.slice(0, -".readhub.com".length)
    return label && !label.includes(".") && !RESERVED.has(label) ? label : null
  }
  return null
}

export function resolveHost(hostname: string) {
  return { host: hostname.toLowerCase(), subdomain: resolveSubdomain(hostname), isCentral: !resolveSubdomain(hostname) }
}

export async function resolveSite(hostname: string) {
  const subdomain = resolveSubdomain(hostname)
  if (!subdomain) return { site: null, error: null }
  const cached = siteCache.get(subdomain)
  if (cached && Date.now() - cached.at < CACHE_MS) return { site: cached.value, error: null }
  const { data, error } = await supabase.from("manga_sites").select("*").eq("subdomain", subdomain).eq("status", "active").maybeSingle()
  if (data) siteCache.set(subdomain, { at: Date.now(), value: data })
  return { site: data, error: error?.message ?? null }
}

export async function resolveSiteConfiguration(siteId: string) {
  const cached = configCache.get(siteId)
  if (cached && Date.now() - cached.at < CACHE_MS) return { configuration: cached.value, error: null }
  const { data, error } = await supabase.from("site_settings").select("setting_key,value").eq("site_id", siteId)
  if (error) return { configuration: {}, error: error.message }
  const configuration = Object.fromEntries((data ?? []).map((row: any) => [row.setting_key, row.value]))
  configCache.set(siteId, { at: Date.now(), value: configuration })
  return { configuration, error: null }
}

export function clearSiteResolverCache() {
  siteCache.clear()
  configCache.clear()
}