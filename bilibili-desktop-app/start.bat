@echo off
chcp 65001 > nul
echo 正在配置 npm 镜像...
npm config set registry https://registry.npmmirror.com

echo 正在安装依赖...
call npm install

if errorlevel 1 (
  echo.
  echo 依赖安装失败，请检查网络连接后重试
  pause
  exit /b 1
)

echo.
echo 依赖安装完成！
echo.
echo 正在启动开发模式...
call npm run dev

pause
