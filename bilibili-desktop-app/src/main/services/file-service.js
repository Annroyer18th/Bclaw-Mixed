const fs = require('fs')
const path = require('path')
const https = require('https')
const http = require('http')
const { app } = require('electron')

class FileService {
  constructor(userDataPath, customCoversDir = null) {
    this.userDataPath = userDataPath
    this.coversDir = customCoversDir || path.join(userDataPath, 'covers')
    fs.mkdirSync(this.coversDir, { recursive: true })
  }

  setCoversDir(newPath) {
    if (newPath && typeof newPath === 'string') {
      fs.mkdirSync(newPath, { recursive: true })
      this.coversDir = newPath
    }
  }

  getCoversDir() {
    return this.coversDir
  }

  async downloadCover(picUrl, bvid, savePath = null, logCallback) {
    // 处理参数：兼容旧调用方式 downloadCover(picUrl, bvid, logCallback)
    if (typeof savePath === 'function') {
      logCallback = savePath
      savePath = null
    }

    if (!picUrl) {
      if (logCallback) logCallback(`封面链接为空: ${bvid}`)
      return null
    }

    const filename = `${bvid}.jpg`
    const targetDir = savePath || this.coversDir
    const filepath = path.join(targetDir, filename)

    // 确保目标目录存在
    fs.mkdirSync(targetDir, { recursive: true })

    if (fs.existsSync(filepath)) {
      if (logCallback) logCallback(`封面已存在: ${filename}`)
      return filepath
    }

    // 处理封面URL
    let urlToDownload = picUrl
    if (urlToDownload.startsWith('//')) {
      urlToDownload = 'https:' + urlToDownload
    }
    // 去掉URL中的参数后缀（如@.avif）
    urlToDownload = urlToDownload.replace(/@\.avif$/, '')

    if (logCallback) logCallback(`开始下载封面: ${urlToDownload}`)

    // 尝试下载
    const maxRetries = 3
    for (let retry = 0; retry < maxRetries; retry++) {
      try {
        const success = await this.downloadFile(urlToDownload, filepath)
        if (success) {
          if (logCallback) logCallback(`下载封面成功: ${filename}`)
          return filepath
        }
      } catch (error) {
        if (logCallback) logCallback(`下载封面出错 (尝试 ${retry + 1}/${maxRetries}): ${error.message}`)
        if (retry === maxRetries - 1) break
        await new Promise(resolve => setTimeout(resolve, 2000))
      }
    }

    if (logCallback) logCallback(`封面下载失败: ${bvid}`)
    return null
  }

  downloadFile(url, filepath) {
    return new Promise((resolve, reject) => {
      const protocol = url.startsWith('https') ? https : http
      
      const request = protocol.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Referer': 'https://www.bilibili.com',
          'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8'
        },
        timeout: 15000
      }, (response) => {
        // 处理重定向 (301, 302, 307, 308)
        if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
          console.log(`[downloadFile] 重定向 ${response.statusCode} -> ${response.headers.location}`)
          this.downloadFile(response.headers.location, filepath).then(resolve).catch(reject)
          return
        }
        
        if (response.statusCode !== 200) {
          console.log(`[downloadFile] 下载失败，状态码: ${response.statusCode}`)
          resolve(false)
          return
        }

        const fileStream = fs.createWriteStream(filepath)
        response.pipe(fileStream)
        fileStream.on('finish', () => {
          fileStream.close()
          fs.stat(filepath, (err, stats) => {
            if (!err && stats.size > 1000) {
              resolve(true)
            } else {
              try { fs.unlinkSync(filepath) } catch(e) {}
              resolve(false)
            }
          })
        })
        fileStream.on('error', (err) => {
          try { fs.unlinkSync(filepath) } catch(e) {}
          reject(err)
        })
      })
      
      request.on('error', (err) => {
        reject(err)
      })
      
      request.on('timeout', () => {
        request.destroy()
        reject(new Error('请求超时'))
      })
    })
  }
}

module.exports = { FileService }
