import requests
import json
import time
import os
import sys
from datetime import datetime
import openpyxl
from openpyxl.styles import Font, Alignment, PatternFill, Border, Side
from openpyxl.drawing.image import Image as ExcelImage
from openpyxl.utils import get_column_letter

# 设置控制台编码为UTF-8
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

class BilibiliVideoScraper:
    def __init__(self):
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Referer': 'https://www.bilibili.com',
            'Accept': 'application/json',
            'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8'
        }
        self.base_dir = os.path.dirname(os.path.abspath(__file__))
        self.covers_dir = os.path.join(self.base_dir, 'covers')
        os.makedirs(self.covers_dir, exist_ok=True)
        
    def search_videos(self, keyword='鸣潮', page_size=30):
        """
        搜索B站视频
        使用搜索API获取视频列表
        支持重试机制
        """
        search_url = "https://api.bilibili.com/x/web-interface/search/type"
        params = {
            'search_type': 'video',
            'keyword': keyword,
            'page': 1,
            'page_size': page_size
        }
        
        max_retries = 3
        for retry in range(max_retries):
            try:
                print(f"正在搜索 '{keyword}' 相关视频... (尝试 {retry + 1}/{max_retries})")
                
                # 添加随机延迟，避免被反爬
                if retry > 0:
                    import random
                    delay = random.uniform(2, 5)
                    print(f"等待 {delay:.1f} 秒后重试...")
                    time.sleep(delay)
                
                response = requests.get(search_url, headers=self.headers, params=params, timeout=15)
                
                # 处理412状态码（反爬虫）
                if response.status_code == 412:
                    print(f"请求被阻止(412)，等待后重试...")
                    time.sleep(3)
                    continue
                
                if response.status_code == 200:
                    data = response.json()
                    if data.get('code') == 0:
                        results = data.get('data', {}).get('result', [])
                        print(f"成功获取到 {len(results)} 个视频")
                        return results
                    elif data.get('code') == -509:
                        print(f"请求过于频繁，请稍后再试")
                        time.sleep(5)
                        continue
                    else:
                        print(f"API返回错误: {data.get('message')}")
                else:
                    print(f"请求失败，状态码: {response.status_code}")
                    
            except Exception as e:
                print(f"搜索出错: {e}")
                time.sleep(2)
        
        print("搜索失败，已达到最大重试次数")
        return []
    
    def get_video_detail(self, bvid):
        """
        获取视频详细信息
        """
        detail_url = f"https://api.bilibili.com/x/web-interface/view?bvid={bvid}"
        
        try:
            response = requests.get(detail_url, headers=self.headers, timeout=10)
            if response.status_code == 200:
                data = response.json()
                if data.get('code') == 0:
                    return data.get('data')
        except Exception as e:
            print(f"获取视频详情出错 {bvid}: {e}")
        
        return None
    
    def parse_video_info(self, search_results):
        """
        解析搜索结果中的视频信息
        """
        videos = []
        
        for idx, item in enumerate(search_results):
            try:
                # 跳过没有BV号的视频
                bvid = item.get('bvid', '')
                if not bvid:
                    continue
                
                # 处理标题中的HTML标签
                title = item.get('title', '')
                title = title.replace('<em class="keyword">', '').replace('</em>', '')
                
                # 转换播放量（可能有单位，如"12.3万"）
                play_str = item.get('play', '0')
                play_count = self.parse_number(play_str)
                
                video = {
                    'index': idx + 1,
                    'title': title,
                    'author': item.get('author', ''),
                    'bvid': item.get('bvid', ''),
                    'play_count': play_count,
                    'play_str': play_str,
                    'duration': item.get('duration', ''),
                    'pubdate': item.get('pubdate', 0),
                    'video_review': item.get('video_review', 0),
                    'likes': item.get('like', 0),
                    'pic': item.get('pic', ''),
                    'description': item.get('description', '')[:100] + '...' if item.get('description') else '',
                    'tag': item.get('tag', ''),
                    'url': f"https://www.bilibili.com/video/{item.get('bvid', '')}"
                }
                videos.append(video)
                
            except Exception as e:
                print(f"解析视频信息出错: {e}")
                continue
        
        return videos
    
    def parse_number(self, num_str):
        """
        解析数字字符串（处理万、千等单位）
        """
        if isinstance(num_str, int) or isinstance(num_str, float):
            return int(num_str)
        
        try:
            if '万' in num_str:
                num = float(num_str.replace('万', '').replace('播放', '').strip())
                return int(num * 10000)
            elif '千' in num_str:
                num = float(num_str.replace('千', '').replace('播放', '').strip())
                return int(num * 1000)
            else:
                return int(num_str.replace('播放', '').replace(',', '').strip())
        except:
            return 0
    
    def get_cover_from_bvid(self, bvid):
        """
        通过BV号直接获取封面URL（备用方案）
        使用B站官方API获取视频信息
        """
        try:
            # 方法1: 使用view API直接获取
            url = f"https://api.bilibili.com/x/web-interface/view?bvid={bvid}"
            response = requests.get(url, headers=self.headers, timeout=10)
            if response.status_code == 200:
                data = response.json()
                if data.get('code') == 0:
                    pic_url = data.get('data', {}).get('pic', '')
                    if pic_url:
                        return pic_url
        except Exception as e:
            print(f"    方法1获取封面失败: {e}")
        
        try:
            # 方法2: 使用pagelist获取CID，再获取封面
            url = f"https://api.bilibili.com/x/player/pagelist?bvid={bvid}"
            response = requests.get(url, headers=self.headers, timeout=10)
            if response.status_code == 200:
                data = response.json()
                if data.get('code') == 0:
                    cid = data.get('data', {}).get('list', [{}])[0].get('cid', '')
                    if cid:
                        # 使用cid和bvid获取详情
                        url2 = f"https://api.bilibili.com/x/web-interface/view?bvid={bvid}&cid={cid}"
                        response2 = requests.get(url2, headers=self.headers, timeout=10)
                        if response2.status_code == 200:
                            data2 = response2.json()
                            pic_url = data2.get('data', {}).get('pic', '')
                            if pic_url:
                                return pic_url
        except Exception as e:
            print(f"    方法2获取封面失败: {e}")
        
        return None

    def download_cover(self, pic_url, bvid):
        """
        下载视频封面 - 优化版本
        支持多种获取方式和备用方案
        """
        # 检查BV号是否有效
        if not bvid:
            print(f"  BV号无效，无法下载封面")
            return None
        
        filename = f"{bvid}.jpg"
        filepath = os.path.join(self.covers_dir, filename)
        
        # 如果已存在则跳过
        if os.path.exists(filepath):
            print(f"  封面已存在: {filename}")
            return filepath
        
        # 尝试多种封面URL
        cover_urls = []
        
        if pic_url:
            # 确保URL是http或https
            if pic_url.startswith('//'):
                pic_url = 'https:' + pic_url
            cover_urls.append(pic_url)
            
            # 添加不同质量的封面URL (320w, 226w 等)
            if 'bilibili' in pic_url or 'hdslb' in pic_url:
                # 尝试不同的缩略图大小
                for size in ['_ic6', '_lit', '', '_web']:
                    if size:
                        modified_url = pic_url.replace('.jpg', f'{size}.jpg')
                        if modified_url not in cover_urls:
                            cover_urls.append(modified_url)
        
        # 添加备用URL格式
        cover_urls.extend([
            f"https://i0.hdslb.com/bfs/archive/{bvid}.jpg",
            f"https://i1.hdslb.com/bfs/archive/{bvid}.jpg",
            f"https://i2.hdslb.com/bfs/archive/{bvid}.jpg",
        ])
        
        # 尝试下载封面
        for url in cover_urls:
            if not url or not url.startswith('http'):
                continue
            
            try:
                response = requests.get(url, headers=self.headers, timeout=10, allow_redirects=True)
                if response.status_code == 200 and len(response.content) > 1000:  # 确保下载到的是图片
                    with open(filepath, 'wb') as f:
                        f.write(response.content)
                    print(f"  下载封面成功: {filename}")
                    return filepath
                else:
                    print(f"  尝试URL: {url[:50]}... 状态: {response.status_code}")
            except Exception as e:
                continue
        
        # 如果以上都失败，尝试使用BV号直接获取封面
        print(f"  尝试通过BV号获取封面...")
        alternative_url = self.get_cover_from_bvid(bvid)
        if alternative_url:
            return self.download_cover(alternative_url, bvid)
        
        print(f"  封面下载失败: {bvid}")
        return None
    
    def format_date(self, timestamp):
        """
        格式化时间戳
        """
        try:
            return datetime.fromtimestamp(timestamp).strftime('%Y-%m-%d %H:%M:%S')
        except:
            return ''
    
    def format_duration(self, seconds):
        """
        格式化时长
        """
        try:
            if ':' in str(seconds):
                return seconds
            minutes = seconds // 60
            secs = seconds % 60
            return f"{minutes}:{secs:02d}"
        except:
            return seconds
    
    def create_excel(self, videos, filename='鸣潮热门视频.xlsx'):
        """
        创建Excel表格
        """
        if not videos:
            print("没有视频数据可导出")
            return None
        
        # 按播放量排序，取TOP 10
        sorted_videos = sorted(videos, key=lambda x: x['play_count'], reverse=True)[:10]
        
        # 创建工作簿
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = "鸣潮热门视频TOP10"
        
        # 设置列标题
        headers = ['排名', '视频标题', '作者', 'BV号', '播放量', '时长', '发布时间', '弹幕数', '点赞数', '视频链接']
        
        # 写入表头
        for col, header in enumerate(headers, start=1):
            cell = ws.cell(row=1, column=col)
            cell.value = header
            # 设置表头样式
            cell.font = Font(name='微软雅黑', size=11, bold=True, color='FFFFFF')
            cell.fill = PatternFill(start_color='4472C4', end_color='4472C4', fill_type='solid')
            cell.alignment = Alignment(horizontal='center', vertical='center')
        
        # 设置列宽
        ws.column_dimensions['A'].width = 6
        ws.column_dimensions['B'].width = 40
        ws.column_dimensions['C'].width = 15
        ws.column_dimensions['D'].width = 12
        ws.column_dimensions['E'].width = 10
        ws.column_dimensions['F'].width = 8
        ws.column_dimensions['G'].width = 18
        ws.column_dimensions['H'].width = 8
        ws.column_dimensions['I'].width = 8
        ws.column_dimensions['J'].width = 45
        
        # 写入数据
        for row_idx, video in enumerate(sorted_videos, start=2):
            ws.cell(row=row_idx, column=1, value=video['index'])
            ws.cell(row=row_idx, column=2, value=video['title'])
            ws.cell(row=row_idx, column=3, value=video['author'])
            ws.cell(row=row_idx, column=4, value=video['bvid'])
            ws.cell(row=row_idx, column=5, value=video['play_str'])
            ws.cell(row=row_idx, column=6, value=video['duration'])
            ws.cell(row=row_idx, column=7, value=self.format_date(video['pubdate']))
            ws.cell(row=row_idx, column=8, value=video['video_review'])
            ws.cell(row=row_idx, column=9, value=video['likes'])
            ws.cell(row=row_idx, column=10, value=video['url'])
            
            # 设置行高（为了显示封面图片）
            ws.row_dimensions[row_idx].height = 100
        
        # 添加超链接
        for row_idx in range(2, len(sorted_videos) + 2):
            link_cell = ws.cell(row=row_idx, column=10)
            link_cell.hyperlink = sorted_videos[row_idx-2]['url']
            link_cell.style = "Hyperlink"
        
        # 保存Excel文件
        output_path = os.path.join(self.base_dir, filename)
        wb.save(output_path)
        print(f"\n[OK] Excel表格已生成: {filename}")
        
        return output_path
    
    def run(self):
        """
        执行完整流程
        """
        print("=" * 60)
        print("B站鸣潮热门视频采集工具")
        print("=" * 60)
        print()
        
        # 1. 搜索视频
        search_results = self.search_videos('鸣潮', page_size=50)
        
        if not search_results:
            print("\n⚠ 搜索失败或无结果")
            print("\n提示：")
            print("1. 检查网络连接")
            print("2. B站可能限制了API访问，请稍后再试")
            return
        
        # 2. 解析视频信息
        videos = self.parse_video_info(search_results)
        
        if not videos:
            print("\n⚠ 未解析到视频信息")
            return
        
        print(f"\n共解析到 {len(videos)} 个视频")
        
        # 3. 按播放量排序，取TOP 10
        sorted_videos = sorted(videos, key=lambda x: x['play_count'], reverse=True)[:10]
        
        print("\n" + "=" * 60)
        print("TOP 10 热门视频")
        print("=" * 60)
        
        for video in sorted_videos:
            print(f"\n{video['index']}. {video['title'][:30]}...")
            print(f"   作者: {video['author']}")
            print(f"   播放量: {video['play_str']}")
            print(f"   BV号: {video['bvid']}")
        
        # 4. 下载封面图片
        print("\n" + "=" * 60)
        print("开始下载封面图片...")
        print("=" * 60)
        
        for video in sorted_videos:
            cover_path = self.download_cover(video['pic'], video['bvid'])
            video['cover_path'] = cover_path
            time.sleep(0.5)  # 避免请求过快
        
        # 5. 生成Excel表格
        print("\n" + "=" * 60)
        print("生成Excel表格...")
        print("=" * 60)
        
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        excel_filename = f"鸣潮热门视频TOP10_{timestamp}.xlsx"
        self.create_excel(sorted_videos, excel_filename)
        
        # 6. 生成汇总报告
        self.generate_summary(sorted_videos, excel_filename)
        
        print("\n" + "=" * 60)
        print("✓ 采集完成！")
        print("=" * 60)
        print(f"\n生成的文件：")
        print(f"1. Excel表格: {excel_filename}")
        print(f"2. 封面图片: covers/ 目录")
        
    def generate_summary(self, videos, excel_filename):
        """
        生成汇总报告
        """
        summary_filename = excel_filename.replace('.xlsx', '_报告.txt')
        
        with open(summary_filename, 'w', encoding='utf-8') as f:
            f.write("=" * 60 + "\n")
            f.write("鸣潮热门视频TOP10 采集报告\n")
            f.write(f"采集时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
            f.write("=" * 60 + "\n\n")
            
            for video in videos:
                f.write(f"【排名 {video['index']}】\n")
                f.write(f"标题: {video['title']}\n")
                f.write(f"作者: {video['author']}\n")
                f.write(f"BV号: {video['bvid']}\n")
                f.write(f"播放量: {video['play_str']}\n")
                f.write(f"时长: {video['duration']}\n")
                f.write(f"弹幕数: {video['video_review']}\n")
                f.write(f"点赞数: {video['likes']}\n")
                f.write(f"链接: {video['url']}\n")
                f.write(f"封面: {video['pic']}\n")
                f.write("-" * 60 + "\n\n")
        
        print(f"✓ 汇总报告已生成: {summary_filename}")

def main():
    """
    主函数
    """
    scraper = BilibiliVideoScraper()
    scraper.run()

if __name__ == "__main__":
    main()
