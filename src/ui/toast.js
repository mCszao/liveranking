let toastTimer = null

export function showToast(toastEl, message, isError = false) {
  toastEl.textContent = message
  toastEl.classList.toggle('toast-error', isError)
  toastEl.classList.add('show')
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2600)
}
