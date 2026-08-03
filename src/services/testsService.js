import { db } from '../firebase.js'
import { ref, onValue, push, set, remove } from 'firebase/database'

export function watchTests(competitionId, callback) {
  return onValue(ref(db, `competitions/${competitionId}/tests`), (snapshot) => callback(snapshot.val() || {}))
}

export function addTest(competitionId, name) {
  return push(ref(db, `competitions/${competitionId}/tests`), { name, createdAt: Date.now() })
}

export function renameTest(competitionId, testId, name) {
  return set(ref(db, `competitions/${competitionId}/tests/${testId}/name`), name)
}

// teamIds: every team in the competition — removing a score path that doesn't exist is a harmless no-op.
export async function removeTest(competitionId, testId, teamIds) {
  await remove(ref(db, `competitions/${competitionId}/tests/${testId}`))
  await Promise.all(teamIds.map((teamId) => remove(ref(db, `competitions/${competitionId}/scores/${teamId}/${testId}`))))
}
