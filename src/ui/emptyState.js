import { ICONS } from '../icons.js'

export function emptyStateHTML({ icon, title, subtitle, actionable = false }) {
  const svg = ICONS[icon] || ''
  const subtitleHTML = subtitle ? `<p>${subtitle}</p>` : ''
  return `
    <div class="empty-state-icon${actionable ? ' clickable' : ''}">${svg}</div>
    <p class="empty-state-title">${title}</p>
    ${subtitleHTML}
  `
}
