import * as competitionsService from './services/competitionsService.js'
import * as teamsService from './services/teamsService.js'
import * as scoresService from './services/scoresService.js'
import { iconBadgeHTML, iconSvg, cssBackground, competitionNameHTML } from './ui/badge.js'
import { emptyStateHTML } from './ui/emptyState.js'
import { loadingStateHTML } from './ui/loadingState.js'

const params = new URLSearchParams(location.search)
const competitionId = params.get('c')

const pickerView = document.getElementById('picker-view')
const rankingView = document.getElementById('ranking-view')

if (competitionId) {
  pickerView.style.display = 'none'
  rankingView.style.display = 'block'
  initRanking(competitionId)
} else {
  pickerView.style.display = 'block'
  initPicker()
}

// #region Competition picker

function initPicker() {
  const grid = document.getElementById('competition-grid')
  const empty = document.getElementById('picker-empty')

  // Show a loading state first, the query below decides between "empty" and the list.
  empty.innerHTML = loadingStateHTML({ icon: 'trophy', title: 'Carregando competições...' })
  empty.style.display = 'flex'

  competitionsService.watchCompetitions((data) => {
    const entries = Object.entries(data)

    if (entries.length) {
      empty.style.display = 'none'
    } else {
      empty.innerHTML = emptyStateHTML({
        icon: 'trophy',
        title: 'Sem competições ativas no momento',
        subtitle: 'Volte mais tarde para conferir o ranking.',
      })
      empty.style.display = 'flex'
    }
    grid.innerHTML = ''

    entries
      .sort((a, b) => (a[1]?.name || '').localeCompare(b[1]?.name || ''))
      .forEach(([id, competition]) => {
        const row = document.createElement('a')
        row.className = 'competition-list-row'
        row.href = `./?c=${id}`
        row.innerHTML = `
          ${iconBadgeHTML(competition, 'icon-badge-sm')}
          ${competitionNameHTML(competition)}
        `
        grid.appendChild(row)
      })
  })
}

// #endregion

// #region Live ranking board

function initRanking(competitionId) {
  const podiumSlots = Array.from(document.querySelectorAll('.podium-place')).reduce((acc, el) => {
    acc[el.dataset.slot] = el
    return acc
  }, {})
  const rankList = document.getElementById('rank-list')
  const emptyState = document.getElementById('empty-state')
  const podium = document.getElementById('podium')

  let teamsData = {}
  let scoresData = {}
  let teamsLoaded = false
  const previousScores = new Map()

  function computeTotals() {
    return Object.entries(teamsData)
      .map(([id, team]) => {
        const teamScores = scoresData[id] || {}
        const total = Object.values(teamScores).reduce((sum, v) => sum + (Number(v) || 0), 0)
        return {
          id,
          name: team?.name || '(sem nome)',
          total,
          disqualified: !!team?.disqualified,
          disqualifiedReason: team?.disqualifiedReason || '',
        }
      })
      .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name))
  }

  function animateCount(el, from, to, duration = 1600) {
    const start = performance.now()
    const diff = to - from
    if (diff === 0) {
      el.textContent = to
      return
    }
    function tick(now) {
      const t = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - t, 3)
      el.textContent = Math.round(from + diff * eased)
      if (t < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }

  function renderPodium(top3) {
    ;[1, 2, 3].forEach((slot) => {
      const el = podiumSlots[slot]
      const entry = top3[slot - 1]
      const nameEl = el.querySelector('[data-field="name"]')
      const scoreEl = el.querySelector('[data-field="score"]')

      if (!entry) {
        nameEl.textContent = '—'
        scoreEl.textContent = '0'
        el.style.opacity = '0.4'
        return
      }
      el.style.opacity = '1'
      nameEl.textContent = entry.name
      const prev = previousScores.has(entry.id) ? previousScores.get(entry.id) : entry.total
      animateCount(scoreEl, prev, entry.total)
    })
  }

  function renderList(rest) {
    const maxTotal = rest.length ? Math.max(1, ...rest.map((e) => e.total)) : 1

    const firstRects = new Map()
    Array.from(rankList.children).forEach((el) => {
      firstRects.set(el.dataset.id, el.getBoundingClientRect())
    })

    const existing = new Map()
    Array.from(rankList.children).forEach((el) => existing.set(el.dataset.id, el))

    rest.forEach((entry, idx) => {
      let el = existing.get(entry.id)
      if (!el) {
        el = document.createElement('div')
        el.className = 'rank-item'
        el.dataset.id = entry.id
        el.innerHTML = `
          <div class="rank-position"></div>
          <div class="rank-main">
            <div class="rank-name"></div>
            <div class="rank-bar-track"><div class="rank-bar-fill"></div></div>
          </div>
          <div class="rank-score"></div>
        `
      }
      el.querySelector('.rank-position').textContent = idx + 4
      el.querySelector('.rank-name').textContent = entry.name
      el.querySelector('.rank-bar-fill').style.width = `${(entry.total / maxTotal) * 100}%`

      const scoreEl = el.querySelector('.rank-score')
      const prev = previousScores.has(entry.id) ? previousScores.get(entry.id) : entry.total
      animateCount(scoreEl, prev, entry.total)

      rankList.appendChild(el)
    })

    existing.forEach((el, id) => {
      if (!rest.find((e) => e.id === id)) el.remove()
    })

    Array.from(rankList.children).forEach((el) => {
      const id = el.dataset.id
      const first = firstRects.get(id)
      if (!first) return
      const last = el.getBoundingClientRect()
      const deltaY = first.top - last.top
      if (deltaY) {
        el.style.transition = 'none'
        el.style.transform = `translateY(${deltaY}px)`
        requestAnimationFrame(() => {
          el.style.transition = 'transform 0.5s cubic-bezier(0.22, 1, 0.36, 1)'
          el.style.transform = ''
        })
      }
    })
  }

  function renderDisqualifiedSection(list) {
    const section = document.getElementById('disqualified-section')
    const container = document.getElementById('disqualified-list')

    if (!list.length) {
      section.style.display = 'none'
      return
    }

    section.style.display = 'block'
    container.innerHTML = ''
    list.forEach((entry) => {
      const row = document.createElement('div')
      row.className = 'dq-item'
      row.innerHTML = `
        <div class="dq-item-top">
          <span class="dq-item-name-group">
            <span class="dq-item-name">${entry.name}</span>
            <span class="dq-badge">Desclassificada</span>
          </span>
          <span class="dq-item-score">${entry.total}</span>
        </div>
        ${entry.disqualifiedReason ? `<div class="dq-item-reason">Motivo: ${entry.disqualifiedReason}</div>` : ''}
      `
      container.appendChild(row)
    })
  }

  function render() {
    if (!teamsLoaded) {
      emptyState.innerHTML = loadingStateHTML({ icon: 'users', title: 'Carregando equipes...' })
      emptyState.style.display = 'flex'
      podium.style.display = 'none'
      return
    }

    const totals = computeTotals()
    const qualified = totals.filter((entry) => !entry.disqualified)
    const disqualified = totals.filter((entry) => entry.disqualified)

    if (totals.length) {
      emptyState.style.display = 'none'
    } else {
      emptyState.innerHTML = emptyStateHTML({
        icon: 'users',
        title: 'Nenhuma equipe cadastrada ainda.',
        subtitle: 'Assim que o painel lançar os primeiros pontos, o ranking aparece aqui.',
      })
      emptyState.style.display = 'flex'
    }
    podium.style.display = qualified.length ? 'grid' : 'none'

    renderPodium(qualified.slice(0, 3))
    renderList(qualified.slice(3))
    renderDisqualifiedSection(disqualified)

    totals.forEach((entry) => previousScores.set(entry.id, entry.total))
  }

  // Show the loading state first, the queries below decide between "empty" and the list.
  render()

  competitionsService.watchCompetition(competitionId, (competition) => {
    document.getElementById('ranking-title').textContent = competition?.name || 'Competição'
    const stageEl = document.getElementById('ranking-stage')
    stageEl.textContent = competition?.stage || ''
    stageEl.style.display = competition?.stage ? 'block' : 'none'
    const badge = document.getElementById('ranking-badge')
    badge.style.background = cssBackground(competition?.iconBg)
    badge.innerHTML = iconSvg(competition?.icon)
  })

  teamsService.watchTeams(competitionId, (data) => {
    teamsData = data
    teamsLoaded = true
    render()
  })

  scoresService.watchScores(competitionId, (data) => {
    scoresData = data
    render()
  })
}

// #endregion
