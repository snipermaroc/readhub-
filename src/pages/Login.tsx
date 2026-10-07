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

  // Already logged in → go straight to dashboard
  if (user && (role === "admin" || role === "owner")) {
    return <Navigate to="/hub/dashboard" replace />
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setError("")
    setBusy(true)
    try {
      const { error: loginError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })
      if (loginError) {
        setError(t("Invalid email address or password."))
      } else {
        navigate("/hub/dashboard", { replace: true })
      }
    } catch {
      setError(t("Connection error. Please try again."))
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="min-h-screen grid lg:grid-cols-[1.05fr_.95fr] bg-background">

      {/* ── Left decorative panel ── */}
      <section className="relative hidden lg:flex flex-col justify-between overflow-hidden p-12 text-white"
        style={{ background: "linear-gradient(135deg, #004d4d 0%, #006769 50%, #008080 100%)" }}>
        {/* subtle radial glow */}
        <div className="absolute inset-0 opacity-20"
          style={{ background: "radial-gradient(circle at 80% 15%, rgba(255,255,255,0.25), transparent 55%)" }} />

        {/* Logo */}
        <Link to="/" className="relative flex items-center gap-3 text-sm font-semibold text-white/90 hover:text-white transition">
          <BookOpen size={20} />
          <span className="font-bold tracking-wide">READHUB</span>
        </Link>

        {/* Headline */}
        <div className="relative max-w-lg">
          <p className="text-xs uppercase tracking-[.25em] text-white/60 mb-4">
            {t("Management Area")}
          </p>
          <h1 className="text-5xl font-black leading-[1.06] text-white">
            {t("One studio.")}<br />{t("Worlds to read.")}
          </h1>
          <p className="mt-5 max-w-md text-base text-white/70 leading-relaxed">
            {t("Manage your manga sites, their publications, and their settings from one central space.")}
          </p>
        </div>

        <p className="relative text-xs text-white/40">
          READHUB · {t("multi-site publishing network")}
        </p>
      </section>

      {/* ── Right login panel ── */}
      <section className="flex items-center justify-center px-6 py-12 bg-background">
        <div className="w-full max-w-md">

          {/* Back link */}
          <Link to="/"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-14">
            <ArrowLeft size={16} />
            {t("Back to portal")}
          </Link>

          {/* Lock icon */}
          <div className="grid h-12 w-12 place-items-center rounded-xl bg-primary text-primary-foreground shadow-md mb-6">
            <LockKeyhole size={21} />
          </div>

          {/* Heading */}
          <h2 className="text-3xl font-black text-foreground tracking-tight">
            {t("Admin login")}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {t("Access the READHUB management console.")}
          </p>

          {/* Form */}
          <form onSubmit={submit} className="mt-8 space-y-5">

            {/* Email */}
            <label className="block text-sm font-semibold text-foreground">
              {t("Email address")}
              <input
                required
                type="email"
                autoComplete="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="mt-2 h-12 w-full rounded-xl border border-input bg-card px-4 text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                placeholder="admin@readhub.com"
              />
            </label>

            {/* Password */}
            <label className="block text-sm font-semibold text-foreground">
              {t("Password")}
              <input
                required
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="mt-2 h-12 w-full rounded-xl border border-input bg-card px-4 text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                placeholder={t("Your password")}
              />
            </label>

            {/* Error */}
            {error && (
              <p role="alert" className="text-sm font-medium text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-4 py-2.5">
                {error}
              </p>
            )}

            {/* Submit */}
            <button
              disabled={busy}
              className="group flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-bold text-primary-foreground shadow-md transition hover:opacity-90 disabled:opacity-60"
            >
              {busy
                ? <LoaderCircle className="animate-spin" size={17} />
                : <>{t("Open console")} <ArrowRight className="transition-transform group-hover:translate-x-1" size={17} /></>
              }
            </button>
          </form>

          <p className="mt-7 text-xs leading-5 text-muted-foreground">
            {t("Administrator accounts are created by the platform owner.")}
          </p>
        </div>
      </section>
    </main>
  )
}
