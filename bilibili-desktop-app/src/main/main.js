const { app, BrowserWindow, ipcMain, shell } = require('electron')
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
    webPreferences: {
      preload: path.join(__dirname, '../../src/preload/preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  const isDev = !app.isPackaged
  if (isDev) {
    // 开发模式下，优先使用环境变量指定的 URL
    const devUrl = process.env.ELECTRON_START_URL
    if (devUrl) {
      mainWindow.loadURL(devUrl)
    } else {
      // 直接加载本地文件，用于快速测试
      mainWindow.loadFile(path.join(__dirname, '../../dist/renderer/index.html'))
    }
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../../dist/renderer/index.html'))
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
        sendLog('warning', '未找到相关视频')
        return { success: false, message: '未找到相关视频' }
      }
      
      sendLog('info', `成功获取 ${results.length} 个视频`)
      const videos = bilibiliService.parseVideoInfo(results)
      const topVideos = bilibiliService.getTopVideos(videos, options.topN || 10)
      
      sendLog('info', `正在下载封面...`)
      for (const video of topVideos) {
        await fileService.downloadCover(video.pic, video.bvid, (msg) => sendLog('info', msg))
        await new Promise(resolve => setTimeout(resolve, 500))
      }
      
      sendLog('info', '正在生成 Excel 表格...')
      const excelPath = await excelService.createExcel(topVideos)
      
      sendLog('info', '正在生成报告...')
      const reportPath = await excelService.generateSummary(topVideos)
      
      sendLog('success', `采集完成！\nExcel: ${excelPath}\n报告: ${reportPath}`)
      
      return {
        success: true,
        videos: topVideos,
        excelPath,
        reportPath
      }
    } catch (error) {
      sendLog('error', `搜索失败: ${error.message}`)
      return { success: false, message: error.message }
    }
  })

  // 获取视频封面
  ipcMain.handle('get-cover', async (event, bvid) => {
    try {
      sendLog('info', `正在查询 BV 号: ${bvid}`)
      const videoInfo = await bilibiliService.getVideoInfoByBvid(bvid)
      
      if (!videoInfo) {
        sendLog('error', '查询失败，请检查 BV 号是否正确')
        return { success: false, message: '查询失败' }
      }
      
      sendLog('info', `视频标题: ${videoInfo.title}`)
      sendLog('info', `作者: ${videoInfo.author}`)
      
      sendLog('info', '正在下载封面...')
      const coverPath = await fileService.downloadCover(videoInfo.pic, bvid, (msg) => sendLog('info', msg))
      
      if (coverPath) {
        sendLog('success', `封面已保存至: ${coverPath}`)
        return { success: true, videoInfo, coverPath }
      } else {
        sendLog('error', '封面下载失败')
        return { success: false, message: '封面下载失败' }
      }
    } catch (error) {
      sendLog('error', `获取封面失败: ${error.message}`)
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
