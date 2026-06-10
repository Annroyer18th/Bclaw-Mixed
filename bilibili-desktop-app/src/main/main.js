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
        const coverUrl = await bilibiliService.getCoverUrlFromPage(video.bvid) || video.pic
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

  // 获取视频封面（依次尝试三种方法）
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

      // 方法1: API 获取
      sendLog('info', '尝试方法1: API 获取...')
      let videoInfo = await bilibiliService.getVideoInfoFromApi(bvid)
      if (videoInfo) {
        sendLog('info', `方法1成功: ${videoInfo.title}`)
      } else {
        // 方法2: 页面抓取
        sendLog('info', '方法1失败，尝试方法2: 页面抓取...')
        videoInfo = await bilibiliService.getVideoInfoFromPage(bvid)
        if (videoInfo) {
          sendLog('info', `方法2成功: ${videoInfo.title}`)
        } else {
          // 方法3: 仅提取封面URL
          sendLog('info', '方法2失败，尝试方法3: 仅提取封面...')
          const pic = await bilibiliService.getCoverUrlFromPage(bvid)
          if (pic) {
            videoInfo = {
              title: '未知标题',
              author: '未知作者',
              bvid,
              pic,
              url: `https://www.bilibili.com/video/${bvid}`
            }
            sendLog('info', '方法3成功: 已获取封面链接')
          }
        }
      }

      if (!videoInfo) {
        sendLog('error', `所有方法均失败，请检查 BV 号是否正确: ${bvid}`)
        return { success: false, message: `查询失败，BV号可能不存在或无法访问: ${bvid}` }
      }

      sendLog('info', `视频标题: ${videoInfo.title}`)
      sendLog('info', `作者: ${videoInfo.author}`)
      sendLog('info', `封面链接: ${videoInfo.pic}`)

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
