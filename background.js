// Abrir el panel lateral al hacer clic en el icono de la extensión
chrome.action.onClicked.addListener((tab) => {
  chrome.sidePanel.open({ windowId: tab.windowId });
});