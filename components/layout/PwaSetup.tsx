'use client'

import { useEffect, useState } from 'react'
import { Bell, BellRing, X, Share, Plus } from 'lucide-react'

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ''

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)))
}

type View = 'hidden' | 'enable' | 'denied' | 'install-ios'

export default function PwaSetup() {
  const [pushSupported, setPushSupported] = useState(false)
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const [subscribed, setSubscribed] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const [loading, setLoading] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const ua = navigator.userAgent
    const ios = /iphone|ipad|ipod/i.test(ua)
    // No iOS, `navigator.standalone`; nos demais, display-mode standalone
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true
    setIsIOS(ios)
    setIsStandalone(standalone)

    const hasPush =
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window

    if (hasPush) {
      setPushSupported(true)
      setPermission(Notification.permission)
      navigator.serviceWorker.register('/sw.js').then(async reg => {
        const sub = await reg.pushManager.getSubscription()
        if (sub) {
          setSubscribed(true)
          const json = sub.toJSON()
          fetch('/api/push/subscribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...json, userAgent: navigator.userAgent }),
          }).catch(() => {})
        }
      }).catch(() => {})
    }

    // Pequeno atraso só para não aparecer abruptamente ao abrir
    const t = setTimeout(() => setReady(true), 800)
    return () => clearTimeout(t)
  }, [])

  async function subscribe() {
    setLoading(true)
    try {
      const reg = await navigator.serviceWorker.ready
      const perm = await Notification.requestPermission()
      setPermission(perm)
      if (perm !== 'granted') { setLoading(false); return }

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
    } catch {
      // silencioso
    } finally {
      setLoading(false)
    }
  }

  // Decide qual aviso mostrar
  let view: View = 'hidden'
  if (ready && !subscribed && !dismissed) {
    if (isIOS && !isStandalone) view = 'install-ios'      // precisa instalar pelo Safari primeiro
    else if (pushSupported && permission === 'denied') view = 'denied'
    else if (pushSupported && permission !== 'granted') view = 'enable'
    else if (pushSupported && permission === 'granted') view = 'enable' // permitido mas ainda não inscrito
  }

  // Sino flutuante: reabre o aviso a qualquer momento se ainda não estiver inscrito
  const showFloatingBell = ready && !subscribed && dismissed && (pushSupported || isIOS)

  return (
    <>
      {view !== 'hidden' && (
        <div className="fixed bottom-20 md:bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50 bg-slate-900 dark:bg-slate-800 text-white rounded-xl shadow-2xl border border-indigo-500/30 p-4 flex items-start gap-3">
          <div className="w-9 h-9 rounded-full bg-indigo-600/20 flex items-center justify-center flex-shrink-0">
            <BellRing className="w-4 h-4 text-indigo-400" />
          </div>

          <div className="flex-1 min-w-0">
            {view === 'enable' && (
              <>
                <p className="text-sm font-semibold">Ativar notificações</p>
                <p className="text-xs text-slate-400 mt-0.5">Receba avisos de tarefas, prazos e menções direto no celular.</p>
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={subscribe}
                    disabled={loading}
                    className="flex-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-60"
                  >
                    {loading ? 'Ativando...' : 'Ativar notificações'}
                  </button>
                  <button onClick={() => setDismissed(true)} className="px-3 py-1.5 text-slate-400 hover:text-white text-xs rounded-lg transition-colors">
                    Agora não
                  </button>
                </div>
              </>
            )}

            {view === 'denied' && (
              <>
                <p className="text-sm font-semibold">Notificações bloqueadas</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  Você bloqueou as notificações. Para reativar: <strong>Ajustes do iPhone → MW Tasks → Notificações</strong> (ou nas configurações do navegador no PC).
                </p>
                <button onClick={() => setDismissed(true)} className="mt-3 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-xs font-medium rounded-lg transition-colors">
                  Entendi
                </button>
              </>
            )}

            {view === 'install-ios' && (
              <>
                <p className="text-sm font-semibold">Instale o app para receber avisos</p>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  No iPhone, abra pelo <strong>Safari</strong>, toque em <Share className="inline w-3 h-3" /> <strong>Compartilhar</strong> e depois em <Plus className="inline w-3 h-3" /> <strong>“Adicionar à Tela de Início”</strong>. Abra o app pelo ícone e ative as notificações.
                </p>
                <button onClick={() => setDismissed(true)} className="mt-3 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-xs font-medium rounded-lg transition-colors">
                  Entendi
                </button>
              </>
            )}
          </div>

          <button onClick={() => setDismissed(true)} className="text-slate-500 hover:text-white flex-shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Sino flutuante — reabre o aviso quando dispensado e ainda não inscrito */}
      {showFloatingBell && (
        <button
          onClick={() => setDismissed(false)}
          title="Ativar notificações"
          className="fixed bottom-20 md:bottom-4 right-4 z-40 w-11 h-11 rounded-full bg-indigo-600 hover:bg-indigo-700 shadow-lg flex items-center justify-center text-white transition-colors"
        >
          <Bell className="w-5 h-5" />
        </button>
      )}
    </>
  )
}
