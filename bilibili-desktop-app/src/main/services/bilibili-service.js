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

  // 检测是否为B站占位图（默认头像/封面）
  isPlaceholderPic(picUrl) {
    if (!picUrl || typeof picUrl !== 'string') return true
    return picUrl.includes('/bfs/static/jinkela/')
  }

  // 从HTML中提取封面的统一内部方法（多策略）
  _extractCoverFromHtml(html) {
    // 策略1: wxwork-share-pic img元素 src
    let match = html.match(/<img[^>]+id=["']wxwork-share-pic["'][^>]+src=["']([^"']+)["']/)
    if (match && match[1]) {
      let url = match[1].replace(/@\.avif$/, '')
      if (url.startsWith('//')) url = 'https:' + url
      return url
    }
    // 策略2: og:image meta标签
    match = html.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/)
    if (match && match[1]) {
      let url = match[1].replace(/@\.avif$/, '')
      if (url.startsWith('//')) url = 'https:' + url
      return url
    }
    // 策略3: __INITIAL_STATE__ 内嵌JSON中的pic字段
    match = html.match(new RegExp('window\.__INITIAL_STATE__\s*=\s*(\{[\s\S]*?\})(?:\s*</script>)?'))
    if (match && match[1]) {
      try {
        const stateData = JSON.parse(match[1])
        const pic = stateData?.videoData?.pic || stateData?.videoInfo?.pic || ''
        if (pic && !this.isPlaceholderPic(pic)) return pic
      } catch (e) { /* JSON解析失败，跳过 */ }
    }
    return ''
  }

  // 从页面提取视频信息（含标题、作者、封面），返回完整 videoInfo 对象
  async getCoverUrlFromPage(bvid) {
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
        : ''

      // 提取作者
      const authorMatch = html.match(/"name":"([^"]+)","face"/)
      const author = authorMatch ? authorMatch[1] : ''

      // 提取封面（多策略）
      const pic = this._extractCoverFromHtml(html)

      if (!title && !pic) return null

      return {
        title,
        author,
        bvid,
        pic,
        url: `https://www.bilibili.com/video/${bvid}`
      }
    } catch (error) {
      console.log(`[getCoverUrlFromPage] 出错: ${error.message}`)
      return null
    }
  }

  // API方式获取视频信息，占位图时自动回退到页面抓取
  async getVideoInfoFromApi(bvid) {
    // 方法1: 优先尝试 B站 API
    try {
      const response = await this.axiosInstance.get(
        'https://api.bilibili.com/x/web-interface/view',
        { params: { bvid } }
      )
      if (response.status === 200 && response.data.code === 0 && response.data.data) {
        const info = response.data.data
        const pic = info.pic || ''
        // 占位图检测：如果API返回的是默认占位图，视为无效，继续尝试页面抓取
        if (pic && !this.isPlaceholderPic(pic)) {
          return {
            title: info.title || '',
            author: info.owner?.name || '',
            bvid,
            pic,
            url: `https://www.bilibili.com/video/${bvid}`
          }
        }
        console.log(`[getVideoInfoFromApi] API返回占位图(${pic})，回退到页面抓取`)
      }
    } catch (error) {
      console.log(`[getVideoInfoFromApi] API失败，回退到页面抓取: ${error.message}`)
    }

    // 方法2 / 回退: 从页面 HTML 抓取
    return this._getVideoInfoFromPage(bvid)
  }

  // 从页面HTML提取视频信息（备用方案，与 getCoverUrlFromPage 共用同一套多策略）
  async _getVideoInfoFromPage(bvid) {
    return this.getCoverUrlFromPage(bvid)
  }

  // ==================== 统一调用入口 ====================

  /**
   * 获取视频完整信息（标题、作者、封面）
   * 统一入口，依次调用三种方法，内置异常检测和占位图校验
   * @param {string} bvid - BV号
   * @returns {Promise<{title,author,bvid,pic,url}|null>} 视频信息对象，失败返回null
   */
  async getVideoInfo(bvid) {
    if (!bvid) return null

    const logPrefix = `[getVideoInfo:${bvid}]`

    // 方法1: API 获取（内部已包含占位图检测 + 页面回退）
    console.log(`${logPrefix} 尝试方法1: API...`)
    try {
      const result = await this.getVideoInfoFromApi(bvid)
      if (result && !this.isPlaceholderPic(result.pic)) {
        console.log(`${logPrefix} 方法1成功: ${result.title}`)
        return result
      }
    } catch (e) {
      console.log(`${logPrefix} 方法1异常: ${e.message}`)
    }

    // 方法2: 页面直接抓取（更完整的提取）
    console.log(`${logPrefix} 尝试方法2: 页面抓取...`)
    try {
      const result = await this.getCoverUrlFromPage(bvid)
      if (result && result.pic && !this.isPlaceholderPic(result.pic)) {
        console.log(`${logPrefix} 方法2成功: ${result.title}`)
        return result
      }
    } catch (e) {
      console.log(`${logPrefix} 方法2异常: ${e.message}`)
    }

    // 方法3: 仅提取封面URL作为最后兜底（返回最小可用信息）
    console.log(`${logPrefix} 尝试方法3: 最小兜底...`)
    try {
      // 重新尝试页面抓取，这次不限制占位图，只要有任何pic就返回
      const fallback = await this.getCoverUrlFromPage(bvid)
      if (fallback && fallback.pic) {
        console.log(`${logPrefix} 方法3兜底成功（可能为占位图）: ${fallback.pic}`)
        return fallback
      }
    } catch (e) {
      console.log(`${logPrefix} 方法3异常: ${e.message}`)
    }

    console.log(`${logPrefix} 所有方法均失败`)
    return null
  }

  // ====================随机请求延迟====================

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

module.exports = { BilibiliService }
