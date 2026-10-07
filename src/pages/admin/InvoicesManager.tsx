import { useEffect, useState, useMemo, useCallback } from 'react'
import {
  FileText,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileCheck,
  DollarSign,
  Download,
  Printer,
  Trash2,
  Edit2,
  X,
  Building2,
  Mail,
  Calendar,
  Layers,
  ArrowUpRight,
  RefreshCw,
  Eye,
} from 'lucide-react'
import { invoicesApi, type Invoice, type InvoiceItem, type InvoiceStats } from '@/lib/invoices-api'
import { supabase } from '@/lib/mangahub-db'

export default function InvoicesManager({
  initialSiteId = 'global',
  onSiteChange,
}: {
  initialSiteId?: string
  onSiteChange?: (siteId: string) => void
} = {}) {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [stats, setStats] = useState<InvoiceStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedSiteId, setSelectedSiteId] = useState<string>(initialSiteId)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [sites, setSites] = useState<Array<{ id: string; name: string }>>([])
  const [actionNotice, setActionNotice] = useState<string>('')

  // Modals state
  const [modalOpen, setModalOpen] = useState(false)
  const [previewInvoice, setPreviewInvoice] = useState<Invoice | null>(null)
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null)

  // Form State
  const [clientName, setClientName] = useState('')
  const [clientEmail, setClientEmail] = useState('')
  const [invoiceSiteId, setInvoiceSiteId] = useState('')
  const [invoiceStatus, setInvoiceStatus] = useState<'paid' | 'pending' | 'overdue' | 'draft'>('pending')
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0])
  const [dueDate, setDueDate] = useState(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
  const [description, setDescription] = useState('')
  const [items, setItems] = useState<InvoiceItem[]>([
    { description: 'Hébergement haute disponibilité & Scanlation CDN', quantity: 1, unit_price: 350, total: 350 },
  ])

  // Fetch Sites list
  useEffect(() => {
    supabase
      .from('manga_sites')
      .select('id,name')
      .order('name')
      .then(({ data }: { data: any }) => {
        if (data) setSites(data as any)
      })
  }, [])

  // Load Invoices and Stats
  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [statsData, listData] = await Promise.all([
        invoicesApi.getStats(selectedSiteId),
        invoicesApi.getAll({
          site_id: selectedSiteId,
          status: statusFilter !== 'all' ? statusFilter : undefined,
          search: searchQuery.trim() || undefined,
        }),
      ])
      setStats(statsData)
      setInvoices(listData)
    } catch (err: any) {
      console.warn('Failed to load invoices:', err.message)
    } finally {
      setLoading(false)
    }
  }, [selectedSiteId, statusFilter, searchQuery])

  useEffect(() => {
    void loadData()
  }, [loadData])

  const flash = (msg: string) => {
    setActionNotice(msg)
    setTimeout(() => setActionNotice(''), 4000)
  }

  // Handle Form Item changes
  const handleItemChange = (index: number, field: keyof InvoiceItem, value: any) => {
    const updated = [...items]
    const item = { ...updated[index], [field]: value }
    if (field === 'quantity' || field === 'unit_price') {
      const q = Number(field === 'quantity' ? value : item.quantity) || 0
      const p = Number(field === 'unit_price' ? value : item.unit_price) || 0
      item.total = q * p
    }
    updated[index] = item
    setItems(updated)
  }

  const addItemRow = () => {
    setItems([...items, { description: 'Nouvelle prestation', quantity: 1, unit_price: 100, total: 100 }])
  }

  const removeItemRow = (index: number) => {
    if (items.length <= 1) return
    setItems(items.filter((_, i) => i !== index))
  }

  const totalCalculatedAmount = useMemo(() => {
    return items.reduce((acc, i) => acc + (Number(i.total) || 0), 0)
  }, [items])

  // Open Create Modal
  const openCreateModal = () => {
    setEditingInvoice(null)
    setClientName('')
    setClientEmail('')
    setInvoiceSiteId(sites[0]?.id || '')
    setInvoiceStatus('pending')
    setIssueDate(new Date().toISOString().split('T')[0])
    setDueDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
    setDescription('Prestation & Service MangaHub')
    setItems([{ description: 'Hébergement Scan CDN', quantity: 1, unit_price: 250, total: 250 }])
    setModalOpen(true)
  }

  // Open Edit Modal
  const openEditModal = (inv: Invoice) => {
    setEditingInvoice(inv)
    setClientName(inv.client_name)
    setClientEmail(inv.client_email)
    setInvoiceSiteId(inv.site_id || '')
    setInvoiceStatus(inv.status)
    setIssueDate(inv.issue_date)
    setDueDate(inv.due_date)
    setDescription(inv.description)
    setItems(inv.items && inv.items.length > 0 ? inv.items : [{ description: 'Prestation générale', quantity: 1, unit_price: inv.amount, total: inv.amount }])
    setModalOpen(true)
  }

  // Save Invoice (Create or Update)
  const handleSaveInvoice = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const siteObj = sites.find(s => s.id === invoiceSiteId)
      const payload = {
        client_name: clientName,
        client_email: clientEmail,
        site_id: invoiceSiteId || null,
        site_name: siteObj ? siteObj.name : 'Central Portal',
        status: invoiceStatus,
        issue_date: issueDate,
        due_date: dueDate,
        description,
        amount: totalCalculatedAmount,
        currency: 'USD',
        items,
      }

      if (editingInvoice) {
        await invoicesApi.update(editingInvoice.id, payload)
        flash('✓ Facture mise à jour avec succès.')
      } else {
        await invoicesApi.create(payload)
        flash('✓ Nouvelle facture enregistrée avec succès.')
      }
      setModalOpen(false)
      void loadData()
    } catch (err: any) {
      flash(`Erreur: ${err.message}`)
    }
  }

  // Toggle Paid Status
  const handleTogglePaid = async (inv: Invoice) => {
    try {
      const nextStatus = inv.status === 'paid' ? 'pending' : 'paid'
      await invoicesApi.update(inv.id, { status: nextStatus })
      flash(`✓ Facture ${inv.invoice_number} passée en "${nextStatus.toUpperCase()}".`)
      void loadData()
    } catch (err: any) {
      flash(`Erreur: ${err.message}`)
    }
  }

  // Delete Invoice
  const handleDeleteInvoice = async (id: string, number: string) => {
    if (!confirm(`Confirmez-vous la suppression définitive de la facture ${number} ?`)) return
    try {
      await invoicesApi.delete(id)
      flash(`✓ Facture ${number} supprimée.`)
      void loadData()
    } catch (err: any) {
      flash(`Erreur: ${err.message}`)
    }
  }

  return (
    <section className="space-y-6">
      {/* ── Top Header Bar ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card border border-border p-5 rounded-2xl shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-primary/10 text-primary">
              <DollarSign size={18} />
            </span>
            <span className="text-xs uppercase font-extrabold tracking-widest text-primary font-headline">
              Financial Management
            </span>
          </div>
          <h2 className="mt-1 text-2xl font-black font-headline text-foreground tracking-tight">
            Facturation & Factures (Invoices)
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Suivi des encaissements, prestations, abonnements sponsors et factures des éditions manga.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Site Selector */}
          <select
            value={selectedSiteId}
            onChange={e => {
              setSelectedSiteId(e.target.value)
              if (onSiteChange) onSiteChange(e.target.value)
            }}
            className="h-9 px-3 rounded-xl border border-input bg-card text-xs font-bold text-foreground outline-none focus:border-primary shadow-sm"
          >
            <option value="global">🌐 Toutes les Éditions</option>
            {sites.map(s => (
              <option key={s.id} value={s.id}>
                📖 {s.name}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={openCreateModal}
            className="flex items-center gap-1.5 h-9 px-4 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs shadow-md transition"
          >
            <Plus size={15} />
            <span>Créer une Facture</span>
          </button>
        </div>
      </div>

      {actionNotice && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold text-xs flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 size={16} />
          <span>{actionNotice}</span>
        </div>
      )}

      {/* ── Metric Cards Grid ── */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
          {/* Total Facturé */}
          <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span>Total Facturé</span>
              <DollarSign size={14} className="text-foreground" />
            </div>
            <p className="text-2xl sm:text-3xl font-black text-foreground font-mono">
              ${stats.totalInvoiced.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-[10px] text-muted-foreground font-semibold mt-0.5">
              {stats.count} factures au total
            </p>
          </div>

          {/* Encaissé / Payé */}
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-4 shadow-sm">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span className="font-bold text-foreground">Encaissé (Payé)</span>
              <FileCheck size={14} className="text-emerald-500" />
            </div>
            <p className="text-2xl sm:text-3xl font-black text-emerald-500 font-mono">
              ${stats.paidTotal.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5">
              {stats.paidCount} factures réglées
            </p>
          </div>

          {/* En Attente */}
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4 shadow-sm">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span className="font-bold text-foreground">En Attente</span>
              <Clock size={14} className="text-amber-500" />
            </div>
            <p className="text-2xl sm:text-3xl font-black text-amber-500 font-mono">
              ${stats.pendingTotal.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold mt-0.5">
              {stats.pendingCount} en cours de paiement
            </p>
          </div>

          {/* En Retard */}
          <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4 shadow-sm">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span className="font-bold text-foreground">En Retard</span>
              <AlertTriangle size={14} className="text-destructive" />
            </div>
            <p className="text-2xl sm:text-3xl font-black text-destructive font-mono">
              ${stats.overdueTotal.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-[10px] text-destructive font-semibold mt-0.5">
              {stats.overdueCount} facture(s) en dépassement
            </p>
          </div>
        </div>
      )}

      {/* ── Filters & Search Toolbar ── */}
      <div className="bg-card border border-border p-4 rounded-2xl shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <input
            type="search"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Rechercher par N°, client ou prestation..."
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-input bg-muted/20 text-xs text-foreground outline-none focus:border-primary shadow-sm"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
          {['all', 'paid', 'pending', 'overdue'].map(st => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                statusFilter === st
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              {st === 'all' ? 'Toutes' : st === 'paid' ? 'Payées' : st === 'pending' ? 'En attente' : 'En retard'}
            </button>
          ))}

          <button
            type="button"
            onClick={() => void loadData()}
            className="p-2 rounded-xl border border-border bg-card text-muted-foreground hover:text-foreground transition"
            title="Rafraîchir"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* ── Invoices List Table ── */}
      <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
        {invoices.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <FileText size={36} className="mx-auto text-muted-foreground opacity-50" />
            <h3 className="font-bold text-foreground text-sm">Aucune facture trouvée</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Créez une première facture pour facturer des bannières publicitaires, des abonnements sponsors ou des services de scanlation.
            </p>
            <button
              type="button"
              onClick={openCreateModal}
              className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold transition inline-flex items-center gap-1.5"
            >
              <Plus size={14} /> Créer une Facture
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-border bg-muted/30 text-muted-foreground font-bold">
                <tr>
                  <th className="py-3 px-4">N° Facture</th>
                  <th className="py-3 px-4">Client / Partenaire</th>
                  <th className="py-3 px-4">Édition / Site</th>
                  <th className="py-3 px-4">Date d'Émission</th>
                  <th className="py-3 px-4">Échéance</th>
                  <th className="py-3 px-4">Statut</th>
                  <th className="py-3 px-4 text-right">Montant</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {invoices.map(inv => (
                  <tr key={inv.id} className="hover:bg-muted/30 transition">
                    <td className="py-3 px-4 font-mono font-bold text-foreground">
                      {inv.invoice_number}
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-bold text-foreground">{inv.client_name}</p>
                      <p className="text-[10px] text-muted-foreground">{inv.client_email}</p>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded bg-muted font-bold text-[10px]">
                        {inv.site_name || 'Central Portal'}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-muted-foreground">
                      {inv.issue_date}
                    </td>
                    <td className="py-3 px-4 font-mono text-muted-foreground">
                      {inv.due_date}
                    </td>
                    <td className="py-3 px-4">
                      <button
                        type="button"
                        onClick={() => handleTogglePaid(inv)}
                        title="Cliquer pour changer le statut"
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase transition ${
                          inv.status === 'paid'
                            ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 hover:bg-emerald-500/20'
                            : inv.status === 'overdue'
                            ? 'bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive/20'
                            : 'bg-amber-500/10 text-amber-500 border border-amber-500/20 hover:bg-amber-500/20'
                        }`}
                      >
                        {inv.status === 'paid' && <CheckCircle2 size={10} />}
                        {inv.status === 'pending' && <Clock size={10} />}
                        {inv.status === 'overdue' && <AlertTriangle size={10} />}
                        <span>{inv.status}</span>
                      </button>
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-black text-foreground text-sm">
                      ${Number(inv.amount).toLocaleString('fr-FR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => setPreviewInvoice(inv)}
                          className="p-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground transition"
                          title="Aperçu & Imprimer Facture"
                        >
                          <Eye size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => openEditModal(inv)}
                          className="p-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground transition"
                          title="Modifier"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteInvoice(inv.id, inv.invoice_number)}
                          className="p-1.5 rounded-lg border border-destructive/30 text-destructive hover:bg-destructive/10 transition"
                          title="Supprimer"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── CREATE / EDIT INVOICE MODAL ── */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-card border border-border rounded-2xl w-full max-w-2xl shadow-2xl p-6 space-y-5 animate-in fade-in zoom-in-95 my-8">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-headline font-bold text-lg text-foreground flex items-center gap-2">
                <FileText size={18} className="text-primary" />
                <span>{editingInvoice ? `Modifier la Facture ${editingInvoice.invoice_number}` : 'Nouvelle Facture'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1 text-muted-foreground hover:text-foreground rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveInvoice} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-muted-foreground mb-1">Nom du Client / Partenaire *</label>
                  <input
                    type="text"
                    required
                    value={clientName}
                    onChange={e => setClientName(e.target.value)}
                    placeholder="Ex: CrunchyManga Scanlation"
                    className="w-full h-9 px-3 rounded-xl border border-input bg-muted/20 text-xs text-foreground outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-muted-foreground mb-1">Email de Facturation *</label>
                  <input
                    type="email"
                    required
                    value={clientEmail}
                    onChange={e => setClientEmail(e.target.value)}
                    placeholder="finance@client.org"
                    className="w-full h-9 px-3 rounded-xl border border-input bg-muted/20 text-xs text-foreground outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-muted-foreground mb-1">Édition / Site Manga</label>
                  <select
                    value={invoiceSiteId}
                    onChange={e => setInvoiceSiteId(e.target.value)}
                    className="w-full h-9 px-3 rounded-xl border border-input bg-muted/20 text-xs text-foreground outline-none focus:border-primary"
                  >
                    <option value="">Portail Global</option>
                    {sites.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-muted-foreground mb-1">Date d'Émission</label>
                  <input
                    type="date"
                    required
                    value={issueDate}
                    onChange={e => setIssueDate(e.target.value)}
                    className="w-full h-9 px-3 rounded-xl border border-input bg-muted/20 text-xs text-foreground outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-muted-foreground mb-1">Date d'Échéance</label>
                  <input
                    type="date"
                    required
                    value={dueDate}
                    onChange={e => setDueDate(e.target.value)}
                    className="w-full h-9 px-3 rounded-xl border border-input bg-muted/20 text-xs text-foreground outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-muted-foreground mb-1">Statut Initial</label>
                <div className="flex gap-2">
                  {(['pending', 'paid', 'overdue', 'draft'] as const).map(st => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setInvoiceStatus(st)}
                      className={`flex-1 py-1.5 rounded-xl text-xs font-bold uppercase transition ${
                        invoiceStatus === st
                          ? 'bg-primary text-primary-foreground shadow-sm'
                          : 'bg-muted/40 text-muted-foreground hover:bg-muted'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              {/* Itemized Line Items */}
              <div className="space-y-2 border-t border-border pt-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-foreground">Lignes de Prestation / Facturation</label>
                  <button
                    type="button"
                    onClick={addItemRow}
                    className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
                  >
                    <Plus size={12} /> Ajouter une ligne
                  </button>
                </div>

                <div className="space-y-2">
                  {items.map((item, idx) => (
                    <div key={idx} className="flex gap-2 items-center">
                      <input
                        type="text"
                        required
                        value={item.description}
                        onChange={e => handleItemChange(idx, 'description', e.target.value)}
                        placeholder="Description prestation..."
                        className="flex-1 h-9 px-3 rounded-xl border border-input bg-muted/20 text-xs text-foreground outline-none focus:border-primary"
                      />
                      <input
                        type="number"
                        min="1"
                        required
                        value={item.quantity}
                        onChange={e => handleItemChange(idx, 'quantity', e.target.value)}
                        placeholder="Qté"
                        className="w-16 h-9 px-2 text-center rounded-xl border border-input bg-muted/20 text-xs text-foreground outline-none focus:border-primary"
                      />
                      <input
                        type="number"
                        step="0.01"
                        required
                        value={item.unit_price}
                        onChange={e => handleItemChange(idx, 'unit_price', e.target.value)}
                        placeholder="Prix Unit."
                        className="w-24 h-9 px-2 text-right rounded-xl border border-input bg-muted/20 text-xs text-foreground outline-none focus:border-primary"
                      />
                      <span className="w-20 text-right font-mono font-bold text-xs text-foreground">
                        ${(Number(item.total) || 0).toFixed(2)}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeItemRow(idx)}
                        disabled={items.length <= 1}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive transition disabled:opacity-30"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="text-right pt-2 border-t border-border">
                  <span className="text-xs text-muted-foreground mr-3">Total Calculé :</span>
                  <span className="text-lg font-black font-mono text-primary">
                    ${totalCalculatedAmount.toFixed(2)} USD
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-border text-xs font-bold hover:bg-muted transition"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold shadow-md transition"
                >
                  {editingInvoice ? 'Enregistrer les Modifications' : 'Créer la Facture'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── INVOICE PREVIEW / PRINT MODAL ── */}
      {previewInvoice && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-card text-foreground border border-border rounded-2xl w-full max-w-2xl shadow-2xl p-8 space-y-6 animate-in fade-in zoom-in-95 my-8">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-primary text-primary-foreground font-black grid place-items-center text-lg">
                  RH
                </div>
                <div>
                  <h3 className="font-headline font-black text-xl">READHUB NETWORK</h3>
                  <p className="text-[10px] text-muted-foreground font-semibold uppercase">Manga Publishing & CDN Platform</p>
                </div>
              </div>

              <div className="text-right">
                <p className="text-xs font-mono font-black text-primary">{previewInvoice.invoice_number}</p>
                <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase mt-1 ${
                  previewInvoice.status === 'paid' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'
                }`}>
                  {previewInvoice.status}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6 text-xs">
              <div>
                <span className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">Facturé à :</span>
                <p className="font-bold text-sm text-foreground">{previewInvoice.client_name}</p>
                <p className="text-muted-foreground">{previewInvoice.client_email}</p>
                <p className="text-muted-foreground mt-1">Édition: {previewInvoice.site_name || 'Portail Global'}</p>
              </div>

              <div className="text-right">
                <span className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">Détails :</span>
                <p><b className="text-muted-foreground">Date d'émission :</b> {previewInvoice.issue_date}</p>
                <p><b className="text-muted-foreground">Date d'échéance :</b> {previewInvoice.due_date}</p>
                <p><b className="text-muted-foreground">Mode de règlement :</b> Virement / Stripe</p>
              </div>
            </div>

            <div className="border border-border rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/40 font-bold border-b border-border">
                  <tr>
                    <th className="py-2.5 px-3">Description</th>
                    <th className="py-2.5 px-3 text-center">Qté</th>
                    <th className="py-2.5 px-3 text-right">Prix Unit.</th>
                    <th className="py-2.5 px-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {previewInvoice.items?.map((item, i) => (
                    <tr key={i}>
                      <td className="py-2.5 px-3 font-medium">{item.description}</td>
                      <td className="py-2.5 px-3 text-center font-mono">{item.quantity}</td>
                      <td className="py-2.5 px-3 text-right font-mono">${Number(item.unit_price).toFixed(2)}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold">${Number(item.total).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-between items-center pt-2">
              <p className="text-[10px] text-muted-foreground max-w-xs">
                Merci pour votre confiance. Toute question relative à cette facture peut être envoyée à finance@readhub.io.
              </p>
              <div className="text-right">
                <span className="text-xs text-muted-foreground">Total à régler :</span>
                <p className="text-2xl font-black font-mono text-primary">
                  ${Number(previewInvoice.amount).toFixed(2)} USD
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-4 border-t border-border">
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2 rounded-xl border border-border bg-muted/40 hover:bg-muted text-xs font-bold flex items-center gap-1.5 transition"
              >
                <Printer size={14} /> Imprimer / PDF
              </button>
              <button
                type="button"
                onClick={() => setPreviewInvoice(null)}
                className="px-5 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold shadow-md transition"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
