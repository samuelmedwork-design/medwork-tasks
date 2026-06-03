'use client'

import { useEffect, useState } from 'react'
import { Bell, BellOff, X } from 'lucide-react'

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ''

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)))
}

export default function PwaSetup() {
  const [supported, setSupported] = useState(false)
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const [subscribed, setSubscribed] = useState(false)
  const [showBanner, setShowBanner] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return
    setSupported(true)
    setPermission(Notification.permission)

    navigator.serviceWorker.register('/sw.js').then(async reg => {
      const sub = await reg.pushManager.getSubscription()
      if (sub) {
        setSubscribed(true)
        // Sync subscription with server
        const json = sub.toJSON()
        fetch('/api/push/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...json, userAgent: navigator.userAgent }),
        })
      } else if (Notification.permission === 'default') {
        // Show banner after 3s to ask permission
        setTimeout(() => setShowBanner(true), 3000)
      }
    })
  }, [])

  async function subscribe() {
    setLoading(true)
    try {
      const reg = await navigator.serviceWorker.ready
      const perm = await Notification.requestPermission()
      setPermission(perm)
      if (perm !== 'granted') { setShowBanner(false); setLoading(false); return }

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      })

      const json = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } }
      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...json, userAgent: navigator.userAgent }),
      })

      setSubscribed(true)
      setShowBanner(false)
    } finally {
      setLoading(false)
    }
  }

  async function unsubscribe() {
    const reg = await navigator.serviceWorker.ready
    const sub = await reg.pushManager.getSubscription()
    if (!sub) return
    await fetch('/api/push/subscribe', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endpoint: sub.endpoint }),
    })
    await sub.unsubscribe()
    setSubscribed(false)
  }

  if (!supported) return null

  return (
    <>
      {/* Banner de permissão */}
      {showBanner && !subscribed && permission === 'default' && (
        <div className="fixed bottom-20 md:bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-80 z-50 bg-slate-900 dark:bg-slate-800 text-white rounded-xl shadow-2xl border border-indigo-500/30 p-4 flex items-start gap-3 animate-in slide-in-from-bottom-4">
          <div className="w-9 h-9 rounded-full bg-indigo-600/20 flex items-center justify-center flex-shrink-0">
            <Bell className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold">Ativar notificações</p>
            <p className="text-xs text-slate-400 mt-0.5">Receba avisos de tarefas no celular mesmo com o app fechado.</p>
            <div className="flex gap-2 mt-3">
              <button
                onClick={subscribe}
                disabled={loading}
                className="flex-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-60"
              >
                {loading ? 'Ativando...' : 'Ativar'}
              </button>
              <button
                onClick={() => setShowBanner(false)}
                className="px-3 py-1.5 text-slate-400 hover:text-white text-xs rounded-lg transition-colors"
              >
                Agora não
              </button>
            </div>
          </div>
          <button onClick={() => setShowBanner(false)} className="text-slate-500 hover:text-white flex-shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Botão compacto de toggle (aparece no canto se já tiver decidido) */}
      {permission !== 'default' && !showBanner && (
        <button
          onClick={subscribed ? unsubscribe : subscribe}
          title={subscribed ? 'Desativar notificações push' : 'Ativar notificações push'}
          className="fixed bottom-20 md:bottom-4 right-4 z-40 w-10 h-10 rounded-full bg-slate-800 dark:bg-slate-700 border border-slate-700 shadow-lg flex items-center justify-center text-slate-400 hover:text-indigo-400 transition-colors md:hidden"
        >
          {subscribed ? <Bell className="w-4 h-4 text-indigo-400" /> : <BellOff className="w-4 h-4" />}
        </button>
      )}
    </>
  )
}
