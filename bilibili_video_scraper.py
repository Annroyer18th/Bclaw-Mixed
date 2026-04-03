#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
B站鸣潮热门视频爬取脚本
由于B站反爬虫机制，需要手动配合操作
"""

import time
import csv
import requests
from datetime import datetime
import json

class BilibiliScraper:
    def __init__(self):
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': 'application/json',
            'Referer': 'https://www.bilibili.com'
        }
        
    def search_mingchao_videos(self, page=1, page_size=20):
        """
        搜索鸣潮相关视频
        注意：此方法可能因反爬虫被限制
        """
        search_url = "https://api.bilibili.com/x/web-interface/search/type"
        params = {
            'search_type': 'video',
            'keyword': '鸣潮',
            'page': page,
            'page_size': page_size
        }
        
        try:
            response = requests.get(search_url, headers=self.headers, params=params)
            if response.status_code == 200:
                data = response.json()
                if data.get('code') == 0:
                    return data.get('data', {}).get('result', [])
            else:
                print(f"请求失败，状态码: {response.status_code}")
        except Exception as e:
            print(f"搜索出错: {e}")
        
        return []
    
    def extract_video_info(self, video_data):
        """提取视频信息"""
        info = []
        for video in video_data:
            try:
                # 解析标题（去除HTML标签）
                title = video.get('title', '')
                title = title.replace('<em class="keyword">', '').replace('</em>', '')
                
                video_info = {
                    '标题': title,
                    '作者': video.get('author', ''),
                    '播放量': video.get('play', 0),
                    '时长': video.get('duration', ''),
                    'BV号': video.get('bvid', ''),
                    '链接': f"https://www.bilibili.com/video/{video.get('bvid', '')}",
                    '封面URL': video.get('pic', ''),
                    '上传时间': video.get('pubdate', ''),
                    '弹幕数': video.get('video_review', 0),
                    '点赞数': video.get('like', 0)
                }
                info.append(video_info)
            except Exception as e:
                print(f"解析视频信息出错: {e}")
                continue
        
        return info
    
    def download_image(self, url, save_path):
        """下载封面图片"""
        try:
            response = requests.get(url, headers=self.headers, timeout=10)
            if response.status_code == 200:
                with open(save_path, 'wb') as f:
                    f.write(response.content)
                return True
        except Exception as e:
            print(f"下载图片失败 {url}: {e}")
        return False
    
    def export_to_csv(self, video_info_list, filename='mingchao_videos.csv'):
        """导出到CSV文件"""
        if not video_info_list:
            print("没有视频数据可导出")
            return False
        
        # 按播放量排序，取前10个
        sorted_videos = sorted(video_info_list, key=lambda x: x['播放量'], reverse=True)[:10]
        
        with open(filename, 'w', newline='', encoding='utf-8-sig') as f:
            writer = csv.DictWriter(f, fieldnames=sorted_videos[0].keys())
            writer.writeheader()
            writer.writerows(sorted_videos)
        
        print(f"已导出 {len(sorted_videos)} 个视频到 {filename}")
        return True

def manual_input_mode():
    """
    手动输入模式
    当API被限制时，手动获取视频信息
    """
    print("\n=== 手动输入模式 ===")
    print("请手动在浏览器中打开B站，搜索'鸣潮'，找到热门视频")
    print("然后输入视频信息（输入'q'退出）：\n")
    
    videos = []
    video_num = 1
    
    while True:
        print(f"\n--- 视频 #{video_num} ---")
        bv = input("BV号（如：BV1xx411c7mD）或输入'q'退出: ").strip()
        
        if bv.lower() == 'q':
            break
        
        if not bv.startswith('BV'):
            print("请输入有效的BV号")
            continue
        
        title = input("视频标题: ").strip()
        author = input("作者: ").strip()
        play = input("播放量（数字）: ").strip()
        duration = input("时长（如：12:34）: ").strip()
        cover_url = input("封面图片URL（可留空）: ").strip()
        
        video_info = {
            '标题': title,
            '作者': author,
            '播放量': int(play) if play.isdigit() else 0,
            '时长': duration,
            'BV号': bv,
            '链接': f"https://www.bilibili.com/video/{bv}",
            '封面URL': cover_url,
            '上传时间': '',
            '弹幕数': 0,
            '点赞数': 0
        }
        
        videos.append(video_info)
        video_num += 1
        
        if len(videos) >= 10:
            print(f"已收集 {len(videos)} 个视频")
            cont = input("继续输入？(y/n): ").strip().lower()
            if cont != 'y':
                break
    
    return videos

def main():
    scraper = BilibiliScraper()
    
    print("=" * 60)
    print("B站鸣潮热门视频爬取工具")
    print("=" * 60)
    
    # 尝试API搜索
    print("\n尝试通过API搜索...")
    video_data = scraper.search_mingchao_videos()
    
    if video_data:
        print(f"成功获取到 {len(video_data)} 个视频")
        video_info_list = scraper.extract_video_info(video_data)
        
        # 下载封面图片
        print("\n下载封面图片...")
        for idx, video in enumerate(video_info_list[:10]):
            if video['封面URL']:
                filename = f"covers/{video['BV号']}.jpg"
                scraper.download_image(video['封面URL'], filename)
                print(f"  [{idx+1}/10] {video['标题'][:20]}... - 已下载")
        
        # 导出CSV
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        csv_filename = f"mingchao_videos_{timestamp}.csv"
        scraper.export_to_csv(video_info_list, csv_filename)
        
    else:
        print("\nAPI获取失败，切换到手动输入模式...")
        videos = manual_input_mode()
        
        if videos:
            # 按播放量排序
            videos_sorted = sorted(videos, key=lambda x: x['播放量'], reverse=True)[:10]
            
            # 导出CSV
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            csv_filename = f"mingchao_videos_manual_{timestamp}.csv"
            
            with open(csv_filename, 'w', newline='', encoding='utf-8-sig') as f:
                writer = csv.DictWriter(f, fieldnames=videos_sorted[0].keys())
                writer.writeheader()
                writer.writerows(videos_sorted)
            
            print(f"\n已导出 {len(videos_sorted)} 个视频到 {csv_filename}")
            
            # 下载封面
            if input("\n是否下载封面图片？(y/n): ").strip().lower() == 'y':
                import os
                os.makedirs('covers', exist_ok=True)
                for video in videos_sorted:
                    if video['封面URL']:
                        scraper.download_image(video['封面URL'], f"covers/{video['BV号']}.jpg")
    
    print("\n完成！")

if __name__ == "__main__":
    # 创建covers目录
    import os
    os.makedirs('covers', exist_ok=True)
    
    main()
