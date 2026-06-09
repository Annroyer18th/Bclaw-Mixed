const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  searchVideos: (options) => ipcRenderer.invoke('search-videos', options),
  getCover: (bvid) => ipcRenderer.invoke('get-cover', bvid),
  openFile: (filePath) => ipcRenderer.invoke('open-file', filePath),
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  onLogMessage: (callback) => {
    const listener = (event, data) => callback(data)
    ipcRenderer.on('log-message', listener)
    return () => ipcRenderer.removeListener('log-message', listener)
  }
})
