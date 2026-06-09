const ExcelJS = require('exceljs')
const fs = require('fs')
const path = require('path')

class ExcelService {
  constructor(userDataPath) {
    this.userDataPath = userDataPath
  }

  async createExcel(videos) {
    if (!videos || videos.length === 0) {
      console.log('没有视频数据可导出')
      return null
    }

    const workbook = new ExcelJS.Workbook()
    const worksheet = workbook.addWorksheet('鸣潮热门视频TOP10')

    // 表头
    const headers = ['排名', '视频标题', '作者', 'BV号', '播放量', '时长', '发布时间', '弹幕数', '点赞数', '视频链接']
    
    const headerRow = worksheet.addRow(headers)
    headerRow.eachCell((cell) => {
      cell.font = {
        name: '微软雅黑',
        size: 11,
        bold: true,
        color: { argb: 'FFFFFFFF' }
      }
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF4472C4' }
      }
      cell.alignment = {
        horizontal: 'center',
        vertical: 'middle'
      }
    })

    // 设置列宽
    const colWidths = [6, 40, 15, 12, 10, 8, 18, 8, 8, 45]
    colWidths.forEach((width, index) => {
      worksheet.getColumn(index + 1).width = width
    })

    // 写入数据
    videos.forEach((video, index) => {
      const rowNumber = index + 2
      worksheet.getCell(`A${rowNumber}`).value = index + 1
      worksheet.getCell(`B${rowNumber}`).value = video.title
      worksheet.getCell(`C${rowNumber}`).value = video.author
      worksheet.getCell(`D${rowNumber}`).value = video.bvid
      worksheet.getCell(`E${rowNumber}`).value = video.play_str
      worksheet.getCell(`F${rowNumber}`).value = video.duration
      
      const pubdate = video.pubdate ? new Date(video.pubdate * 1000).toLocaleString('zh-CN') : ''
      worksheet.getCell(`G${rowNumber}`).value = pubdate
      
      worksheet.getCell(`H${rowNumber}`).value = video.video_review
      worksheet.getCell(`I${rowNumber}`).value = video.likes
      worksheet.getCell(`J${rowNumber}`).value = {
        text: video.url,
        hyperlink: video.url
      }
    })

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
    const filename = `鸣潮热门视频TOP10_${timestamp}.xlsx`
    const outputPath = path.join(this.userDataPath, filename)
    
    await workbook.xlsx.writeFile(outputPath)
    console.log(`[OK] Excel表格已生成: ${filename}`)

    return outputPath
  }

  async generateSummary(videos) {
    if (!videos || videos.length === 0) return null

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
    const filename = `鸣潮热门视频TOP10_${timestamp}_报告.txt`
    const outputPath = path.join(this.userDataPath, filename)

    let content = '='.repeat(60) + '\n'
    content += '鸣潮热门视频TOP10 采集报告\n'
    content += `采集时间: ${new Date().toLocaleString('zh-CN')}\n`
    content += '='.repeat(60) + '\n\n'

    videos.forEach((video, index) => {
      content += `【排名 ${index + 1}】\n`
      content += `标题: ${video.title}\n`
      content += `作者: ${video.author}\n`
      content += `BV号: ${video.bvid}\n`
      content += `播放量: ${video.play_str}\n`
      content += `时长: ${video.duration}\n`
      content += `弹幕数: ${video.video_review}\n`
      content += `点赞数: ${video.likes}\n`
      content += `链接: ${video.url}\n`
      content += '-'.repeat(60) + '\n\n'
    })

    fs.writeFileSync(outputPath, content, 'utf-8')
    console.log(`✓ 报告已生成: ${filename}`)

    return outputPath
  }
}

module.exports = { ExcelService }
