import { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router-dom'
import { AppErrorBoundary } from './components/AppErrorBoundary'
import { Shell } from './components/Shell'
import { AuthProvider } from './lib/auth'
import { ExamPage } from './pages/ExamPage'
import { ResultPage } from './pages/ResultPage'

const HomePage = lazy(() => import('./pages/HomePage').then((module) => ({ default: module.HomePage })))
const LibraryPage = lazy(() => import('./pages/LibraryPage').then((module) => ({ default: module.LibraryPage })))
const LessonPage = lazy(() => import('./pages/LessonPage').then((module) => ({ default: module.LessonPage })))
const AssessPage = lazy(() => import('./pages/AssessPage').then((module) => ({ default: module.AssessPage })))
const LeaderboardPage = lazy(() => import('./pages/LeaderboardPage').then((module) => ({ default: module.LeaderboardPage })))
const ProfilePage = lazy(() => import('./pages/ProfilePage').then((module) => ({ default: module.ProfilePage })))

const loading = <div className="page centered-state"><span className="loading-mark" /><p>Opening the lab...</p></div>

export function App() {
  return (
    <AppErrorBoundary>
      <AuthProvider>
        <Suspense fallback={loading}>
          <Routes>
            <Route path="/exam/:mode" element={<ExamPage />} />
            <Route element={<Shell />}>
              <Route index element={<HomePage />} />
              <Route path="library" element={<LibraryPage />} />
              <Route path="lesson/:slug" element={<LessonPage />} />
              <Route path="assess" element={<AssessPage />} />
              <Route path="results/:id" element={<ResultPage />} />
              <Route path="leaderboard" element={<LeaderboardPage />} />
              <Route path="profile" element={<ProfilePage />} />
            </Route>
          </Routes>
        </Suspense>
      </AuthProvider>
    </AppErrorBoundary>
  )
}
