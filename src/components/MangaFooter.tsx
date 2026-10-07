import { Link } from 'react-router-dom'

interface FooterProps {
  siteName?: string
  description?: string
  firstChapterUrl?: string
  latestChapterUrl?: string
}

export default function MangaFooter({
  siteName = 'Read Berserk Manga Online',
  description = 'Your premier destination for reading manga chapters online with a smooth, optimized reader and fast updates.',
  firstChapterUrl = '/chapter/1',
  latestChapterUrl,
}: FooterProps) {
  return (
    <footer className="w-full border-t border-outline-variant/20 bg-[#F7F9FB] dark:bg-[#0a0c12] mt-16 text-on-surface">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8 px-6 md:px-8 py-12 max-w-screen-2xl mx-auto">
        {/* Brand Column */}
        <div className="col-span-1 sm:col-span-2 md:col-span-1">
          <span className="text-lg font-bold text-on-surface font-headline block">{siteName}</span>
          <p className="mt-3 text-secondary text-sm leading-relaxed">{description}</p>
        </div>

        {/* Reading Column */}
        <div>
          <div className="font-bold text-on-surface text-sm mb-4">Reading</div>
          <ul className="space-y-2 text-sm text-secondary">
            <li>
              <Link className="hover:text-primary transition-colors" to="/">
                Home
              </Link>
            </li>
            <li>
              <Link className="hover:text-primary transition-colors" to={firstChapterUrl}>
                Chapter 1
              </Link>
            </li>
            {latestChapterUrl && (
              <li>
                <Link className="hover:text-primary transition-colors" to={latestChapterUrl}>
                  Latest Chapter
                </Link>
              </li>
            )}
            <li>
              <a className="hover:text-primary transition-colors" href="/#catalogue">
                Catalogue
              </a>
            </li>
          </ul>
        </div>

        {/* Legal Column */}
        <div>
          <div className="font-bold text-on-surface text-sm mb-4">Legal</div>
          <ul className="space-y-2 text-sm text-secondary">
            <li>
              <Link className="hover:text-primary transition-colors" to="/privacy">
                Privacy Policy
              </Link>
            </li>
            <li>
              <Link className="hover:text-primary transition-colors" to="/terms">
                Terms of Service
              </Link>
            </li>
            <li>
              <Link className="hover:text-primary transition-colors" to="/dmca">
                DMCA
              </Link>
            </li>
            <li>
              <Link className="hover:text-primary transition-colors" to="/cookies">
                Cookie Policy
              </Link>
            </li>
            <li>
              <Link className="hover:text-primary transition-colors" to="/contact">
                Contact Us
              </Link>
            </li>
          </ul>
        </div>

        {/* Network Column */}
        <div>
          <div className="font-bold text-on-surface text-sm mb-4">Network</div>
          <ul className="space-y-2 text-sm text-secondary">
            <li>
              <a className="hover:text-primary transition-colors" href="/#editions">
                Manga Editions
              </a>
            </li>
          </ul>
        </div>
      </div>

      {/* Copyright Bar */}
      <div className="px-6 md:px-8 py-5 border-t border-outline-variant/10 max-w-screen-2xl mx-auto text-center">
        <p className="text-[10px] text-secondary font-medium tracking-widest uppercase">
          © {new Date().getFullYear()} {siteName}. All rights reserved.
        </p>
      </div>
    </footer>
  )
}
