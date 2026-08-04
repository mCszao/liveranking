import { ICONS } from '../icons.js'

export function loadingStateHTML({ icon, title = 'Carregando...' }) {
  const svg = ICONS[icon] || ''
  return `
    <div class="loading-state-icon">${svg}</div>
    <p class="empty-state-title">${title}</p>
  `
}
