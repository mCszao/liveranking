import { db } from '../firebase.js'
import { ref, onValue, push, update, remove } from 'firebase/database'

export function watchCompetitions(callback) {
  return onValue(ref(db, 'competitions'), (snapshot) => callback(snapshot.val() || {}))
}

export function watchCompetition(competitionId, callback) {
  return onValue(ref(db, `competitions/${competitionId}`), (snapshot) => callback(snapshot.val()))
}

export function createCompetition(data) {
  return push(ref(db, 'competitions'), { ...data, createdAt: Date.now() })
}

export function updateCompetition(competitionId, data) {
  return update(ref(db, `competitions/${competitionId}`), data)
}

export function deleteCompetition(competitionId) {
  return remove(ref(db, `competitions/${competitionId}`))
}
