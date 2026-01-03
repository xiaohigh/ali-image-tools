const { contextBridge, ipcRenderer } = require("electron");

// Expose protected methods to renderer process
contextBridge.exposeInMainWorld("electronAPI", {
  // Configuration management
  getConfig: () => ipcRenderer.invoke("get-config"),
  setConfig: (config) => ipcRenderer.invoke("set-config", config),

  // Check if running in Electron
  isElectron: true,
});
