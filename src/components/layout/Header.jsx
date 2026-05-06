import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Bell, Moon, Sun, Menu, Plus, X, Check, Wifi, WifiOff, Loader2 } from 'lucide-react'
import useStore from '@/store/useStore'
import { cn, formatDateTime } from '@/lib/utils'

export default function Header({ title }) {
  const navigate = useNavigate()
  const {
    darkMode, toggleDarkMode, toggleSidebar,
    notifications, markNotificationRead, markAllNotificationsRead,
    settings, appointments, demands, isOnline, syncing
  } = useStore()

  const [showSearch, setShowSearch] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [showNotifications, setShowNotifications] = useState(false)

  const unreadCount = notifications.filter(n => !n.read).length

  const searchResults = searchQuery.length > 1 ? [
    ...appointments.filter(a =>
      a.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.city?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.location?.toLowerCase().includes(searchQuery.toLowerCase())
    ).slice(0, 4).map(a => ({ ...a, _type: 'appointment', _label: 'Agenda' })),
    ...demands.filter(d =>
      d.person_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.neighborhood?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (d.tags || []).some(t => t.toLowerCase().includes(searchQuery.toLowerCase()))
    ).slice(0, 4).map(d => ({ ...d, _type: 'demand', _label: 'Demanda' })),
  ] : []

  const primaryColor = settings?.primary_color || '#1a3a6b'

  return (
    <header className={cn(
      'sticky top-0 z-30 flex items-center justify-between px-4 lg:px-6 h-16 border-b',
      darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
    )}>
      {/* Left */}
      <div className="flex items-center gap-3">
        <button
          onClick={toggleSidebar}
          className={cn('p-2 rounded-lg lg:hidden transition-colors', darkMode ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-500')}
        >
          <Menu size={20} />
        </button>
        <h1 className={cn('text-lg font-semibold', darkMode ? 'text-white' : 'text-gray-900')}>
          {title}
        </h1>
      </div>

      {/* Right */}
      <div className="flex items-center gap-2">
        {/* Online indicator */}
        <div
          className={cn(
            'hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium',
            syncing
              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
              : isOnline
                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
          )}
          title={isOnline ? 'Sincronizado com Supabase' : 'Modo offline (localStorage)'}
        >
          {syncing ? (
            <><Loader2 size={11} className="animate-spin" /> Sincronizando</>
          ) : isOnline ? (
            <><Wifi size={11} /> Online</>
          ) : (
            <><WifiOff size={11} /> Offline</>
          )}
        </div>

        {/* Search */}
        <div className="relative">
          {showSearch ? (
            <div className="flex items-center">
              <div className={cn(
                'relative flex items-center rounded-lg border',
                darkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'
              )}>
                <Search size={16} className="absolute left-3 text-gray-400" />
                <input
                  autoFocus
                  type="text"
                  placeholder="Buscar agendas, demandas..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className={cn(
                    'pl-9 pr-4 py-2 text-sm rounded-lg bg-transparent outline-none w-64',
                    darkMode ? 'text-white placeholder-gray-400' : 'text-gray-900'
                  )}
                />
                <button
                  onClick={() => { setShowSearch(false); setSearchQuery('') }}
                  className="p-1 mr-1 rounded text-gray-400 hover:text-gray-600"
                >
                  <X size={14} />
                </button>
              </div>
              {searchResults.length > 0 && (
                <div className={cn(
                  'absolute top-full mt-1 right-0 w-80 rounded-xl shadow-lg border overflow-hidden z-50',
                  darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
                )}>
                  {searchResults.map(r => (
                    <button
                      key={r.id}
                      onClick={() => {
                        navigate(r._type === 'appointment' ? `/agenda/${r.id}` : `/demandas/${r.id}`)
                        setShowSearch(false)
                        setSearchQuery('')
                      }}
                      className={cn(
                        'w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-gray-50 transition-colors border-b last:border-0',
                        darkMode ? 'hover:bg-gray-700 border-gray-700' : ''
                      )}
                    >
                      <span
                        className="text-xs px-2 py-0.5 rounded-full font-medium mt-0.5 flex-shrink-0"
                        style={{ backgroundColor: primaryColor + '20', color: primaryColor }}
                      >
                        {r._label}
                      </span>
                      <div className="min-w-0">
                        <p className={cn('text-sm font-medium truncate', darkMode ? 'text-white' : 'text-gray-900')}>
                          {r.title || r.person_name}
                        </p>
                        <p className="text-xs text-gray-400 truncate">
                          {r.city || r.neighborhood || r.date}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={() => setShowSearch(true)}
              className={cn('p-2 rounded-lg transition-colors', darkMode ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-500')}
            >
              <Search size={20} />
            </button>
          )}
        </div>

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className={cn('p-2 rounded-lg transition-colors relative', darkMode ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-500')}
          >
            <Bell size={20} />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-red-500 text-white text-xs flex items-center justify-center font-bold">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className={cn(
              'absolute top-full right-0 mt-1 w-80 rounded-xl shadow-lg border overflow-hidden z-50',
              darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
            )}>
              <div className={cn('flex items-center justify-between px-4 py-3 border-b', darkMode ? 'border-gray-700' : 'border-gray-100')}>
                <span className={cn('font-semibold text-sm', darkMode ? 'text-white' : 'text-gray-900')}>Notificações</span>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllNotificationsRead}
                    className="text-xs text-blue-500 hover:text-blue-600 flex items-center gap-1"
                  >
                    <Check size={12} /> Marcar todas
                  </button>
                )}
              </div>
              <div className="max-h-72 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="px-4 py-8 text-center">
                    <Bell size={24} className="mx-auto text-gray-300 mb-2" />
                    <p className="text-sm text-gray-400">Nenhuma notificação</p>
                  </div>
                ) : (
                  notifications.slice(0, 10).map(n => (
                    <button
                      key={n.id}
                      onClick={() => markNotificationRead(n.id)}
                      className={cn(
                        'w-full text-left px-4 py-3 flex gap-3 hover:bg-gray-50 border-b last:border-0 transition-colors',
                        !n.read && (darkMode ? 'bg-blue-900/20' : 'bg-blue-50'),
                        darkMode ? 'hover:bg-gray-700 border-gray-700' : 'border-gray-50'
                      )}
                    >
                      {!n.read && <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 flex-shrink-0" />}
                      <div className={cn(!n.read ? '' : 'pl-4')}>
                        <p className={cn('text-sm font-medium', darkMode ? 'text-white' : 'text-gray-900')}>{n.title}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{n.message}</p>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Dark mode */}
        <button
          onClick={toggleDarkMode}
          className={cn('p-2 rounded-lg transition-colors', darkMode ? 'hover:bg-gray-700 text-yellow-400' : 'hover:bg-gray-100 text-gray-500')}
        >
          {darkMode ? <Sun size={20} /> : <Moon size={20} />}
        </button>
      </div>
    </header>
  )
}
