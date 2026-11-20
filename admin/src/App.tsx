import { Route, Routes } from 'react-router-dom'
import RequireAdmin from './components/RequireAdmin'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Placeholder from './pages/Placeholder'
import Settings from './pages/Settings'
import Profile from './pages/Profile'
import About from './pages/About'
import Projects from './pages/Projects'
import ProjectEditor from './pages/ProjectEditor'
import Skills from './pages/Skills'
import Education from './pages/Education'
import Certifications from './pages/Certifications'
import Publications from './pages/Publications'
import { NAV } from './nav'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<RequireAdmin />}>
        <Route element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="settings" element={<Settings />} />
          <Route path="profile" element={<Profile />} />
          <Route path="about" element={<About />} />
          <Route path="projects" element={<Projects />} />
          <Route path="projects/new" element={<ProjectEditor />} />
          <Route path="projects/:id" element={<ProjectEditor />} />
          <Route path="skills" element={<Skills />} />
          <Route path="education" element={<Education />} />
          <Route path="certifications" element={<Certifications />} />
          <Route path="publications" element={<Publications />} />
          {NAV.filter(
            (n) =>
              n.to !== '/' &&
              n.to !== '/settings' &&
              n.to !== '/profile' &&
              n.to !== '/about' &&
              n.to !== '/projects' &&
              n.to !== '/skills' &&
              n.to !== '/education' &&
              n.to !== '/certifications' &&
              n.to !== '/publications'
          ).map((n) => (
            <Route key={n.to} path={n.to.slice(1)} element={<Placeholder title={n.label} />} />
          ))}
        </Route>
      </Route>
    </Routes>
  )
}
