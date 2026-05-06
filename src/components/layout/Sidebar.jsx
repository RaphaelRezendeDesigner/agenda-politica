import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, Calendar, FileText, Users, Settings,
  BookOpen, BarChart3, Image, ChevronLeft, ChevronRight,
  Shield, LogOut, Bell, Key
} from 'lucide-react'
import useStore from '@/store/useStore'
import { cn } from '@/lib/utils'

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/agenda', icon: Calendar, label: 'Agenda' },
  { to: '/demandas', icon: FileText, label: 'Demandas' },
  { to: '/observacoes', icon: BookOpen, label: 'Observações' },
  { to: '/relatorios', icon: BarChart3, label: 'Relatórios' },
  { to: '/arte', icon: Image, label: 'Gerar Arte' },
  { to: '/equipe', icon: Users, label: 'Equipe' },
  { to: '/codigos', icon: Key, label: 'Códigos de Convite', adminOnly: true },
  { to: '/configuracoes', icon: Settings, label: 'Configurações' },
]

export default function Sidebar() {
  const { sidebarOpen, toggleSidebar, settings, currentUser, logout, darkMode } = useStore()
  const location = useLocation()

  const primaryColor = settings?.primary_color || '#1a3a6b'
  const secondaryColor = settings?.secondary_color || '#c9a84c'

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 h-full z-40 flex flex-col transition-all duration-300 shadow-xl',
        sidebarOpen ? 'w-64 translate-x-0' : 'w-16 -translate-x-full lg:translate-x-0',
        darkMode ? 'bg-gray-900' : 'text-white'
      )}
      style={{ backgroundColor: primaryColor }}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/10">
        {sidebarOpen && (
          <div className="flex items-center gap-2 overflow-hidden">
            {settings?.logo_url ? (
              <img src={settings.logo_url} alt="Logo" className="w-8 h-8 rounded-full object-cover" />
            ) : (
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                style={{ backgroundColor: secondaryColor, color: primaryColor }}
              >
                {settings?.candidate_name?.charAt(0) || 'A'}
              </div>
            )}
            <div className="min-w-0">
              <p className="text-white text-xs font-semibold truncate leading-tight">
                {settings?.candidate_name || 'Agenda Política'}
              </p>
              <p className="text-white/50 text-xs truncate">Sistema de Agenda</p>
            </div>
          </div>
        )}
        <button
          onClick={toggleSidebar}
          className="flex-shrink-0 p-1 rounded-lg hover:bg-white/10 transition-colors text-white/70 hover:text-white"
        >
          {sidebarOpen ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 overflow-y-auto">
        {navItems.filter(item => !item.adminOnly || currentUser?.access_level === 'admin').map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) => cn(
              'flex items-center gap-3 px-4 py-3 mx-2 rounded-lg transition-all duration-150 group relative',
              isActive
                ? 'text-white'
                : 'text-white/60 hover:text-white hover:bg-white/10'
            )}
            style={({ isActive }) => isActive ? { backgroundColor: secondaryColor + '33' } : {}}
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <div
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full"
                    style={{ backgroundColor: secondaryColor }}
                  />
                )}
                <Icon
                  size={20}
                  className={cn('flex-shrink-0 transition-colors', isActive ? 'text-white' : '')}
                  style={isActive ? { color: secondaryColor } : {}}
                />
                {sidebarOpen && (
                  <span className="text-sm font-medium truncate">{label}</span>
                )}
                {!sidebarOpen && (
                  <div className="absolute left-16 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                    {label}
                  </div>
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User / Logout */}
      <div className="border-t border-white/10 p-3">
        {sidebarOpen ? (
          <div className="space-y-1">
            <div className="flex items-center gap-2 px-2 py-2">
              <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                {currentUser?.name?.charAt(0) || 'U'}
              </div>
              <div className="min-w-0">
                <p className="text-white text-xs font-medium truncate">{currentUser?.name}</p>
                <p className="text-white/50 text-xs truncate capitalize">{currentUser?.access_level}</p>
              </div>
            </div>
            <button
              onClick={logout}
              className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors text-sm"
            >
              <LogOut size={16} />
              <span>Sair</span>
            </button>
          </div>
        ) : (
          <button
            onClick={logout}
            className="flex items-center justify-center w-full py-2 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors"
          >
            <LogOut size={18} />
          </button>
        )}
      </div>
    </aside>
  )
}
