const https = require('https');

const url = 'https://api.bilibili.com/x/web-interface/search/type?search_type=video&keyword=%E9%B8%A3%E6%BD%AE&page=1&page_size=3';

const options = {
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Referer': 'https://www.bilibili.com',
    'Accept': 'application/json, text/plain, */*'
  }
};

https.get(url, options, (res) => {
  let data = '';
  res.on('data', (d) => data += d);
  res.on('end', () => {
    try {
      const json = JSON.parse(data);
      if (json.data && json.data.result) {
        console.log('搜索结果中的封面URL:');
        json.data.result.slice(0, 3).forEach(v => {
          console.log(`BV号: ${v.bvid}`);
          console.log(`标题: ${v.title}`);
          console.log(`封面URL: ${v.pic}`);
          console.log('---');
        });
      }
    } catch (e) {
      console.error('解析错误:', e.message);
    }
  });
}).on('error', (e) => console.error('请求错误:', e.message));
