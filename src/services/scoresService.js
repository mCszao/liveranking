import { db } from '../firebase.js'
import { ref, onValue, runTransaction, remove } from 'firebase/database'

export function watchScores(competitionId, callback) {
  return onValue(ref(db, `competitions/${competitionId}/scores`), (snapshot) => callback(snapshot.val() || {}))
}

export function addPoints(competitionId, teamId, testId, points) {
  return runTransaction(ref(db, `competitions/${competitionId}/scores/${teamId}/${testId}`), (current) => (current || 0) + points)
}

export function resetScore(competitionId, teamId, testId) {
  return remove(ref(db, `competitions/${competitionId}/scores/${teamId}/${testId}`))
}
