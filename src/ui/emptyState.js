import { ICONS } from '../icons.js'

export function emptyStateHTML({ icon, title, actionable = false }) {
  const svg = ICONS[icon] || ''
  return `
    <div class="empty-state-icon${actionable ? ' clickable' : ''}">${svg}</div>
    <p>${title}</p>
  `
}
