import { Navigate } from "react-router-dom"
import { useAuth } from "@/contexts/AuthContext"
import { useTranslation } from 'react-i18next'

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation()
  const { user, role, loading } = useAuth()
  if (loading) return <div className="min-h-screen bg-background" aria-label={t("Chargement")} />
  if (!user) return <Navigate to="/login" replace />
  if (role !== "admin" && role !== "owner") return <Navigate to="/" replace />
  return <>{children}</>
}