import * as authService from './services/authService.js'
import * as competitionsService from './services/competitionsService.js'
import * as teamsService from './services/teamsService.js'
import * as testsService from './services/testsService.js'
import * as scoresService from './services/scoresService.js'
import { ICON_NAMES, DEFAULT_ICON } from './icons.js'
import { cssBackground, iconSvg, iconBadgeHTML, competitionNameHTML } from './ui/badge.js'
import { showToast } from './ui/toast.js'
import { emptyStateHTML } from './ui/emptyState.js'

const loginView = document.getElementById('login-view')
const adminShell = document.getElementById('admin-shell')
const competitionsView = document.getElementById('competitions-view')
const competitionFormView = document.getElementById('competition-form-view')
const manageView = document.getElementById('manage-view')
const loginForm = document.getElementById('login-form')
const loginError = document.getElementById('login-error')
const toastEl = document.getElementById('toast')

let competitionsData = {}
let teamsData = {}
let testsData = {}
let scoresData = {}

let currentCompetitionId = localStorage.getItem('lr_current_competition') || null
let editingCompetitionId = null
let selectedIcon = DEFAULT_ICON
let colorMode = 'gradient'

let competitionsUnsub = null
let manageUnsubs = []

function toast(message, isError = false) {
  showToast(toastEl, message, isError)
}

// #region Auth

authService.watchAuthState((user) => {
  if (user) {
    loginView.style.display = 'none'
    adminShell.style.display = 'block'
    subscribeCompetitionsList()
    if (currentCompetitionId) {
      showManageView()
      subscribeManageData(currentCompetitionId)
    } else {
      showCompetitionsView()
    }
  } else {
    loginView.style.display = 'flex'
    adminShell.style.display = 'none'
    unsubscribeCompetitionsList()
    unsubscribeManageData()
  }
})

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault()
  loginError.textContent = ''
  const email = document.getElementById('login-email').value.trim()
  const password = document.getElementById('login-password').value
  try {
    await authService.login(email, password)
  } catch (err) {
    loginError.textContent = 'Não foi possível entrar. Confira email e senha.'
  }
})

document.getElementById('logout-btn-1').addEventListener('click', () => authService.logout())
document.getElementById('logout-btn-2').addEventListener('click', () => authService.logout())

// #endregion

// #region View switching

function showCompetitionsView() {
  competitionFormView.style.display = 'none'
  manageView.style.display = 'none'
  competitionsView.style.display = 'block'
}

function showCompetitionFormView() {
  competitionsView.style.display = 'none'
  manageView.style.display = 'none'
  competitionFormView.style.display = 'block'
}

function showManageView() {
  competitionsView.style.display = 'none'
  competitionFormView.style.display = 'none'
  manageView.style.display = 'block'
}

// #endregion

// #region Competitions: list

const competitionsEmptyEl = document.getElementById('competitions-empty')
competitionsEmptyEl.innerHTML = emptyStateHTML({
  icon: 'trophy',
  title: 'Nenhuma competição cadastrada ainda. Clique para criar a primeira.',
  actionable: true,
})
competitionsEmptyEl.querySelector('.empty-state-icon').addEventListener('click', () => {
  resetForm()
  showCompetitionFormView()
})

// Render the empty state first, subscribeCompetitionsList() replaces it once the query resolves.
renderCompetitionsList()

function subscribeCompetitionsList() {
  if (competitionsUnsub) return
  competitionsUnsub = competitionsService.watchCompetitions((data) => {
    competitionsData = data
    renderCompetitionsList()
    if (currentCompetitionId && !competitionsData[currentCompetitionId]) {
      exitCompetition()
    }
  })
}

function unsubscribeCompetitionsList() {
  if (competitionsUnsub) {
    competitionsUnsub()
    competitionsUnsub = null
  }
}

function renderCompetitionsList() {
  const container = document.getElementById('competitions-list')
  const empty = document.getElementById('competitions-empty')
  const entries = Object.entries(competitionsData)

  empty.style.display = entries.length ? 'none' : 'flex'
  container.innerHTML = ''

  entries
    .sort((a, b) => (a[1]?.name || '').localeCompare(b[1]?.name || ''))
    .forEach(([id, competition]) => {
      const row = document.createElement('div')
      row.className = 'competition-list-row'
      row.style.cursor = 'pointer'
      row.innerHTML = `
        ${iconBadgeHTML(competition, 'icon-badge-sm')}
        ${competitionNameHTML(competition)}
        <span class="list-row-actions">
          <button class="btn btn-ghost btn-sm" data-action="edit">Editar</button>
          <button class="btn btn-danger btn-sm" data-action="remove">Excluir</button>
        </span>
      `
      row.addEventListener('click', () => enterCompetition(id, competition))
      row.querySelector('[data-action="edit"]').addEventListener('click', (e) => {
        e.stopPropagation()
        populateFormForEdit(id, competition)
        showCompetitionFormView()
      })
      row.querySelector('[data-action="remove"]').addEventListener('click', async (e) => {
        e.stopPropagation()
        if (!window.confirm(`Excluir a competição "${competition.name}"? Isso também apaga as equipes, provas e pontos lançados nela.`)) return
        await competitionsService.deleteCompetition(id)
        toast('Competição excluída.')
      })
      container.appendChild(row)
    })
}

// #endregion

// #region Competitions: create/edit form

const compNameInput = document.getElementById('comp-name')
const compStageInput = document.getElementById('comp-stage')
const color1Input = document.getElementById('comp-color1')
const color2Input = document.getElementById('comp-color2')
const angleInput = document.getElementById('comp-angle')
const angleValueEl = document.getElementById('angle-value')
const color2Field = document.getElementById('color2-field')
const angleField = document.getElementById('angle-field')
const compPreview = document.getElementById('comp-preview')
const compErrorEl = document.getElementById('comp-error')

const iconPickerGrid = document.getElementById('icon-picker-grid')
ICON_NAMES.forEach((name) => {
  const btn = document.createElement('button')
  btn.type = 'button'
  btn.className = 'icon-picker-btn'
  btn.dataset.icon = name
  btn.title = name
  btn.innerHTML = iconSvg(name)
  btn.addEventListener('click', () => {
    selectedIcon = name
    document.querySelectorAll('.icon-picker-btn').forEach((b) => b.classList.toggle('selected', b === btn))
    updatePreview()
  })
  iconPickerGrid.appendChild(btn)
})

document.querySelectorAll('.color-mode-toggle .tab-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    colorMode = btn.dataset.mode
    document.querySelectorAll('.color-mode-toggle .tab-btn').forEach((b) => b.classList.toggle('active', b === btn))
    color2Field.style.display = colorMode === 'gradient' ? 'flex' : 'none'
    angleField.style.display = colorMode === 'gradient' ? 'flex' : 'none'
    updatePreview()
  })
})

;[color1Input, color2Input].forEach((input) => input.addEventListener('input', updatePreview))
angleInput.addEventListener('input', () => {
  angleValueEl.textContent = angleInput.value
  updatePreview()
})

function currentIconBg() {
  return colorMode === 'gradient'
    ? { mode: 'gradient', color1: color1Input.value, color2: color2Input.value, angle: Number(angleInput.value) }
    : { mode: 'solid', color1: color1Input.value }
}

function updatePreview() {
  compPreview.style.background = cssBackground(currentIconBg())
  compPreview.innerHTML = iconSvg(selectedIcon)
}

function resetForm() {
  editingCompetitionId = null
  document.getElementById('comp-form-title').textContent = 'Nova competição'
  document.getElementById('comp-submit').textContent = 'Criar competição'
  compErrorEl.textContent = ''
  compNameInput.value = ''
  compStageInput.value = ''

  selectedIcon = DEFAULT_ICON
  document.querySelectorAll('.icon-picker-btn').forEach((b) => b.classList.toggle('selected', b.dataset.icon === DEFAULT_ICON))

  colorMode = 'gradient'
  document.querySelectorAll('.color-mode-toggle .tab-btn').forEach((b) => b.classList.toggle('active', b.dataset.mode === 'gradient'))
  color1Input.value = '#dc2626'
  color2Input.value = '#111114'
  angleInput.value = 135
  angleValueEl.textContent = '135'
  color2Field.style.display = 'flex'
  angleField.style.display = 'flex'

  updatePreview()
}

function populateFormForEdit(id, competition) {
  editingCompetitionId = id
  document.getElementById('comp-form-title').textContent = 'Editar competição'
  document.getElementById('comp-submit').textContent = 'Salvar alterações'
  compErrorEl.textContent = ''
  compNameInput.value = competition.name || ''
  compStageInput.value = competition.stage || ''

  selectedIcon = competition.icon || DEFAULT_ICON
  document.querySelectorAll('.icon-picker-btn').forEach((b) => b.classList.toggle('selected', b.dataset.icon === selectedIcon))

  const bg = competition.iconBg || { mode: 'gradient', color1: '#dc2626', color2: '#111114', angle: 135 }
  colorMode = bg.mode || 'gradient'
  document.querySelectorAll('.color-mode-toggle .tab-btn').forEach((b) => b.classList.toggle('active', b.dataset.mode === colorMode))
  color1Input.value = bg.color1 || '#dc2626'
  color2Input.value = bg.color2 || '#111114'
  angleInput.value = bg.angle ?? 135
  angleValueEl.textContent = String(angleInput.value)
  color2Field.style.display = colorMode === 'gradient' ? 'flex' : 'none'
  angleField.style.display = colorMode === 'gradient' ? 'flex' : 'none'

  updatePreview()
}

document.getElementById('comp-submit').addEventListener('click', async () => {
  compErrorEl.textContent = ''
  const name = compNameInput.value.trim()
  if (!name) {
    compErrorEl.textContent = 'Informe o nome da competição.'
    return
  }
  const stage = compStageInput.value.trim()
  const iconBg = currentIconBg()

  try {
    if (editingCompetitionId) {
      await competitionsService.updateCompetition(editingCompetitionId, { name, stage, icon: selectedIcon, iconBg })
      toast('Competição atualizada.')
    } else {
      await competitionsService.createCompetition({ name, stage, icon: selectedIcon, iconBg })
      toast('Competição criada.')
    }
    resetForm()
    showCompetitionsView()
  } catch (err) {
    console.error('Erro ao salvar competição:', err)
    compErrorEl.textContent = `Não foi possível salvar (${err.code || err.message || 'erro desconhecido'}).`
  }
})

document.getElementById('comp-cancel').addEventListener('click', () => {
  resetForm()
  showCompetitionsView()
})

document.getElementById('new-competition-btn').addEventListener('click', () => {
  resetForm()
  showCompetitionFormView()
})

document.getElementById('back-to-list-from-form').addEventListener('click', (e) => {
  e.preventDefault()
  resetForm()
  showCompetitionsView()
})

resetForm()

// #endregion

// #region Enter / exit a competition's management view

function enterCompetition(id, competition) {
  currentCompetitionId = id
  localStorage.setItem('lr_current_competition', id)
  showManageView()
  if (competition) updateManageHeader(competition)
  subscribeManageData(id)
}

function exitCompetition() {
  unsubscribeManageData()
  currentCompetitionId = null
  localStorage.removeItem('lr_current_competition')
  showCompetitionsView()
}

document.getElementById('back-to-competitions').addEventListener('click', exitCompetition)

function updateManageHeader(competition) {
  document.getElementById('manage-title').textContent = competition?.name || 'Competição'
  document.getElementById('manage-badge').innerHTML = iconBadgeHTML(competition, 'icon-badge-sm')
  document.getElementById('view-public-link').href = `./index.html?c=${currentCompetitionId}`
}

function subscribeManageData(id) {
  unsubscribeManageData()

  // Render the empty state first (also clears any leftover data from a previously
  // viewed competition), the watchers below replace it once the query resolves.
  teamsData = {}
  testsData = {}
  scoresData = {}
  renderTeamsList()
  renderTestsList()
  renderScoresTable()
  fillSelect(scoreTeamSelect, teamsData, 'Selecione a equipe')
  fillSelect(scoreTestSelect, testsData, 'Selecione a prova')

  manageUnsubs.push(competitionsService.watchCompetition(id, updateManageHeader))

  manageUnsubs.push(
    teamsService.watchTeams(id, (data) => {
      teamsData = data
      renderTeamsList()
      fillSelect(scoreTeamSelect, teamsData, 'Selecione a equipe')
      renderScoresTable()
    })
  )

  manageUnsubs.push(
    testsService.watchTests(id, (data) => {
      testsData = data
      renderTestsList()
      fillSelect(scoreTestSelect, testsData, 'Selecione a prova')
      renderScoresTable()
    })
  )

  manageUnsubs.push(
    scoresService.watchScores(id, (data) => {
      scoresData = data
      renderScoresTable()
    })
  )
}

function unsubscribeManageData() {
  manageUnsubs.forEach((unsub) => unsub())
  manageUnsubs = []
}

// #endregion

// #region Manage view: tabs

document.querySelectorAll('#manage-view .tabs .tab-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('#manage-view .tabs .tab-btn').forEach((b) => b.classList.remove('active'))
    document.querySelectorAll('#manage-view .tab-panel').forEach((p) => p.classList.remove('active'))
    btn.classList.add('active')
    document.getElementById(`tab-${btn.dataset.tab}`).classList.add('active')
  })
})

// #endregion

// #region Teams

const teamNameInput = document.getElementById('team-name')
const teamAddBtn = document.getElementById('team-add')
const teamsListEl = document.getElementById('teams-list')

teamAddBtn.addEventListener('click', async () => {
  const name = teamNameInput.value.trim()
  if (!name || !currentCompetitionId) return
  await teamsService.addTeam(currentCompetitionId, name)
  teamNameInput.value = ''
  toast('Equipe adicionada.')
})

function renderTeamsList() {
  const entries = Object.entries(teamsData)
  teamsListEl.innerHTML = ''
  if (!entries.length) {
    teamsListEl.innerHTML = `<div class="empty-state">${emptyStateHTML({
      icon: 'users',
      title: 'Nenhuma equipe cadastrada ainda. Clique para adicionar a primeira.',
      actionable: true,
    })}</div>`
    teamsListEl.querySelector('.empty-state-icon').addEventListener('click', () => teamNameInput.focus())
    return
  }
  entries
    .sort((a, b) => (a[1]?.name || '').localeCompare(b[1]?.name || ''))
    .forEach(([id, team]) => {
      const row = document.createElement('div')
      row.className = 'list-row'
      row.innerHTML = `
        <span>${team.name}</span>
        <span class="list-row-actions">
          <button class="btn btn-ghost btn-sm" data-action="rename">Renomear</button>
          <button class="btn btn-danger btn-sm" data-action="remove">Remover</button>
        </span>
      `
      row.querySelector('[data-action="rename"]').addEventListener('click', async () => {
        const novoNome = window.prompt('Novo nome da equipe:', team.name)
        if (novoNome && novoNome.trim()) {
          await teamsService.renameTeam(currentCompetitionId, id, novoNome.trim())
          toast('Equipe renomeada.')
        }
      })
      row.querySelector('[data-action="remove"]').addEventListener('click', async () => {
        if (!window.confirm(`Remover a equipe "${team.name}"? Isso também apaga os pontos lançados para ela.`)) return
        await teamsService.removeTeam(currentCompetitionId, id)
        toast('Equipe removida.')
      })
      teamsListEl.appendChild(row)
    })
}

// #endregion

// #region Tests

const testNameInput = document.getElementById('test-name')
const testAddBtn = document.getElementById('test-add')
const testsListEl = document.getElementById('tests-list')

testAddBtn.addEventListener('click', async () => {
  const name = testNameInput.value.trim()
  if (!name || !currentCompetitionId) return
  await testsService.addTest(currentCompetitionId, name)
  testNameInput.value = ''
  toast('Prova adicionada.')
})

function renderTestsList() {
  const entries = Object.entries(testsData)
  testsListEl.innerHTML = ''
  if (!entries.length) {
    testsListEl.innerHTML = `<div class="empty-state">${emptyStateHTML({
      icon: 'flag',
      title: 'Nenhuma prova cadastrada ainda. Clique para adicionar a primeira.',
      actionable: true,
    })}</div>`
    testsListEl.querySelector('.empty-state-icon').addEventListener('click', () => testNameInput.focus())
    return
  }
  entries
    .sort((a, b) => (a[1]?.name || '').localeCompare(b[1]?.name || ''))
    .forEach(([id, test]) => {
      const row = document.createElement('div')
      row.className = 'list-row'
      row.innerHTML = `
        <span>${test.name}</span>
        <span class="list-row-actions">
          <button class="btn btn-ghost btn-sm" data-action="rename">Renomear</button>
          <button class="btn btn-danger btn-sm" data-action="remove">Remover</button>
        </span>
      `
      row.querySelector('[data-action="rename"]').addEventListener('click', async () => {
        const novoNome = window.prompt('Novo nome da prova:', test.name)
        if (novoNome && novoNome.trim()) {
          await testsService.renameTest(currentCompetitionId, id, novoNome.trim())
          toast('Prova renomeada.')
        }
      })
      row.querySelector('[data-action="remove"]').addEventListener('click', async () => {
        if (!window.confirm(`Remover a prova "${test.name}"? Isso também apaga os pontos lançados nela.`)) return
        await testsService.removeTest(currentCompetitionId, id, Object.keys(teamsData))
        toast('Prova removida.')
      })
      testsListEl.appendChild(row)
    })
}

// #endregion

// #region Scores

const scoreTeamSelect = document.getElementById('score-team')
const scoreTestSelect = document.getElementById('score-test')
const scorePointsInput = document.getElementById('score-points')
const scoreSubmitBtn = document.getElementById('score-submit')
const scoresTbody = document.getElementById('scores-tbody')

function fillSelect(select, data, placeholder) {
  const current = select.value
  select.innerHTML = `<option value="">${placeholder}</option>`
  Object.entries(data)
    .sort((a, b) => (a[1]?.name || '').localeCompare(b[1]?.name || ''))
    .forEach(([id, item]) => {
      const opt = document.createElement('option')
      opt.value = id
      opt.textContent = item.name
      select.appendChild(opt)
    })
  if (Object.prototype.hasOwnProperty.call(data, current)) select.value = current
}

scoreSubmitBtn.addEventListener('click', async () => {
  const teamId = scoreTeamSelect.value
  const testId = scoreTestSelect.value
  const points = Number(scorePointsInput.value)
  if (!currentCompetitionId || !teamId || !testId || Number.isNaN(points)) {
    toast('Selecione equipe, prova e informe os pontos.', true)
    return
  }
  try {
    await scoresService.addPoints(currentCompetitionId, teamId, testId, points)
    scorePointsInput.value = ''
    scoreTeamSelect.value = ''
    toast('Pontuação lançada.')
  } catch (err) {
    console.error('Erro ao lançar pontuação:', err)
    toast('Não foi possível lançar a pontuação.', true)
  }
})

scoreTestSelect.addEventListener('change', renderScoresTable)

function renderScoresTable() {
  const testId = scoreTestSelect.value
  const scoresContext = document.getElementById('scores-context')
  scoresContext.textContent = testId
    ? `Mostrando os pontos em: ${testsData[testId]?.name || 'prova selecionada'}.`
    : 'Mostrando o total geral de cada equipe. Selecione uma prova acima para lançar e ver os pontos dela.'

  const teamEntries = Object.entries(teamsData)
  if (!teamEntries.length) {
    scoresTbody.innerHTML = '<tr><td colspan="3" class="muted">Nenhuma equipe cadastrada ainda.</td></tr>'
    return
  }

  scoresTbody.innerHTML = ''
  teamEntries
    .sort((a, b) => (a[1]?.name || '').localeCompare(b[1]?.name || ''))
    .forEach(([teamId, team]) => {
      const points = testId
        ? scoresData[teamId]?.[testId] || 0
        : Object.values(scoresData[teamId] || {}).reduce((sum, v) => sum + (Number(v) || 0), 0)

      const tr = document.createElement('tr')
      tr.innerHTML = `
        <td>${team.name}</td>
        <td>${points}</td>
        <td>${testId ? `<button class="btn btn-danger btn-sm" data-action="reset" ${points ? '' : 'disabled'}>Zerar</button>` : ''}</td>
      `
      if (testId) {
        tr.querySelector('[data-action="reset"]').addEventListener('click', async () => {
          if (!window.confirm(`Zerar a pontuação de "${team.name}" nesta prova?`)) return
          await scoresService.resetScore(currentCompetitionId, teamId, testId)
          toast('Pontuação zerada.')
        })
      }
      scoresTbody.appendChild(tr)
    })
}

// #endregion
