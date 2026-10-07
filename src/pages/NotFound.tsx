import { Link } from "react-router-dom"
import { Home } from "lucide-react"
import MangaHeader from "@/components/MangaHeader"
import MangaFooter from "@/components/MangaFooter"

export default function NotFound() {
  return (
    <div className="min-h-screen bg-surface dark:bg-[#0f1117] text-on-surface">
      <MangaHeader siteName="" />

      {/* Matching Design System 9c */}
      <main className="min-h-[75vh] flex items-center justify-center px-6 md:px-8 pt-20 pb-20">
        <div className="text-center max-w-lg">
          <div className="text-8xl font-extrabold font-headline text-primary mb-4">404</div>
          <h1 className="text-3xl font-extrabold font-headline text-on-surface mb-3">Page Not Found</h1>
          <p className="text-secondary leading-relaxed mb-8 text-sm">
            The page you're looking for doesn't exist or has been moved. Head back to continue reading.
          </p>

          <div className="flex gap-4 justify-center flex-wrap">
            <Link
              to="/"
              className="bg-[#006769] hover:bg-[#005052] text-white font-bold px-8 py-3 rounded-xl transition-colors inline-flex items-center gap-2 shadow-lg text-sm"
            >
              <Home size={16} /> Back to Home
            </Link>
            <Link
              to="/chapter/1"
              className="bg-surface-container-highest dark:bg-[#2c3040] text-on-surface font-bold px-8 py-3 rounded-xl hover:bg-surface-container-high transition-colors text-sm"
            >
              Start Reading
            </Link>
          </div>

          {/* Manga Promo Card */}
          <div className="mt-12 flex items-center gap-5 justify-center p-4 bg-surface-container-lowest dark:bg-[#1a1d27] rounded-xl border border-outline-variant/15 shadow-sm max-w-xs mx-auto">
            <img
              src="/assets/readhub-editorial-hero.webp"
              alt="Berserk"
              className="w-16 h-24 object-cover rounded-lg shadow-md shrink-0"
            />
            <div className="text-left">
              <p className="text-[10px] text-secondary uppercase tracking-widest mb-1 font-bold">Continue Reading</p>
              <p className="font-bold text-on-surface text-base font-headline">Berserk</p>
              <p className="text-secondary text-xs">Full series available</p>
            </div>
          </div>
        </div>
      </main>

      <MangaFooter siteName="" />
    </div>
  )
}
