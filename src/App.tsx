import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { BrowserRouter, Route, Routes } from "react-router-dom"
import { Toaster as Sonner } from "@/components/ui/sonner"
import { Toaster } from "@/components/ui/toaster"
import { TooltipProvider } from "@/components/ui/tooltip"
import ScrollToTop from "./components/ScrollToTop"
import Index from "./pages/Index"
import MangaNicheSite from "./pages/MangaNicheSite"
import ChapterReader from "./pages/ChapterReader"
import NotFound from "./pages/NotFound"
import Login from "./pages/Login"
import Admin from "./pages/Admin"
import CreateWizard from "./pages/CreateWizard"
import ExamplePrompt from "./pages/ExamplePrompt"
import DriveToCSV from "./pages/DriveToCSV"
import PopularManager from "./pages/PopularManager"
import LogsPage from "./pages/LogsPage"
import ProtectedRoute from "./components/ProtectedRoute"
import LegalPage from "./pages/LegalPage"
import { ThemeProvider } from "./components/ThemeProvider"
import { FloatingChatbot } from "./components/FloatingChatbot"

const queryClient = new QueryClient()

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="dark">
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <ScrollToTop />
          <Routes>
            {/* Central Portal */}
            <Route path="/" element={<Index />} />

            {/* Manga Niche / Subdomain Edition Pages */}
            <Route path="/site/:subdomain" element={<MangaNicheSite />} />
            <Route path="/edition/:slug" element={<MangaNicheSite />} />
            <Route path="/manga/:slug" element={<MangaNicheSite />} />
            <Route path="/sites/:slug" element={<MangaNicheSite />} />

            {/* Chapter Reader Routes */}
            <Route path="/chapter/:chapterSlug" element={<ChapterReader />} />
            <Route path="/manga/:mangaSlug/chapter/:chapterSlug" element={<ChapterReader />} />
            <Route path="/sites/:mangaSlug/chapter/:chapterSlug" element={<ChapterReader />} />

            {/* Auth — /hub instead of /login for security through obscurity */}
            <Route path="/hub" element={<Login />} />

            {/* Admin dashboard — /hub/dashboard instead of /admin */}
            <Route path="/hub/dashboard" element={<ProtectedRoute><Admin /></ProtectedRoute>} />
            <Route path="/hub/dashboard/traffic" element={<ProtectedRoute><Admin initialSection="traffic" /></ProtectedRoute>} />
            <Route path="/hub/dashboard/invoices" element={<ProtectedRoute><Admin initialSection="invoices" /></ProtectedRoute>} />
            <Route path="/hub/dashboard/importer" element={<ProtectedRoute><Admin initialSection="importer" /></ProtectedRoute>} />

            {/* Admin sub-tools */}
            <Route path="/hub/create" element={<ProtectedRoute><CreateWizard /></ProtectedRoute>} />
            <Route path="/hub/create/:id" element={<ProtectedRoute><CreateWizard /></ProtectedRoute>} />
            <Route path="/hub/ai-prompt" element={<ProtectedRoute><ExamplePrompt /></ProtectedRoute>} />
            <Route path="/hub/drive-csv" element={<ProtectedRoute><DriveToCSV /></ProtectedRoute>} />
            <Route path="/hub/popular/:id" element={<ProtectedRoute><PopularManager /></ProtectedRoute>} />
            <Route path="/hub/logs" element={<ProtectedRoute><LogsPage /></ProtectedRoute>} />

            {/* Legacy redirects — keep old paths working so existing links don't break */}
            <Route path="/login" element={<Login />} />
            <Route path="/admin" element={<ProtectedRoute><Admin /></ProtectedRoute>} />
            <Route path="/admin/traffic" element={<ProtectedRoute><Admin initialSection="traffic" /></ProtectedRoute>} />
            <Route path="/admin/invoices" element={<ProtectedRoute><Admin initialSection="invoices" /></ProtectedRoute>} />
            <Route path="/admin/importer" element={<ProtectedRoute><Admin initialSection="importer" /></ProtectedRoute>} />
            <Route path="/create" element={<ProtectedRoute><CreateWizard /></ProtectedRoute>} />
            <Route path="/create/:id" element={<ProtectedRoute><CreateWizard /></ProtectedRoute>} />
            <Route path="/drive-to-csv" element={<ProtectedRoute><DriveToCSV /></ProtectedRoute>} />
            <Route path="/popular/:id" element={<ProtectedRoute><PopularManager /></ProtectedRoute>} />
            <Route path="/logs" element={<ProtectedRoute><LogsPage /></ProtectedRoute>} />

            {/* Legal Pages */}
            <Route path="/privacy" element={<LegalPage kind="privacy" />} />
            <Route path="/cookies" element={<LegalPage kind="cookies" />} />
            <Route path="/terms" element={<LegalPage kind="terms" />} />
            <Route path="/dmca" element={<LegalPage kind="dmca" />} />
            <Route path="/contact" element={<LegalPage kind="contact" />} />

            {/* Catch-all 404 */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          <FloatingChatbot />
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
)

export default App
