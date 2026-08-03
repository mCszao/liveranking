import { ICONS, DEFAULT_ICON } from '../icons.js'

const DEFAULT_BG = { mode: 'gradient', color1: '#dc2626', color2: '#111114', angle: 135 }

export function cssBackground(iconBg) {
  const bg = iconBg || DEFAULT_BG
  if (bg.mode === 'gradient') {
    return `linear-gradient(${bg.angle ?? 135}deg, ${bg.color1 || '#dc2626'}, ${bg.color2 || '#111114'})`
  }
  return bg.color1 || '#dc2626'
}

export function iconSvg(iconName) {
  return ICONS[iconName] || ICONS[DEFAULT_ICON]
}

export function iconBadgeHTML(competition, extraClass = '') {
  const svg = iconSvg(competition?.icon)
  const bg = cssBackground(competition?.iconBg)
  return `<div class="icon-badge ${extraClass}" style="background:${bg}">${svg}</div>`
}

export function competitionNameHTML(competition) {
  const stage = competition?.stage ? `<div class="competition-list-stage">${competition.stage}</div>` : ''
  return `
    <div class="competition-list-name">
      <div class="competition-list-title">${competition?.name || '(sem nome)'}</div>
      ${stage}
    </div>
  `
}
