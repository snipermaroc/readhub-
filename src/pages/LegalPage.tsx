import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import DOMPurify from 'dompurify'
import MangaHeader from '@/components/MangaHeader'
import MangaFooter from '@/components/MangaFooter'
import { supabase } from '@/lib/mangahub-db'

type LegalKind = 'privacy' | 'cookies' | 'terms' | 'dmca' | 'contact'

const defaultPages: Record<LegalKind, { title: string; intro: string; sections: { heading: string; text: string }[] }> = {
  privacy: {
    title: 'Privacy Policy',
    intro: 'This Privacy Policy describes how this platform collects, uses, and discloses information when you visit our manga discovery portal and independent editions.',
    sections: [
      { heading: 'Information We Collect', text: 'We may collect information you provide directly, such as email addresses when registering an admin account or contacting support. When browsing, anonymous analytics metrics such as pages viewed, referrers, and device types may be logged.' },
      { heading: 'How We Use Information', text: 'Collected data is used solely to maintain platform operations, deliver manga content, monitor performance, and prevent unauthorized scraping or security incidents.' },
      { heading: 'Cookies and Tracking', text: 'We use local storage and essential cookies to remember your reading progress, chapter bookmarks, and light/dark theme preference. You can manage cookie settings through your browser.' },
      { heading: 'Data Retention and Rights', text: 'You have the right to request access to or deletion of your personal data. To exercise your rights, please reach out via our contact page.' },
    ],
  },
  cookies: {
    title: 'Cookie Policy',
    intro: 'This Cookie Policy explains how cookies and similar local storage mechanisms are utilized across this platform and affiliated manga editions.',
    sections: [
      { heading: 'Essential Cookies', text: 'These cookies are required for fundamental site functions such as theme preferences (dark mode), reader settings, and secure administrator authentication.' },
      { heading: 'Performance & Analytics', text: 'We may collect anonymous usage statistics to understand popular manga series, reader engagement, and server response times.' },
      { heading: 'Managing Preferences', text: 'You can control and disable cookies through your browser settings. Note that disabling essential cookies may impact chapter loading and preference saving.' },
    ],
  },
  terms: {
    title: 'Terms of Service',
    intro: 'Please read these Terms of Service carefully before accessing or using this portal and connected manga reader websites.',
    sections: [
      { heading: 'Acceptance of Terms', text: 'By accessing this portal or any affiliated manga site edition, you agree to comply with and be bound by these Terms of Service.' },
      { heading: 'Use of the Platform', text: 'You agree to use the service for personal, non-commercial reading purposes. Any automated scraping, excessive rate requesting, or attempt to disrupt service integrity is strictly prohibited.' },
      { heading: 'Intellectual Property', text: 'All manga titles, cover artwork, and illustrated works remain the property of their respective authors and publishers.' },
    ],
  },
  dmca: {
    title: 'DMCA Copyright Policy',
    intro: 'This platform respects the intellectual property rights of creators and complies with the Digital Millennium Copyright Act (DMCA).',
    sections: [
      { heading: 'Notice and Takedown', text: 'If you are a copyright owner or an agent thereof and believe that any content hosted or indexed on our network infringes your copyright, you may submit a formal notification.' },
      { heading: 'Required Information', text: 'Your notice must include identification of the copyrighted work, URL location of the infringing material, your contact information, a statement of good faith belief, and a physical or electronic signature.' },
      { heading: 'Contact Agent', text: 'Notices should be sent to the designated DMCA representative via our contact channels with all required documentation.' },
    ],
  },
  contact: {
    title: 'Contact Us',
    intro: 'Have questions, suggestions, or need assistance? Get in touch with our team.',
    sections: [
      { heading: 'General Inquiries', text: 'For questions regarding manga editions, feature requests, or general support, please reach out via the contact form.' },
      { heading: 'Publishers & Creators', text: 'If you are an independent creator or publisher interested in launching an edition on this platform, contact our team to get started.' },
    ],
  },
}

export default function LegalPage({ kind = 'privacy' }: { kind?: LegalKind }) {
  const [customHtml, setCustomHtml] = useState<string | null>(null)
  const [brandName, setBrandName] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    const loadLegalContent = async () => {
      try {
        const { data } = await supabase
          .from('site_settings')
          .select('value')
          .eq('setting_key', 'homepage_design')
          .is('site_id', null)
          .maybeSingle()

        if (!alive) return

        if (data?.value) {
          const config = data.value
          if (config.brandName) {
            setBrandName(config.brandName)
          }

          // Map dynamic legal keys
          let mappedHtml = ''
          if (kind === 'privacy') mappedHtml = config.legalPrivacy || ''
          else if (kind === 'terms') mappedHtml = config.legalTerms || ''
          else if (kind === 'dmca') mappedHtml = config.legalDmca || ''
          else if (kind === 'cookies') mappedHtml = config.legalCookies || ''
          else if (kind === 'contact') mappedHtml = config.legalContact || ''

          if (mappedHtml && mappedHtml.trim()) {
            setCustomHtml(mappedHtml)
          }
        }
      } catch (err) {
        console.error('Failed to load dynamic legal pages:', err)
      } finally {
        if (alive) setLoading(false)
      }
    }

    void loadLegalContent()
    return () => {
      alive = false
    }
  }, [kind])

  const defaultPage = defaultPages[kind] || defaultPages.privacy

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#090b11] text-slate-900 dark:text-slate-100 flex flex-col">
      <MangaHeader siteName={brandName} />

      <main className="pt-24 pb-20 max-w-3xl mx-auto px-6 md:px-8 flex-1 w-full space-y-6">
        {/* Page Header */}
        <div className="border-b border-slate-200 dark:border-slate-800 pb-4">
          <span className="text-[11px] font-bold tracking-[0.3em] uppercase text-emerald-500 mb-1.5 block">
            Legal & Support Policies
          </span>
          <h1 className="text-3xl md:text-4xl font-extrabold font-headline tracking-tight">
            {defaultPage.title}
          </h1>
          <p className="text-slate-400 text-xs mt-1">Last updated: {new Date().getFullYear()}</p>
        </div>

        {/* Content Card container */}
        <div className="bg-white dark:bg-[#0f121d] rounded-2xl p-6 md:p-8 shadow-sm border border-slate-200 dark:border-slate-850 prose dark:prose-invert max-w-none text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          {loading ? (
            <p className="text-center py-12 text-slate-400 font-medium">Loading content...</p>
          ) : customHtml ? (
            /* Render WYSIWYG HTML dynamic code safely */
            <div 
              className="space-y-4 wysiwyg-legal-container" 
              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(customHtml) }} 
            />
          ) : (
            /* Fallback to default structural legal contents */
            <>
              <p className="font-semibold text-slate-900 dark:text-white mb-6">{defaultPage.intro}</p>
              <div className="space-y-6">
                {defaultPage.sections.map(section => (
                  <section key={section.heading} className="space-y-2">
                    <h2 className="text-lg font-bold font-headline text-slate-900 dark:text-white">{section.heading}</h2>
                    <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">{section.text}</p>
                  </section>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Footer Policy Nav links */}
        <div className="pt-6 border-t border-slate-200 dark:border-slate-800 flex flex-wrap gap-4 text-xs font-bold text-slate-400 uppercase tracking-wider justify-center">
          <Link to="/privacy" className="hover:text-emerald-500 transition-colors">Privacy Policy</Link>
          <span className="text-slate-300 dark:text-slate-700">•</span>
          <Link to="/terms" className="hover:text-emerald-500 transition-colors">Terms of Service</Link>
          <span className="text-slate-300 dark:text-slate-700">•</span>
          <Link to="/dmca" className="hover:text-emerald-500 transition-colors">DMCA</Link>
          <span className="text-slate-300 dark:text-slate-700">•</span>
          <Link to="/cookies" className="hover:text-emerald-500 transition-colors">Cookie Policy</Link>
          <span className="text-slate-300 dark:text-slate-700">•</span>
          <Link to="/contact" className="hover:text-emerald-500 transition-colors">Contact Us</Link>
        </div>
      </main>

      <MangaFooter siteName={brandName} />
    </div>
  )
}
