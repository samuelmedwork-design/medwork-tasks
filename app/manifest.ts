import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'MedWork Tasks',
    short_name: 'MW Tasks',
    description: 'Sistema de controle de tarefas da equipe MedWork',
    start_url: '/',
    display: 'standalone',
    background_color: '#f8fafc',
    theme_color: '#6366f1',
    orientation: 'portrait',
    categories: ['productivity', 'business'],
    icons: [
      { src: '/logo.png', sizes: '192x192', type: 'image/png' },
      { src: '/logo.png', sizes: '512x512', type: 'image/png' },
      { src: '/logo.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    screenshots: [],
  }
}
