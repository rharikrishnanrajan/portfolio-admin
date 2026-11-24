import {
  Award, BookOpen, FolderKanban, GraduationCap, Info, Layers, LayoutDashboard,
  Mail, Palette, Settings, Shield, User, Wrench, type LucideIcon,
} from 'lucide-react'

export const NAV: { to: string; label: string; icon: LucideIcon }[] = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/settings', label: 'Site & Hero', icon: Settings },
  { to: '/profile', label: 'Profile', icon: User },
  { to: '/about', label: 'About', icon: Info },
  { to: '/sections', label: 'Sections', icon: Layers },
  { to: '/projects', label: 'Projects', icon: FolderKanban },
  { to: '/skills', label: 'Skills', icon: Wrench },
  { to: '/education', label: 'Education', icon: GraduationCap },
  { to: '/certifications', label: 'Certifications', icon: Award },
  { to: '/publications', label: 'Publications', icon: BookOpen },
  { to: '/theme', label: 'Theme', icon: Palette },
  { to: '/messages', label: 'Messages', icon: Mail },
  { to: '/security', label: 'Security', icon: Shield },
]
