# B站工具 - 桌面端应用

基于 Electron + Vue 3 开发的 B 站鸣潮热门视频采集工具桌面端版本。

## 功能特性

- **搜索热门视频**：搜索 B 站视频，获取播放量 TOP 10，自动下载封面，生成 Excel 报告和文本报告
- **获取封面**：输入 BV 号，获取视频信息并下载封面图片
- **实时日志**：实时显示程序运行状态和结果

## 技术栈

- Electron 28+
- Vue 3 + TypeScript
- Element Plus UI 库
- Vite 构建工具
- ExcelJS（Excel 生成）
- Axios（HTTP 请求）

## 开发环境搭建

### 安装依赖

```bash
cd bilibili-desktop-app
npm install
```

如果网络不好，可以使用淘宝镜像：

```bash
npm config set registry https://registry.npmmirror.com
npm install
```

### 开发模式运行

```bash
npm run dev
```

这将启动 Vite 开发服务器并打开 Electron 应用。

## 打包发布

### 打包为 Windows 可执行文件

```bash
npm run dist
```

打包后的文件将生成在 `release` 目录下。

### 打包为免安装版本

```bash
npm run pack
```

## 项目结构

```
bilibili-desktop-app/
├── src/
│   ├── main/              # Electron 主进程
│   │   ├── main.js        # 主进程入口
│   │   └── services/      # 后端服务
│   │       ├── bilibili-service.js  # B站API调用
│   │       ├── excel-service.js      # Excel生成
│   │       └── file-service.js       # 文件下载
│   ├── preload/           # 预加载脚本
│   │   └── preload.js
│   └── renderer/          # Vue 渲染进程
│       ├── index.html
│       └── src/
│           ├── App.vue     # 主应用组件
│           ├── main.ts     # Vue 入口
│           └── components/ # Vue 组件
├── assets/                # 静态资源
├── package.json
├── vite.config.js
└── README.md
```

## 使用说明

1. 启动应用后，左侧为功能导航栏
2. 选择"搜索热门视频"功能：
   - 输入搜索关键词（默认：鸣潮）
   - 选择获取数量（TOP 10/20/50）
   - 点击"开始搜索"按钮
   - 等待程序运行，查看底部日志区域
   - 运行完成后，结果会显示在中间区域
3. 选择"获取封面"功能：
   - 输入 BV 号（格式：BV 开头）
   - 点击"获取封面"按钮
   - 查看视频信息和下载的封面

## 输出文件

程序运行后生成的文件保存在 Electron 的用户数据目录下：

- **Excel 表格**：`鸣潮热门视频TOP10_时间戳.xlsx`
- **文本报告**：`鸣潮热门视频TOP10_时间戳_报告.txt`
- **封面图片**：`covers/` 目录，文件名格式为 `BV号.jpg`

## 注意事项

1. 本程序仅供学习交流使用，请遵守 B 站相关使用条款
2. 频繁请求可能会被 B 站限制，请合理使用
3. 如需修改请求间隔，请修改 `bilibili-service.js` 中的 `sleep()` 时间

## 许可证

MIT License
