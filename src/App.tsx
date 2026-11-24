import { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import RequireAdmin from './components/RequireAdmin'
import Layout from './components/Layout'

const Login = lazy(() => import('./pages/Login'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const Settings = lazy(() => import('./pages/Settings'))
const Profile = lazy(() => import('./pages/Profile'))
const About = lazy(() => import('./pages/About'))
const Projects = lazy(() => import('./pages/Projects'))
const ProjectEditor = lazy(() => import('./pages/ProjectEditor'))
const Skills = lazy(() => import('./pages/Skills'))
const Education = lazy(() => import('./pages/Education'))
const Certifications = lazy(() => import('./pages/Certifications'))
const Publications = lazy(() => import('./pages/Publications'))
const Sections = lazy(() => import('./pages/Sections'))
const Theme = lazy(() => import('./pages/Theme'))
const Messages = lazy(() => import('./pages/Messages'))
const NotFound = lazy(() => import('./pages/NotFound'))

function PageFallback() {
  return (
    <div className="flex items-center justify-center p-16 gap-3 text-muted font-mono text-xs">
      <Loader2 className="size-5 animate-spin text-accent" />
      <span>Loading…</span>
    </div>
  )
}

export default function App() {
  return (
    <Suspense fallback={<PageFallback />}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<RequireAdmin />}>
          <Route element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="settings" element={<Settings />} />
            <Route path="profile" element={<Profile />} />
            <Route path="about" element={<About />} />
            <Route path="sections" element={<Sections />} />
            <Route path="projects" element={<Projects />} />
            <Route path="projects/new" element={<ProjectEditor />} />
            <Route path="projects/:id" element={<ProjectEditor />} />
            <Route path="skills" element={<Skills />} />
            <Route path="education" element={<Education />} />
            <Route path="certifications" element={<Certifications />} />
            <Route path="publications" element={<Publications />} />
            <Route path="theme" element={<Theme />} />
            <Route path="messages" element={<Messages />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  )
}
