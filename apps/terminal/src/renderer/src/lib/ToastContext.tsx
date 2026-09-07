import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'

interface Toast {
  id: number
  mensaje: string
  tipo: 'exito' | 'error'
}

interface ToastContextValor {
  mostrarToast: (mensaje: string, tipo?: 'exito' | 'error') => void
}

const ToastContext = createContext<ToastContextValor | null>(null)

export function useToast(): ToastContextValor {
  const contexto = useContext(ToastContext)
  if (!contexto) throw new Error('useToast debe usarse dentro de <ToastProvider>')
  return contexto
}

let siguienteId = 1

export function ToastProvider({ children }: { children: ReactNode }): React.JSX.Element {
  const [toasts, setToasts] = useState<Toast[]>([])

  const mostrarToast = useCallback((mensaje: string, tipo: 'exito' | 'error' = 'exito') => {
    const id = siguienteId++
    setToasts((actual) => [...actual, { id, mensaje, tipo }])
    setTimeout(() => {
      setToasts((actual) => actual.filter((t) => t.id !== id))
    }, 3200)
  }, [])

  return (
    <ToastContext.Provider value={{ mostrarToast }}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[100] flex flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto animate-[toast-in_0.2s_ease-out] rounded-md px-4 py-2.5 text-sm font-medium text-white shadow-lg ${
              t.tipo === 'exito' ? 'bg-exito' : 'bg-peligro'
            }`}
          >
            {t.mensaje}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
