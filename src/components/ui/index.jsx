import { cn } from '@/lib/utils'
import { X, ChevronDown, Loader2 } from 'lucide-react'
import { useEffect, useRef } from 'react'
import useStore from '@/store/useStore'

// Button
export function Button({ children, variant = 'primary', size = 'md', className, loading, ...props }) {
  const { settings, darkMode } = useStore()
  const primaryColor = settings?.primary_color || '#1a3a6b'

  const base = 'inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2'

  const sizes = {
    xs: 'px-2.5 py-1.5 text-xs',
    sm: 'px-3 py-2 text-sm',
    md: 'px-4 py-2.5 text-sm',
    lg: 'px-6 py-3 text-base',
  }

  const variants = {
    primary: 'text-white shadow-sm hover:opacity-90 active:opacity-80',
    secondary: cn('border font-medium', darkMode ? 'border-gray-600 text-gray-200 hover:bg-gray-700' : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50'),
    ghost: cn('hover:bg-gray-100 dark:hover:bg-gray-700', darkMode ? 'text-gray-300' : 'text-gray-700'),
    danger: 'bg-red-500 text-white hover:bg-red-600 shadow-sm',
    success: 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-sm',
  }

  return (
    <button
      className={cn(base, sizes[size], variants[variant], className)}
      style={variant === 'primary' ? { backgroundColor: primaryColor } : {}}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading && <Loader2 size={16} className="animate-spin" />}
      {children}
    </button>
  )
}

// Input
export function Input({ label, error, className, ...props }) {
  const { darkMode } = useStore()
  return (
    <div className="space-y-1">
      {label && <label className={cn('block text-sm font-medium', darkMode ? 'text-gray-300' : 'text-gray-700')}>{label}</label>}
      <input
        className={cn(
          'w-full px-3 py-2.5 rounded-lg border text-sm transition-colors outline-none',
          'focus:ring-2 focus:ring-offset-0',
          error
            ? 'border-red-500 focus:ring-red-200'
            : darkMode
              ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500 focus:ring-blue-900'
              : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-blue-100',
          className
        )}
        {...props}
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}

// Textarea
export function Textarea({ label, error, className, rows = 3, ...props }) {
  const { darkMode } = useStore()
  return (
    <div className="space-y-1">
      {label && <label className={cn('block text-sm font-medium', darkMode ? 'text-gray-300' : 'text-gray-700')}>{label}</label>}
      <textarea
        rows={rows}
        className={cn(
          'w-full px-3 py-2.5 rounded-lg border text-sm transition-colors outline-none resize-y',
          'focus:ring-2 focus:ring-offset-0',
          error
            ? 'border-red-500 focus:ring-red-200'
            : darkMode
              ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500 focus:ring-blue-900'
              : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-blue-100',
          className
        )}
        {...props}
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}

// Select
export function Select({ label, error, options = [], placeholder = 'Selecione...', className, ...props }) {
  const { darkMode } = useStore()
  return (
    <div className="space-y-1">
      {label && <label className={cn('block text-sm font-medium', darkMode ? 'text-gray-300' : 'text-gray-700')}>{label}</label>}
      <select
        className={cn(
          'w-full px-3 py-2.5 rounded-lg border text-sm transition-colors outline-none',
          'focus:ring-2 focus:ring-offset-0',
          error
            ? 'border-red-500 focus:ring-red-200'
            : darkMode
              ? 'bg-gray-700 border-gray-600 text-white focus:border-blue-500 focus:ring-blue-900'
              : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500 focus:ring-blue-100',
          className
        )}
        {...props}
      >
        <option value="">{placeholder}</option>
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}

// Card
export function Card({ children, className, padding = true, ...props }) {
  const { darkMode } = useStore()
  return (
    <div
      className={cn(
        'rounded-xl border shadow-sm',
        padding ? 'p-5' : '',
        darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

// Badge
export function Badge({ children, color, bg, className }) {
  return (
    <span
      className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium', className)}
      style={{ color, backgroundColor: bg }}
    >
      {children}
    </span>
  )
}

// Modal
export function Modal({ open, onClose, title, children, size = 'md' }) {
  const { darkMode } = useStore()
  const overlayRef = useRef()

  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!open) return null

  const sizes = {
    sm: 'max-w-md',
    md: 'max-w-2xl',
    lg: 'max-w-4xl',
    xl: 'max-w-6xl',
    full: 'max-w-full mx-4',
  }

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in"
      onClick={e => e.target === overlayRef.current && onClose()}
    >
      <div className={cn(
        'w-full rounded-2xl shadow-2xl flex flex-col max-h-[90vh] animate-slide-in',
        sizes[size],
        darkMode ? 'bg-gray-800' : 'bg-white'
      )}>
        <div className={cn('flex items-center justify-between px-6 py-4 border-b', darkMode ? 'border-gray-700' : 'border-gray-100')}>
          <h2 className={cn('text-lg font-semibold', darkMode ? 'text-white' : 'text-gray-900')}>{title}</h2>
          <button
            onClick={onClose}
            className={cn('p-1.5 rounded-lg transition-colors', darkMode ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-400 hover:text-gray-600')}
          >
            <X size={18} />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 px-6 py-5">
          {children}
        </div>
      </div>
    </div>
  )
}

// Stats Card
export function StatsCard({ icon: Icon, label, value, sub, color, trend }) {
  const { darkMode } = useStore()
  return (
    <Card className={cn('flex items-start gap-4')}>
      <div className="p-3 rounded-xl flex-shrink-0" style={{ backgroundColor: color + '20' }}>
        <Icon size={22} style={{ color }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className={cn('text-sm', darkMode ? 'text-gray-400' : 'text-gray-500')}>{label}</p>
        <p className={cn('text-2xl font-bold mt-0.5', darkMode ? 'text-white' : 'text-gray-900')}>{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
      </div>
    </Card>
  )
}

// Empty State
export function EmptyState({ icon: Icon, title, description, action }) {
  const { darkMode } = useStore()
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className={cn('p-4 rounded-full mb-4', darkMode ? 'bg-gray-700' : 'bg-gray-100')}>
        <Icon size={32} className="text-gray-400" />
      </div>
      <h3 className={cn('text-base font-semibold mb-1', darkMode ? 'text-gray-200' : 'text-gray-700')}>{title}</h3>
      {description && <p className="text-sm text-gray-400 max-w-xs">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

// Tag
export function Tag({ children, onClick, removable, onRemove }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
        onClick && 'cursor-pointer hover:bg-blue-200 transition-colors'
      )}
      onClick={onClick}
    >
      {children}
      {removable && (
        <button onClick={e => { e.stopPropagation(); onRemove?.() }} className="hover:text-blue-900">
          <X size={10} />
        </button>
      )}
    </span>
  )
}

// Confirm Dialog
export function ConfirmDialog({ open, onClose, onConfirm, title, message, confirmLabel = 'Confirmar', danger = false }) {
  if (!open) return null
  return (
    <Modal open={open} onClose={onClose} title={title} size="sm">
      <p className="text-sm text-gray-500 mb-6">{message}</p>
      <div className="flex gap-3 justify-end">
        <Button variant="secondary" onClick={onClose}>Cancelar</Button>
        <Button variant={danger ? 'danger' : 'primary'} onClick={() => { onConfirm(); onClose() }}>
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  )
}

// Section Header
export function SectionHeader({ title, action, subtitle }) {
  const { darkMode } = useStore()
  return (
    <div className="flex items-start justify-between gap-4 mb-6">
      <div>
        <h2 className={cn('text-xl font-bold', darkMode ? 'text-white' : 'text-gray-900')}>{title}</h2>
        {subtitle && <p className="text-sm text-gray-400 mt-0.5">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}
