import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Sidebar from './Sidebar'
import Header from './Header'
import useStore from '@/store/useStore'
import { cn } from '@/lib/utils'

export default function Layout({ children, title = 'Agenda Política' }) {
  const { isAuthenticated, sidebarOpen, setSidebarOpen, darkMode } = useStore()
  const navigate = useNavigate()

  useEffect(() => {
    if (!isAuthenticated) navigate('/login')
  }, [isAuthenticated])

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [darkMode])

  // Em mobile, fechar sidebar por padrão
  useEffect(() => {
    if (window.innerWidth < 1024) setSidebarOpen(false)
  }, [])

  if (!isAuthenticated) return null

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 1024

  return (
    <div className={cn('min-h-screen flex', darkMode ? 'bg-gray-900' : 'bg-gray-50')}>
      {/* Backdrop em mobile quando sidebar aberto */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <Sidebar />

      <div
        className={cn(
          'flex-1 flex flex-col min-w-0 transition-all duration-300',
          sidebarOpen ? 'lg:ml-64' : 'lg:ml-16'
        )}
      >
        <Header title={title} />
        <main className="flex-1 p-4 lg:p-6 overflow-auto animate-fade-in">
          {children}
        </main>
      </div>
    </div>
  )
}
