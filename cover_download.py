#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""完整测试B站视频封面获取流程"""

import requests
import os
import sys

# 添加当前目录到路径
sys.path.insert(0, os.path.dirname(__file__))

from bilibili_mingchao_scraper import BilibiliVideoScraper

def test_search():
    """测试搜索功能"""
    print("=" * 60)
    print("测试1: 搜索视频功能")
    print("=" * 60)
    
    scraper = BilibiliVideoScraper()
    results = scraper.search_videos('鸣潮', page_size=10)
    
    if results:
        print(f"✓ 搜索成功，获取到 {len(results)} 个视频")
        return results
    else:
        print("✗ 搜索失败")
        return []

def test_parse_video_info(results):
    """测试解析视频信息"""
    print("\n" + "=" * 60)
    print("测试2: 解析视频信息")
    print("=" * 60)
    
    scraper = BilibiliVideoScraper()
    videos = scraper.parse_video_info(results)
    
    if videos:
        print(f"✓ 解析成功，获取到 {len(videos)} 个视频")
        for v in videos[:3]:
            print(f"  - {v['bvid']}: {v['title'][:20]}...")
        return videos
    else:
        print("✗ 解析失败")
        return []

def test_download_cover(videos):
    """测试下载封面"""
    print("\n" + "=" * 60)
    print("测试3: 下载封面")
    print("=" * 60)
    
    scraper = BilibiliVideoScraper()
    
    # 取前3个视频测试
    test_videos = videos[:3]
    
    for video in test_videos:
        bvid = video['bvid']
        pic_url = video.get('pic', '')
        
        print(f"\n测试视频: {bvid}")
        print(f"  封面URL: {pic_url}")
        
        cover_path = scraper.download_cover(pic_url, bvid)
        
        if cover_path and os.path.exists(cover_path):
            size = os.path.getsize(cover_path)
            print(f"  ✓ 下载成功: {cover_path} ({size} bytes)")
        else:
            print(f"  ✗ 下载失败")

def test_get_cover_from_bvid():
    """测试通过BV号获取封面"""
    print("\n" + "=" * 60)
    print("测试4: 通过BV号获取封面")
    print("=" * 60)
    
    scraper = BilibiliVideoScraper()
    
    # 测试已知的BV号
    test_bvids = ['BV1a29jBeE7h', 'BV1aP9jBAEvR']
    
    for bvid in test_bvids:
        print(f"\n测试BV号: {bvid}")
        
        # 先尝试通过API获取封面URL
        url = f"https://api.bilibili.com/x/web-interface/view?bvid={bvid}"
        try:
            response = requests.get(url, headers=scraper.headers, timeout=10)
            if response.status_code == 200:
                data = response.json()
                if data.get('code') == 0:
                    pic_url = data.get('data', {}).get('pic', '')
                    print(f"  封面URL: {pic_url}")
                    
                    # 下载封面
                    cover_path = scraper.download_cover(pic_url, bvid)
                    if cover_path and os.path.exists(cover_path):
                        size = os.path.getsize(cover_path)
                        print(f"  ✓ 下载成功: {cover_path} ({size} bytes)")
                    else:
                        print(f"  ✗ 下载失败")
                else:
                    print(f"  API错误: {data.get('message')}")
        except Exception as e:
            print(f"  错误: {e}")

def main():
    print("\n" + "=" * 60)
    print("B站视频封面获取 - 完整测试")
    print("=" * 60)
    
    # 测试1: 搜索
    results = test_search()
    if not results:
        print("\n无法获取搜索结果，尝试使用备用BV号进行测试")
        test_get_cover_from_bvid()
        return
    
    # 测试2: 解析
    videos = test_parse_video_info(results)
    if not videos:
        print("\n无法解析视频信息")
        return
    
    # 测试3: 下载封面
    test_download_cover(videos)
    
    # 测试4: 通过BV号获取
    test_get_cover_from_bvid()
    
    print("\n" + "=" * 60)
    print("测试完成!")
    print("=" * 60)

if __name__ == "__main__":
    main()
