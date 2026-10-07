import { getAuthHeader } from '@/lib/postgres'

export interface InvoiceItem {
  description: string
  quantity: number
  unit_price: number
  total: number
}

export interface Invoice {
  id: string
  invoice_number: string
  client_name: string
  client_email: string
  site_id?: string | null
  site_name?: string | null
  amount: number
  currency: string
  status: 'paid' | 'pending' | 'overdue' | 'draft'
  issue_date: string
  due_date: string
  description: string
  items: InvoiceItem[]
  created_at: string
  updated_at?: string
}

export interface InvoiceStats {
  totalInvoiced: number
  paidTotal: number
  pendingTotal: number
  overdueTotal: number
  count: number
  paidCount: number
  pendingCount: number
  overdueCount: number
}

export const invoicesApi = {
  async getStats(site_id?: string): Promise<InvoiceStats> {
    const query = new URLSearchParams()
    if (site_id && site_id !== 'all' && site_id !== 'global') {
      query.append('site_id', site_id)
    }
    const res = await fetch(`/api/invoices/stats?${query.toString()}`, {
      headers: getAuthHeader(),
      credentials: 'include',
    })
    if (!res.ok) throw new Error('Failed to fetch invoice stats')
    return res.json()
  },

  async getAll(params: { status?: string; site_id?: string; search?: string } = {}): Promise<Invoice[]> {
    const query = new URLSearchParams()
    if (params.status && params.status !== 'all') query.append('status', params.status)
    if (params.site_id && params.site_id !== 'all' && params.site_id !== 'global') query.append('site_id', params.site_id)
    if (params.search) query.append('search', params.search)

    const res = await fetch(`/api/invoices?${query.toString()}`, {
      headers: getAuthHeader(),
      credentials: 'include',
    })
    if (!res.ok) throw new Error('Failed to fetch invoices')
    return res.json()
  },

  async getById(id: string): Promise<Invoice> {
    const res = await fetch(`/api/invoices/${id}`, {
      headers: getAuthHeader(),
      credentials: 'include',
    })
    if (!res.ok) throw new Error('Failed to fetch invoice')
    return res.json()
  },

  async create(data: Partial<Invoice>): Promise<Invoice> {
    const res = await fetch('/api/invoices', {
      method: 'POST',
      headers: getAuthHeader(),
      credentials: 'include',
      body: JSON.stringify(data),
    })
    if (!res.ok) throw new Error('Failed to create invoice')
    return res.json()
  },

  async update(id: string, data: Partial<Invoice>): Promise<Invoice> {
    const res = await fetch(`/api/invoices/${id}`, {
      method: 'PUT',
      headers: getAuthHeader(),
      credentials: 'include',
      body: JSON.stringify(data),
    })
    if (!res.ok) throw new Error('Failed to update invoice')
    return res.json()
  },

  async delete(id: string): Promise<{ success: boolean }> {
    const res = await fetch(`/api/invoices/${id}`, {
      method: 'DELETE',
      headers: getAuthHeader(),
      credentials: 'include',
    })
    if (!res.ok) throw new Error('Failed to delete invoice')
    return res.json()
  },
}
