const axios = require('axios')
const https = require('https')

class BilibiliService {
  constructor() {
    this.headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Referer': 'https://www.bilibili.com',
      'Accept': 'application/json',
      'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8'
    }
    this.axiosInstance = axios.create({
      headers: this.headers,
      timeout: 15000,
      httpsAgent: new https.Agent({
        rejectUnauthorized: false
      })
    })
  }

  async searchVideos(keyword = '鸣潮', pageSize = 50) {
    const searchUrl = 'https://api.bilibili.com/x/web-interface/search/type'
    const params = {
      search_type: 'video',
      keyword: keyword,
      page: 1,
      page_size: pageSize
    }

    const maxRetries = 3
    for (let retry = 0; retry < maxRetries; retry++) {
      try {
        console.log(`正在搜索 '${keyword}' 相关视频... (尝试 ${retry + 1}/${maxRetries})`)

        if (retry > 0) {
          const delay = Math.random() * 3000 + 2000
          console.log(`等待 ${Math.round(delay / 100) / 10} 秒后重试...`)
          await this.sleep(delay)
        }

        const response = await this.axiosInstance.get(searchUrl, { params })

        if (response.status === 412) {
          console.log('请求被阻止(412)，等待后重试...')
          await this.sleep(3000)
          continue
        }

        if (response.status === 200) {
          const data = response.data
          if (data.code === 0) {
            const results = data.data.result || []
            console.log(`成功获取到 ${results.length} 个视频`)
            return results
          } else if (data.code === -509) {
            console.log('请求过于频繁，请稍后再试')
            await this.sleep(5000)
            continue
          } else {
            console.log(`API返回错误: ${data.message}`)
          }
        } else {
          console.log(`请求失败，状态码: ${response.status}`)
        }
      } catch (error) {
        console.log(`搜索出错: ${error.message}`)
        await this.sleep(2000)
      }
    }

    console.log('搜索失败，已达到最大重试次数')
    return []
  }

  parseVideoInfo(searchResults) {
    const videos = []

    for (const item of searchResults) {
      try {
        const bvid = item.bvid || ''
        if (!bvid) continue

        let title = item.title || ''
        title = title.replace(/<em class="keyword">/g, '').replace(/<\/em>/g, '')

        const playStr = item.play || '0'
        const playCount = this.parseNumber(playStr)

        const video = {
          title,
          author: item.author || '',
          bvid,
          play_count: playCount,
          play_str: playStr,
          duration: item.duration || '',
          pubdate: item.pubdate || 0,
          video_review: item.video_review || 0,
          likes: item.like || 0,
          pic: item.pic || '',
          url: `https://www.bilibili.com/video/${bvid}`
        }
        videos.push(video)
      } catch (error) {
        console.log(`解析视频信息出错: ${error.message}`)
        continue
      }
    }

    return videos
  }

  parseNumber(numStr) {
    if (typeof numStr === 'number') return Math.floor(numStr)
    
    try {
      numStr = String(numStr).replace(/,/g, '').trim()
      if (numStr.includes('万')) {
        return Math.floor(parseFloat(numStr.replace('万', '')) * 10000)
      } else if (numStr.includes('千')) {
        return Math.floor(parseFloat(numStr.replace('千', '')) * 1000)
      } else {
        return parseInt(numStr) || 0
      }
    } catch (error) {
      return 0
    }
  }

  getTopVideos(videos, topN = 10) {
    return videos.sort((a, b) => b.play_count - a.play_count).slice(0, topN)
  }

  async getVideoInfoByBvid(bvid) {
    const url = 'https://api.bilibili.com/x/web-interface/view'
    const params = { bvid }

    try {
      const response = await this.axiosInstance.get(url, { params })
      
      if (response.status !== 200) {
        console.log(`请求失败，状态码: ${response.status}`)
        return null
      }

      const data = response.data
      if (data.code !== 0) {
        console.log(`API返回错误: ${data.message || '未知错误'}`)
        return null
      }

      const info = data.data
      return {
        title: info.title || '',
        author: info.owner?.name || '',
        bvid: bvid,
        pic: info.pic || '',
        url: `https://www.bilibili.com/video/${bvid}`
      }
    } catch (error) {
      console.log(`获取视频信息出错: ${error.message}`)
      return null
    }
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

module.exports = { BilibiliService }
