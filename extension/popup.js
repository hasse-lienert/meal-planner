chrome.storage.sync.get(['mpUrl', 'mpSecret'], ({ mpUrl, mpSecret }) => {
  if (mpUrl) document.getElementById('mpUrl').value = mpUrl
  if (mpSecret) document.getElementById('mpSecret').value = mpSecret
})

document.getElementById('save').addEventListener('click', () => {
  const mpUrl = document.getElementById('mpUrl').value.trim().replace(/\/$/, '')
  const mpSecret = document.getElementById('mpSecret').value.trim()
  chrome.storage.sync.set({ mpUrl, mpSecret }, () => {
    const saved = document.getElementById('saved')
    saved.style.display = 'block'
    setTimeout(() => saved.style.display = 'none', 2000)
  })
})
