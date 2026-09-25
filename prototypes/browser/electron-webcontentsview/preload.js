// Preload for the workbench window: exposes a minimal, isolated bridge.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('flauzHost', {
  // Renderer reports where the browser-pane region lives in DOM coordinates.
  reportPaneRect: (rect) => ipcRenderer.send('flauz:pane-rect', rect),
  ready: () => ipcRenderer.send('flauz:ready'),
  onAskRect: (cb) => ipcRenderer.on('flauz:ask-rect', () => cb()),
  onToggleLayout: (cb) => ipcRenderer.on('flauz:toggle-layout', () => cb()),
});
