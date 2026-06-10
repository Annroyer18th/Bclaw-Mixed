const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  searchVideos: (options) => ipcRenderer.invoke('search-videos', options),
  getCover: (options) => {
    // 支持两种调用方式：字符串(bvid) 或 对象({ bvid, savePath, getDefaultPath })
    if (typeof options === 'string') {
      return ipcRenderer.invoke('get-cover', options)
    }
    return ipcRenderer.invoke('get-cover', options)
  },
  selectFolder: () => ipcRenderer.invoke('select-folder'),
  openFile: (filePath) => ipcRenderer.invoke('open-file', filePath),
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  onLogMessage: (callback) => {
    const listener = (event, data) => callback(data)
    ipcRenderer.on('log-message', listener)
    return () => ipcRenderer.removeListener('log-message', listener)
  }
})
