import { useState, type FormEvent } from "react"
import { Link, Navigate, useNavigate } from "react-router-dom"
import { ArrowLeft, ArrowRight, BookOpen, LoaderCircle, LockKeyhole } from "lucide-react"
import { supabase } from "@/lib/mangahub-db"
import { useAuth } from "@/contexts/AuthContext"
import { useTranslation } from 'react-i18next'

export default function Login() {
  const { t } = useTranslation()
  const { user, role } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)
  if (user && (role === "admin" || role === "owner")) return <Navigate to="/admin" replace />
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setError(""); setBusy(true)
    try {
      const { error: loginError } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
      if (loginError) setError("Adresse e-mail ou mot de passe invalide.")
      else navigate("/admin", { replace: true })
    } catch { setError("Connexion impossible pour le moment. Réessayez.") }
    finally { setBusy(false) }
  }
  return <main className="min-h-screen grid lg:grid-cols-[1.05fr_.95fr] bg-background">
    <section className="relative hidden lg:flex flex-col justify-between overflow-hidden p-12 text-primary-foreground bg-primary">
      <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_80%_15%,hsl(var(--primary-foreground)/.34),transparent_34%)]" />
      <Link to="/" className="relative flex items-center gap-3 text-sm font-semibold"><BookOpen size={20}/> {t("READHUB")}</Link>
      <div className="relative max-w-lg"><p className="text-xs uppercase tracking-[.25em] opacity-65">{t("Espace de gestion")}</p><h1 className="mt-5 text-5xl leading-[1.06]">{t("Un seul atelier. Des mondes à lire.")}</h1><p className="mt-5 max-w-md text-base opacity-75">{t("Pilotez vos sites manga, leurs publications et leurs réglages depuis un espace central.")}</p></div>
      <p className="relative text-xs opacity-55">{t("READHUB · réseau éditorial multi-sites")}</p>
    </section>
    <section className="flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft size={16}/> {t("Retour au portail")}</Link>
        <div className="mt-14"><div className="grid h-12 w-12 place-items-center rounded-xl bg-accent text-accent-foreground"><LockKeyhole size={21}/></div><h2 className="mt-6 text-3xl">{t("Connexion admin")}</h2><p className="mt-2 text-sm text-muted-foreground">{t("Accédez à la console de gestion READHUB.")}</p></div>
        <form onSubmit={submit} className="mt-8 space-y-5">
          <label className="block text-sm font-medium">{t("Adresse e-mail")}<input required type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} className="mt-2 h-12 w-full rounded-lg border border-input bg-background px-4 outline-none transition focus:border-primary" placeholder="vous@exemple.com"/></label>
          <label className="block text-sm font-medium">{t("Mot de passe")}<input required type="password" autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} className="mt-2 h-12 w-full rounded-lg border border-input bg-background px-4 outline-none transition focus:border-primary" placeholder={t("Votre mot de passe")}/></label>
          {error && <p role="alert" className="text-sm text-destructive">{t(error)}</p>}
          <button disabled={busy} className="group flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-60">{busy?<LoaderCircle className="animate-spin" size={17}/>:<>{t("Ouvrir la console")} <ArrowRight className="transition-transform group-hover:translate-x-1" size={17}/></>}</button>
        </form>
        <p className="mt-7 text-xs leading-5 text-muted-foreground">{t("Les comptes d’administration sont créés par le propriétaire de la plateforme.")}</p>
      </div>
    </section>
  </main>
}