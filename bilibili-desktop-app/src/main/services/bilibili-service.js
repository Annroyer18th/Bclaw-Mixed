const axios = require('axios')
const https = require('https')

class BilibiliService {
  constructor() {
    this.headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Referer': 'https://www.bilibili.com',
      'Accept': 'application/json, text/plain, */*',
      'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
      'Origin': 'https://www.bilibili.com'
    }
    this.axiosInstance = axios.create({
      headers: this.headers,
      timeout: 15000,
      httpsAgent: new https.Agent({ rejectUnauthorized: false }),
      validateStatus: (status) => status >= 200 && status < 500
    })
  }

  // ==================== 搜索热门视频模块 ====================

  async searchVideos(keyword = '鸣潮', pageSize = 50) {
    try {
      const response = await this.axiosInstance.get(
        'https://api.bilibili.com/x/web-interface/search/type',
        { params: { search_type: 'video', keyword, page: 1, page_size: pageSize } }
      )
      if (response.status === 200 && response.data.code === 0) {
        return response.data.data.result || []
      }
      return []
    } catch (error) {
      console.log(`[searchVideos] 请求失败: ${error.message}`)
      return []
    }
  }

  parseVideoInfo(searchResults) {
    const videos = []
    for (const item of searchResults) {
      try {
        const bvid = item.bvid || ''
        if (!bvid) continue

        let title = item.title || ''
        title = title.replace(/<em class="keyword">/g, '').replace(/<\/em>/g, '')

        const video = {
          title,
          author: item.author || '',
          bvid,
          play_count: this.parseNumber(item.play || '0'),
          play_str: item.play || '0',
          duration: item.duration || '',
          pubdate: item.pubdate || 0,
          video_review: item.video_review || 0,
          likes: item.like || 0,
          pic: item.pic || '',
          url: `https://www.bilibili.com/video/${bvid}`
        }
        videos.push(video)
      } catch (error) {
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

  // ==================== 封面提取模块 ====================

  // 网页wxwork-share-pic组件中图片直链
  async getCoverUrlFromPage(bvid) {
    try {
      const response = await this.axiosInstance.get(
        `https://www.bilibili.com/video/${bvid}`,
        { headers: { ...this.headers, 'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8' } }
      )
      if (response.status !== 200) return null

      const html = typeof response.data === 'string' ? response.data : String(response.data)
      const match = html.match(/<img[^>]+id=["']wxwork-share-pic["'][^>]+src=["']([^"']+)["']/)
      if (!match || !match[1]) return null

      let coverUrl = match[1].replace(/@\.avif$/, '')
      if (coverUrl.startsWith('//')) coverUrl = 'https:' + coverUrl
      return coverUrl
    } catch (error) {
      console.log(`[getCoverUrlFromPage] 出错: ${error.message}`)
      return null
    }
  }

  // API方式，失败后回退到页面抓取
  async getVideoInfoFromApi(bvid) {
    // 优先尝试 API
    try {
      const response = await this.axiosInstance.get(
        'https://api.bilibili.com/x/web-interface/view',
        { params: { bvid } }
      )
      if (response.status === 200 && response.data.code === 0 && response.data.data) {
        const info = response.data.data
        return {
          title: info.title || '',
          author: info.owner?.name || '',
          bvid,
          pic: info.pic || '',
          url: `https://www.bilibili.com/video/${bvid}`
        }
      }
    } catch (error) {
      console.log(`[getVideoInfoByBvid] API失败，回退到页面抓取: ${error.message}`)
    }

    // API 失败，从页面抓取
    return this._getVideoInfoFromPage(bvid)
  }

  // 从页面HTML提取视频信息（备用方案）
  async _getVideoInfoFromPage(bvid) {
    try {
      const response = await this.axiosInstance.get(
        `https://www.bilibili.com/video/${bvid}`,
        { headers: { ...this.headers, 'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8' } }
      )
      if (response.status !== 200) return null

      const html = typeof response.data === 'string' ? response.data : String(response.data)

      // 提取标题
      const titleMatch = html.match(/<meta\s+property=["']og:title["']\s+content=["']([^"']+)["']/)
        || html.match(/<title>([^<]+)<\/title>/)
      const title = titleMatch
        ? titleMatch[1].replace(/_哔哩哔哩_bilibili$/, '').trim()
        : '未知标题'

      // 提取作者
      const authorMatch = html.match(/"name":"([^"]+)","face"/)
      const author = authorMatch ? authorMatch[1] : '未知作者'

      // 提取封面（复用 getCoverUrlFromPage 的逻辑）
      let pic = ''
      const coverMatch = html.match(/<img[^>]+id=["']wxwork-share-pic["'][^>]+src=["']([^"']+)["']/)
      if (coverMatch && coverMatch[1]) {
        pic = coverMatch[1].replace(/@\.avif$/, '')
        if (pic.startsWith('//')) pic = 'https:' + pic
      }

      return { title, author, bvid, pic, url: `https://www.bilibili.com/video/${bvid}` }
    } catch (error) {
      console.log(`[_getVideoInfoFromPage] 出错: ${error.message}`)
      return null
    }
  }

  // ====================随机请求延迟====================

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

module.exports = { BilibiliService }
