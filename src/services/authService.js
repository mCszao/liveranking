import { auth } from '../firebase.js'
import { signInWithEmailAndPassword, onAuthStateChanged, signOut } from 'firebase/auth'

export function login(email, password) {
  return signInWithEmailAndPassword(auth, email, password)
}

export function logout() {
  return signOut(auth)
}

export function watchAuthState(callback) {
  return onAuthStateChanged(auth, callback)
}
