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
        setError(loginError.message ? t(loginError.message) : t("Invalid email address or password."))
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
    <main className="min-h-screen grid lg:grid-cols-[1.05fr_.95fr]">

      {/* ── Left decorative panel — deep teal gradient ── */}
      <section
        className="relative hidden lg:flex flex-col justify-between overflow-hidden p-12 text-white"
        style={{ background: "linear-gradient(135deg, #003d3d 0%, #006769 55%, #008585 100%)" }}
      >
        <div
          className="absolute inset-0 opacity-25"
          style={{ background: "radial-gradient(circle at 75% 15%, rgba(255,255,255,0.3), transparent 50%)" }}
        />

        {/* Logo — icon only, no brand name */}
        <Link to="/" className="relative flex items-center gap-2 text-white/80 hover:text-white transition">
          <BookOpen size={22} />
        </Link>

        {/* Headline */}
        <div className="relative max-w-lg">
          <p className="text-xs uppercase tracking-[.28em] text-white/55 mb-5">
            {t("Management Area")}
          </p>
          <h1 className="text-5xl font-black leading-[1.06] text-white">
            {t("One studio.")}<br />{t("Worlds to read.")}
          </h1>
          <p className="mt-5 max-w-md text-[15px] text-white/65 leading-relaxed">
            {t("Manage your manga sites, their publications, and their settings from one central space.")}
          </p>
        </div>

        {/* Footer — no brand name */}
        <p className="relative text-[11px] text-white/35 tracking-wide">
          {t("multi-site publishing network")}
        </p>
      </section>

      {/* ── Right login panel — white in light, dark card in dark mode ── */}
      <section className="flex items-center justify-center px-6 py-12 bg-white dark:bg-[#0f1117]">
        <div className="w-full max-w-md">

          {/* Back link */}
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors mb-14"
          >
            <ArrowLeft size={16} />
            {t("Back to portal")}
          </Link>

          {/* Lock icon */}
          <div className="grid h-12 w-12 place-items-center rounded-xl bg-primary text-white shadow-md mb-6">
            <LockKeyhole size={21} />
          </div>

          {/* Heading */}
          <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            {t("Admin login")}
          </h2>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            {t("Access the management console.")}
          </p>

          {/* Form */}
          <form onSubmit={submit} className="mt-8 space-y-5">

            {/* Email */}
            <div className="space-y-1.5">
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">
                {t("Email address")}
              </label>
              <input
                required
                type="email"
                autoComplete="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="h-12 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                placeholder="admin@readhub.com"
              />
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">
                {t("Password")}
              </label>
              <input
                required
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="h-12 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                placeholder={t("Your password")}
              />
            </div>

            {/* Error */}
            {error && (
              <p role="alert" className="text-sm font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40 rounded-xl px-4 py-2.5">
                {error}
              </p>
            )}

            {/* Submit */}
            <button
              disabled={busy}
              className="group flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-bold text-white shadow-md shadow-primary/20 transition hover:opacity-90 disabled:opacity-60"
            >
              {busy
                ? <LoaderCircle className="animate-spin" size={17} />
                : <>{t("Open console")} <ArrowRight className="transition-transform group-hover:translate-x-1" size={17} /></>
              }
            </button>
          </form>

          <p className="mt-7 text-xs leading-5 text-slate-400 dark:text-slate-500">
            {t("Administrator accounts are created by the platform owner.")}
          </p>
        </div>
      </section>
    </main>
  )
}
