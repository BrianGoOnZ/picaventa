import { useEffect, useRef } from 'react'

const EVENTOS_ACTIVIDAD = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart'] as const

export function useInactividad(activo: boolean, ms: number, alInactivo: () => void): void {
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!activo) {
      if (temporizador.current) clearTimeout(temporizador.current)
      return
    }

    function reiniciar(): void {
      if (temporizador.current) clearTimeout(temporizador.current)
      temporizador.current = setTimeout(alInactivo, ms)
    }

    reiniciar()
    EVENTOS_ACTIVIDAD.forEach((evento) => window.addEventListener(evento, reiniciar))

    return () => {
      if (temporizador.current) clearTimeout(temporizador.current)
      EVENTOS_ACTIVIDAD.forEach((evento) => window.removeEventListener(evento, reiniciar))
    }
  }, [activo, ms, alInactivo])
}
