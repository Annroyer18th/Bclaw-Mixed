#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""测试B站封面获取功能"""

import requests
import os

# 测试B站API是否可用
headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Referer': 'https://www.bilibili.com'
}

# 测试一个已知的BV号
bvid = 'BV1a29jBeE7h'
url = f'https://api.bilibili.com/x/web-interface/view?bvid={bvid}'

print(f"测试BV号: {bvid}")
print(f"请求URL: {url}")

try:
    response = requests.get(url, headers=headers, timeout=10)
    print(f"状态码: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        code = data.get('code')
        print(f"API返回码: {code}")
        
        if code == 0:
            pic_url = data.get('data', {}).get('pic', '')
            print(f'封面URL: {pic_url}')
            
            # 测试下载封面
            if pic_url:
                if pic_url.startswith('//'):
                    pic_url = 'https:' + pic_url
                
                img_response = requests.get(pic_url, headers=headers, timeout=10)
                print(f"图片状态码: {img_response.status_code}")
                print(f"图片大小: {len(img_response.content)} bytes")
                
                if img_response.status_code == 200 and len(img_response.content) > 1000:
                    # 保存测试图片
                    test_dir = os.path.join(os.path.dirname(__file__), 'test-files')
                    os.makedirs(test_dir, exist_ok=True)
                    
                    filepath = os.path.join(test_dir, f'{bvid}_test.jpg')
                    with open(filepath, 'wb') as f:
                        f.write(img_response.content)
                    print(f"封面下载成功: {filepath}")
                else:
                    print("封面下载失败")
        else:
            msg = data.get('message', '')
            print(f'API错误: {msg}')
    else:
        print(f'请求失败: {response.status_code}')
except Exception as e:
    print(f'错误: {e}')

print("\n测试完成!")
