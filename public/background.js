async function enableActionSidePanel() {
  if (!chrome?.sidePanel?.setPanelBehavior) return

  try {
    await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
  } catch (error) {
    console.warn('[Tab Harbor] Unable to enable side panel action:', error)
  }
}

chrome.runtime.onInstalled.addListener(enableActionSidePanel)
chrome.runtime.onStartup.addListener(enableActionSidePanel)
enableActionSidePanel()
