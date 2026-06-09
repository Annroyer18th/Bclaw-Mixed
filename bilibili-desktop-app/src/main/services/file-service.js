const fs = require('fs')
const path = require('path')
const https = require('https')
const http = require('http')
const { app } = require('electron')

class FileService {
  constructor(userDataPath) {
    this.userDataPath = userDataPath
    this.coversDir = path.join(userDataPath, 'covers')
    fs.mkdirSync(this.coversDir, { recursive: true })
  }

  async downloadCover(picUrl, bvid, logCallback) {
    const filename = `${bvid}.jpg`
    const filepath = path.join(this.coversDir, filename)

    if (fs.existsSync(filepath)) {
      if (logCallback) logCallback(`封面已存在: ${filename}`)
      return filepath
    }

    const urlsToTry = []
    if (picUrl) {
      if (picUrl.startsWith('//')) {
        picUrl = 'https:' + picUrl
      }
      if (picUrl.startsWith('http')) {
        urlsToTry.push(picUrl)
        urlsToTry.push(picUrl.replace('http://', 'https://'))
      }
    }

    for (const url of urlsToTry) {
      try {
        const success = await this.downloadFile(url, filepath)
        if (success) {
          if (logCallback) logCallback(`下载封面成功: ${filename}`)
          return filepath
        }
      } catch (error) {
        continue
      }
    }

    if (logCallback) logCallback(`封面下载失败: ${bvid}`)
    return null
  }

  downloadFile(url, filepath) {
    return new Promise((resolve, reject) => {
      const protocol = url.startsWith('https') ? https : http
      
      protocol.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Referer': 'https://www.bilibili.com'
        },
        timeout: 10000
      }, (response) => {
        if (response.statusCode === 200) {
          const fileStream = fs.createWriteStream(filepath)
          response.pipe(fileStream)
          fileStream.on('finish', () => {
            fileStream.close()
            fs.stat(filepath, (err, stats) => {
              if (!err && stats.size > 1000) {
                resolve(true)
              } else {
                fs.unlinkSync(filepath)
                resolve(false)
              }
            })
          })
          fileStream.on('error', (err) => {
            fs.unlinkSync(filepath)
            reject(err)
          })
        } else {
          resolve(false)
        }
      }).on('error', (err) => {
        reject(err)
      })
    })
  }

  getCoversDir() {
    return this.coversDir
  }
}

module.exports = { FileService }
