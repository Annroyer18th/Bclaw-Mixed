const { app, BrowserWindow, ipcMain, shell, dialog } = require('electron')
const path = require('path')
const { BilibiliService } = require('./services/bilibili-service')
const { ExcelService } = require('./services/excel-service')
const { FileService } = require('./services/file-service')

let mainWindow = null
let bilibiliService = null
let excelService = null
let fileService = null

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 1000,
    minHeight: 600,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, '../../src/preload/preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  const isDev = !app.isPackaged
  if (isDev) {
    const devUrl = process.env.ELECTRON_START_URL
    if (devUrl) {
      mainWindow.loadURL(devUrl)
    } else {
      mainWindow.loadFile(path.join(__dirname, '../../dist/renderer/index.html'))
    }
    mainWindow.webContents.openDevTools()
  } else {
    const appPath = app.getAppPath()
    mainWindow.loadFile(path.join(appPath, 'dist', 'renderer', 'index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

function initServices() {
  const userDataPath = app.getPath('userData')
  bilibiliService = new BilibiliService()
  excelService = new ExcelService(userDataPath)
  fileService = new FileService(userDataPath)
}

function registerIPC() {
  // 搜索热门视频
  ipcMain.handle('search-videos', async (event, options) => {
    try {
      sendLog('info', '正在搜索视频...')
      const results = await bilibiliService.searchVideos(options.keyword, options.pageSize)

      if (!results || results.length === 0) {
        return { success: false, message: '未找到相关视频' }
      }

      const videos = bilibiliService.parseVideoInfo(results)
      const topVideos = bilibiliService.getTopVideos(videos, options.topN || 10)

      for (const video of topVideos) {
        const info = await bilibiliService.getCoverUrlFromPage(video.bvid)
        let coverUrl = info?.pic || video.pic
        if (bilibiliService.isPlaceholderPic(coverUrl)) {
          sendLog('warning', `检测到占位图封面: ${video.bvid}，跳过下载`)
          continue
        }
        await fileService.downloadCover(coverUrl, video.bvid, null, (msg) => sendLog('info', msg))
        await bilibiliService.sleep(Math.random() * 2000 + 1000)
      }

      const excelPath = await excelService.createExcel(topVideos)
      const reportPath = await excelService.generateSummary(topVideos)

      return { success: true, videos: topVideos, excelPath, reportPath }
    } catch (error) {
      sendLog('error', `搜索失败: ${error.message}`)
      return { success: false, message: error.message }
    }
  })

  // 获取视频封面（统一调用 getVideoInfo）
  ipcMain.handle('get-cover', async (event, options) => {
    if (typeof options === 'string') {
      options = { bvid: options }
    }

    const { bvid, savePath, getDefaultPath } = options

    if (getDefaultPath) {
      return { success: true, defaultPath: fileService.getCoversDir() }
    }

    try {
      sendLog('info', `正在查询 BV 号: ${bvid}`)

      const videoInfo = await bilibiliService.getVideoInfo(bvid)

      if (!videoInfo) {
        sendLog('error', `所有方法均失败，请检查 BV 号是否正确: ${bvid}`)
        return { success: false, message: `查询失败，BV号可能不存在或无法访问: ${bvid}` }
      }

      sendLog('info', `视频标题: ${videoInfo.title}`)
      sendLog('info', `作者: ${videoInfo.author}`)
      sendLog('info', `封面链接: ${videoInfo.pic}`)

      if (bilibiliService.isPlaceholderPic(videoInfo.pic)) {
        sendLog('warning', '检测到占位图封面，尝试重新获取...')
        const retryInfo = await bilibiliService.getCoverUrlFromPage(bvid)
        if (retryInfo?.pic && !bilibiliService.isPlaceholderPic(retryInfo.pic)) {
          Object.assign(videoInfo, retryInfo)
          sendLog('info', `重试成功，新封面链接: ${videoInfo.pic}`)
        }
      }

      sendLog('info', '正在下载封面...')
      const coverPath = await fileService.downloadCover(videoInfo.pic, bvid, savePath, (msg) => sendLog('info', msg))

      if (coverPath) {
        sendLog('success', `封面已保存至: ${coverPath}`)
        return { success: true, videoInfo, coverPath }
      } else {
        sendLog('error', `封面下载失败: ${bvid}`)
        return { success: false, message: '封面下载失败，请检查网络连接' }
      }
    } catch (error) {
      sendLog('error', `获取封面失败 (${bvid}): ${error.message}`)
      return { success: false, message: `获取失败: ${error.message}` }
    }
  })

  // 选择文件夹
  ipcMain.handle('select-folder', async (event) => {
    try {
      const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openDirectory'],
        title: '选择封面保存文件夹'
      })

      if (!result.canceled && result.filePaths.length > 0) {
        const selectedPath = result.filePaths[0]
        sendLog('info', `已选择保存文件夹: ${selectedPath}`)
        return { success: true, path: selectedPath }
      }

      return { success: false, message: '用户取消选择' }
    } catch (error) {
      sendLog('error', `选择文件夹失败: ${error.message}`)
      return { success: false, message: error.message }
    }
  })

  // 打开文件所在文件夹
  ipcMain.handle('open-file', async (event, filePath) => {
    if (filePath) {
      shell.showItemInFolder(filePath)
    }
    return { success: true }
  })

  // 获取应用版本
  ipcMain.handle('get-app-version', () => {
    return app.getVersion()
  })
}

function sendLog(type, content) {
  if (mainWindow && mainWindow.webContents) {
    mainWindow.webContents.send('log-message', {
      type,
      content,
      timestamp: new Date().toLocaleString('zh-CN')
    })
  }
}

app.whenReady().then(() => {
  initServices()
  registerIPC()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
