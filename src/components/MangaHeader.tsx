import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Moon, Sun, Menu, X, ArrowLeft, ArrowRight, ShoppingBag } from 'lucide-react'

interface HeaderProps {
  siteName?: string
  firstChapterUrl?: string
  latestChapterUrl?: string
  merchTitle?: string
  merchUrl?: string
  isReader?: boolean
  prevUrl?: string | null
  nextUrl?: string | null
  chapterProgress?: number
}

export default function MangaHeader({
  siteName = 'Read Berserk Manga Online',
  firstChapterUrl,
  latestChapterUrl,
  merchTitle,
  merchUrl,
  isReader = false,
  prevUrl,
  nextUrl,
  chapterProgress = 0,
}: HeaderProps) {
  const [theme, setTheme] = useState<'light' | 'dark'>('light')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    setTheme(saved as 'light' | 'dark')
    if (saved === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [])

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    localStorage.setItem('theme', next)
    if (next === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }

  return (
    <header className="fixed top-0 w-full z-50 bg-[#F7F9FB]/80 dark:bg-[#0f1117]/85 backdrop-blur-xl shadow-[0_4px_32px_rgba(25,28,30,0.06)] border-b border-outline-variant/15">
      <nav className="flex justify-between items-center px-6 md:px-8 h-16 max-w-screen-2xl mx-auto">
        <div className="flex items-center gap-8 lg:gap-10">
          {/* Brand */}
          <Link to="/" className="text-xl md:text-2xl font-extrabold tracking-tighter text-on-surface font-headline truncate max-w-[280px] sm:max-w-md">
            {siteName}
          </Link>

          {/* Desktop Nav (Design System Section 6) */}
          {!isReader ? (
            <div className="hidden md:flex gap-6 lg:gap-7 items-center text-sm">
              <Link className="text-secondary font-medium hover:text-primary transition-colors" to="/">
                Home
              </Link>
              {firstChapterUrl && (
                <Link className="text-secondary font-medium hover:text-primary transition-colors truncate max-w-[200px]" to={firstChapterUrl}>
                  Chapter 1
                </Link>
              )}
              {latestChapterUrl && (
                <Link className="text-secondary font-medium hover:text-primary transition-colors truncate max-w-[200px]" to={latestChapterUrl}>
                  Latest Chapter
                </Link>
              )}
              <Link className="text-secondary font-medium hover:text-primary transition-colors" to="/">
                Popular Manga
              </Link>
              {merchUrl && (
                <a
                  href={merchUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-secondary font-medium hover:text-primary transition-colors flex items-center gap-1.5"
                >
                  <ShoppingBag size={14} className="text-primary" /> {merchTitle || 'Merchandise'}
                </a>
              )}
            </div>
          ) : (
            <div className="hidden md:flex gap-6 lg:gap-7 items-center text-sm">
              <Link className="text-secondary font-medium hover:text-primary transition-colors" to="/">
                Home
              </Link>
              {prevUrl ? (
                <Link className="text-secondary font-medium hover:text-primary transition-colors flex items-center gap-1" to={prevUrl}>
                  <ArrowLeft size={14} /> Prev
                </Link>
              ) : null}
              {nextUrl ? (
                <Link className="text-primary font-semibold hover:opacity-80 transition-colors flex items-center gap-1" to={nextUrl}>
                  Next <ArrowRight size={14} />
                </Link>
              ) : null}
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="text-secondary hover:text-primary transition-all p-2 rounded-lg hover:bg-surface-container-high"
            title="Toggle theme"
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          {/* Mobile Hamburger */}
          <button
            onClick={() => setMobileMenuOpen(prev => !prev)}
            className="md:hidden p-2 text-secondary hover:text-primary rounded-lg hover:bg-surface-container-high"
            aria-label="Open navigation menu"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </nav>

      {/* Reader Progress Bar */}
      {isReader && (
        <div className="w-full h-0.5 bg-outline-variant/20">
          <div
            id="progress-bar"
            className="h-full bg-primary transition-all duration-150"
            style={{ width: `${Math.min(100, Math.max(0, chapterProgress))}%` }}
          />
        </div>
      )}

      {/* Mobile Dropdown */}
      {mobileMenuOpen && (
        <div id="mobileMenu" className="md:hidden bg-white/95 dark:bg-[#1a1d27]/95 backdrop-blur-xl border-t border-outline-variant/20 px-8 py-4 space-y-3 shadow-lg">
          <Link onClick={() => setMobileMenuOpen(false)} className="block text-secondary font-medium hover:text-primary py-1.5" to="/">
            Home
          </Link>
          {firstChapterUrl && (
            <Link onClick={() => setMobileMenuOpen(false)} className="block text-secondary font-medium hover:text-primary py-1.5" to={firstChapterUrl}>
              Chapter 1
            </Link>
          )}
          {latestChapterUrl && (
            <Link onClick={() => setMobileMenuOpen(false)} className="block text-secondary font-medium hover:text-primary py-1.5" to={latestChapterUrl}>
              Latest Chapter
            </Link>
          )}
          {merchUrl && (
            <a onClick={() => setMobileMenuOpen(false)} className="block text-secondary font-medium hover:text-primary py-1.5" href={merchUrl} target="_blank" rel="noopener noreferrer">
              {merchTitle || 'Merchandise'}
            </a>
          )}
        </div>
      )}
    </header>
  )
}
