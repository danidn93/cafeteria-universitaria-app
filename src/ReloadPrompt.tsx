// src/ReloadPrompt.tsx
import { useRegisterSW } from 'virtual:pwa-register/react'
import { useEffect } from 'react'

function ReloadPrompt() {
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      console.log('SW Registered')
    },
    onRegisterError(error) {
      console.error('SW registration error', error)
    },
  })

  useEffect(() => {
    if (needRefresh) {
      // Esta línea es la que hace la magia:
      // Si detecta una nueva versión, actualiza el SW y recarga la página
      updateServiceWorker(true)
    }
  }, [needRefresh, updateServiceWorker])

  return null // No necesita renderizar nada visual si quieres que sea automático
}

export default ReloadPrompt