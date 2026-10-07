import { getAuthHeader, getStoredSession } from './postgres'

function getUploadHeaders(): Record<string, string> {
  const session = getStoredSession()
  if (session?.access_token) {
    return { Authorization: `Bearer ${session.access_token}` }
  }
  return {}
}

export interface Chapter {
  id?: string
  title: string
  slug: string
  chapter_number?: number
  images?: string[]
}

export interface ShopProduct {
  id?: string
  name: string
  price: string
  image_url: string
  product_link: string
}

export interface AdBanner {
  id?: string
  enabled: boolean
  mode: 'link' | 'html'
  label?: string
  text?: string
  link_url?: string
  image_url?: string
  html_code?: string
}

export interface SidebarAd {
  id?: string
  enabled: boolean
  mode: 'link' | 'html'
  label?: string
  text?: string
  link_url?: string
  image_url?: string
  html_code?: string
}

export interface SiteData {
  site_name: string
  keyword: string
  language: string
  baseUrl: string
  manga: Array<{
    title: string
    slug: string
    cover: string
    banner: string
    summary: string
    tags: string[]
    chapters: Chapter[]
  }>
  config: {
    description: string
    about_html: string
    nav: { links: { label: string; url: string }[] }
    footer: {
      about: string
      copyright: string
      legal: {
        privacy_link: string
        tos_link: string
        dmca_link: string
        cookie_link: string
        contact_link: string
      }
    }
    ad_banners_list: AdBanner[]
    ad_after_chapters_list: AdBanner[]
    sidebar: {
      ads_list: SidebarAd[]
      stats: {
        enabled: boolean
        rank: string
        readers: string
        rating: string
      }
    }
    shop: {
      enabled: boolean
      title: string
      button_text: string
      button_link: string
      products: ShopProduct[]
    }
    seo: {
      author: string
      robots: string
      og_image: string
      twitter_card: string
      favicon_ico: string
      favicon_32: string
      favicon_16: string
      apple_touch: string
      manifest: string
      google_verify: string
      bing_verify: string
      yandex_verify: string
      ga_id: string
      clarity_id: string
      faq: { q: string; a: string }[]
    }
    popular_manga?: PopularItem[]
  }
}

export interface Project {
  id: string
  site_name: string
  slug?: string
  keyword?: string
  language?: string
  status?: 'draft' | 'generated' | 'active' | 'archived'
  siteData?: SiteData
  created_at?: string
  updated_at?: string
}

export interface LogEntry {
  timestamp: string
  level: 'ERROR' | 'WARN' | 'INFO'
  message: string
  filename?: string
  value?: string
}

export interface PopularItem {
  title: string
  cover: string
  link: string
}

export const projects = {
  async getAll(): Promise<Project[]> {
    const res = await fetch('/api/projects', {
      headers: getAuthHeader(),
      credentials: 'include',
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error || 'Failed to fetch projects')
    }
    const data = await res.json()
    return Array.isArray(data) ? data : data.projects || []
  },

  async get(id: string): Promise<Project> {
    const res = await fetch(`/api/projects/${id}`, {
      headers: getAuthHeader(),
      credentials: 'include',
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error || `Failed to fetch project ${id}`)
    }
    const data = await res.json()
    return data.project || data
  },

  async create(payload: Partial<Project>): Promise<Project> {
    const res = await fetch('/api/projects', {
      method: 'POST',
      headers: getAuthHeader(),
      credentials: 'include',
      body: JSON.stringify(payload),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error || 'Failed to create project')
    }
    const data = await res.json()
    return data.project || data
  },

  async update(id: string, payload: Partial<Project>): Promise<Project> {
    const res = await fetch(`/api/projects/${id}`, {
      method: 'PUT',
      headers: getAuthHeader(),
      credentials: 'include',
      body: JSON.stringify(payload),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error || `Failed to update project ${id}`)
    }
    const data = await res.json()
    return data.project || data
  },

  async delete(id: string): Promise<{ success: boolean }> {
    const res = await fetch(`/api/projects/${id}`, {
      method: 'DELETE',
      headers: getAuthHeader(),
      credentials: 'include',
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error || `Failed to delete project ${id}`)
    }
    return res.json()
  },

  async clearCache(): Promise<{ success: boolean; message: string }> {
    const res = await fetch('/api/projects/clear-cache', {
      method: 'POST',
      headers: getAuthHeader(),
      credentials: 'include',
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error || 'Failed to clear cache')
    }
    return res.json()
  },

  async getLogs(): Promise<LogEntry[]> {
    const res = await fetch('/api/projects/logs-all', {
      headers: getAuthHeader(),
      credentials: 'include',
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error || 'Failed to fetch log entries')
    }
    const data = await res.json()
    return Array.isArray(data) ? data : data.logs || []
  },
}

export const upload = {
  async cover(projectId: string, mangaIndex: number, file: File): Promise<{ cover: string }> {
    const formData = new FormData()
    formData.append('file', file)
    const res = await fetch(`/api/upload/${projectId}/cover/${mangaIndex}`, {
      method: 'POST',
      headers: getUploadHeaders(),
      credentials: 'include',
      body: formData,
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error || 'Failed to upload cover')
    }
    return res.json()
  },

  async banner(projectId: string, mangaIndex: number, file: File): Promise<{ url: string }> {
    const formData = new FormData()
    formData.append('file', file)
    const res = await fetch('/api/upload/image', {
      method: 'POST',
      headers: getUploadHeaders(),
      credentials: 'include',
      body: formData,
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error || 'Failed to upload banner')
    }
    return res.json()
  },

  async chapters(projectId: string, mangaIndex: number, files: FileList | File[]): Promise<{ count: number; chapters: Chapter[] }> {
    const formData = new FormData()
    Array.from(files).forEach((f) => formData.append('files', f))
    const res = await fetch(`/api/upload/${projectId}/chapters/${mangaIndex}`, {
      method: 'POST',
      headers: getUploadHeaders(),
      credentials: 'include',
      body: formData,
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error || 'Failed to import chapters')
    }
    return res.json()
  },

  async zip(projectId: string, mangaIndex: number, file: File): Promise<{ count: number; chapters: Chapter[] }> {
    const formData = new FormData()
    formData.append('file', file)
    const res = await fetch(`/api/upload/${projectId}/chapters/${mangaIndex}/zip`, {
      method: 'POST',
      headers: getUploadHeaders(),
      credentials: 'include',
      body: formData,
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error || 'Failed to upload chapter zip')
    }
    return res.json()
  },

  async clearChapters(projectId: string, mangaIndex: number): Promise<{ success: boolean }> {
    const res = await fetch(`/api/upload/${projectId}/chapters/${mangaIndex}`, {
      method: 'DELETE',
      headers: getAuthHeader(),
      credentials: 'include',
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error || 'Failed to clear chapters')
    }
    return res.json()
  },
}

export const generate = {
  async site(projectId: string): Promise<{ success: boolean; url: string }> {
    const res = await fetch(`/api/generate/${projectId}`, {
      method: 'POST',
      headers: getAuthHeader(),
      credentials: 'include',
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error || 'Failed to generate static site')
    }
    return res.json()
  },

  async popular(projectId: string): Promise<{ success: boolean; url: string }> {
    const res = await fetch(`/api/generate/${projectId}/popular`, {
      method: 'POST',
      headers: getAuthHeader(),
      credentials: 'include',
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error || 'Failed to generate popular page')
    }
    return res.json()
  },

  async deletePopular(projectId: string): Promise<{ success: boolean }> {
    const res = await fetch(`/api/generate/${projectId}/popular`, {
      method: 'DELETE',
      headers: getAuthHeader(),
      credentials: 'include',
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error || 'Failed to delete popular page')
    }
    return res.json()
  },
}

export interface CredentialsStatus {
  configured: boolean
  email?: string
  project?: string
}

export interface CsvFile {
  fileName: string
  csv: string
  chapterCount: number
  imageCount: number
}

export interface ScanResult {
  rootName: string
  rootFolderId: string
  csvFiles: CsvFile[]
  combinedCSV: string
  totalChapters: number
  totalImages: number
  chapters: { number: number; title: string; imageCount: number }[]
}

export const driveToCSV = {
  async credentialsStatus(): Promise<CredentialsStatus> {
    const res = await fetch('/api/drive-to-csv/credentials-status', {
      headers: getAuthHeader(),
      credentials: 'include',
    })
    if (!res.ok) {
      return { configured: false }
    }
    return res.json()
  },

  async uploadCredentials(file: File): Promise<CredentialsStatus> {
    const formData = new FormData()
    formData.append('file', file)
    const res = await fetch('/api/drive-to-csv/upload-credentials', {
      method: 'POST',
      headers: getUploadHeaders(),
      credentials: 'include',
      body: formData,
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error || 'Failed to upload credentials file')
    }
    return res.json()
  },

  async downloadZip(rootName: string, csvFiles: CsvFile[]): Promise<Blob> {
    const res = await fetch('/api/drive-to-csv/download-zip', {
      method: 'POST',
      headers: getAuthHeader(),
      credentials: 'include',
      body: JSON.stringify({ rootName, csvFiles }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error || 'Failed to generate ZIP file')
    }
    return res.blob()
  },
}

export const wpImport = {
  async test(siteUrl: string): Promise<{ ok: boolean; plugin?: string; mangaCount?: number }> {
    const res = await fetch('/api/wp-import/test', {
      method: 'POST',
      headers: getAuthHeader(),
      credentials: 'include',
      body: JSON.stringify({ siteUrl }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error || 'Failed to connect to WordPress site')
    }
    return res.json()
  },

  async mangaList(siteUrl: string): Promise<{ manga: Array<{ id: string; title: string; slug: string; summary: string; cover: string; chaptersCount?: number }> }> {
    const res = await fetch('/api/wp-import/manga-list', {
      method: 'POST',
      headers: getAuthHeader(),
      credentials: 'include',
      body: JSON.stringify({ siteUrl }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error || 'Failed to fetch WordPress manga list')
    }
    return res.json()
  },

  async import(siteUrl: string, mangaId: string, projectId: string): Promise<{ success: boolean; importedCount: number }> {
    const res = await fetch('/api/wp-import/import', {
      method: 'POST',
      headers: getAuthHeader(),
      credentials: 'include',
      body: JSON.stringify({ siteUrl, mangaId, projectId }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error || 'Failed to import chapters from WordPress')
    }
    return res.json()
  },
}
