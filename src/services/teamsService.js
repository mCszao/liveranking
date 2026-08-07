import { db } from '../firebase.js'
import { ref, onValue, push, set, update, remove } from 'firebase/database'

export function watchTeams(competitionId, callback) {
  return onValue(ref(db, `competitions/${competitionId}/teams`), (snapshot) => callback(snapshot.val() || {}))
}

export function addTeam(competitionId, name) {
  return push(ref(db, `competitions/${competitionId}/teams`), { name, createdAt: Date.now() })
}

export function renameTeam(competitionId, teamId, name) {
  return set(ref(db, `competitions/${competitionId}/teams/${teamId}/name`), name)
}

export async function removeTeam(competitionId, teamId) {
  await remove(ref(db, `competitions/${competitionId}/teams/${teamId}`))
  await remove(ref(db, `competitions/${competitionId}/scores/${teamId}`))
}

export function disqualifyTeam(competitionId, teamId, reason) {
  return update(ref(db, `competitions/${competitionId}/teams/${teamId}`), {
    disqualified: true,
    disqualifiedReason: reason,
  })
}

export function requalifyTeam(competitionId, teamId) {
  return update(ref(db, `competitions/${competitionId}/teams/${teamId}`), {
    disqualified: null,
    disqualifiedReason: null,
  })
}
