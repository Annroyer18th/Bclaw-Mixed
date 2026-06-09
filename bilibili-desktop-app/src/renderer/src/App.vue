<template>
  <div class="app-container">
    <!-- 左侧功能列表 -->
    <div class="sidebar">
      <div class="logo">
        <img src="/deepseek.svg" alt="Logo" class="logo-icon" />
        <span class="logo-text">B站工具</span>
      </div>
      <FunctionList @select="handleSelect" />
    </div>

    <!-- 右侧内容区 -->
    <div class="main-content">
      <!-- 顶部标题栏 -->
      <div class="header">
        <h1>{{ currentTitle }}</h1>
      </div>

      <!-- 中间交互区 -->
      <div class="content-area">
        <SearchVideo v-if="currentFeature === 'search'" @log="addLog" />
        <DownloadCover v-else-if="currentFeature === 'cover'" @log="addLog" />
      </div>

      <!-- 底部日志区 -->
      <LogViewer ref="logViewer" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import FunctionList from './components/FunctionList.vue'
import SearchVideo from './components/SearchVideo.vue'
import DownloadCover from './components/DownloadCover.vue'
import LogViewer from './components/LogViewer.vue'

const currentFeature = ref('search')
const logViewer = ref(null)

const currentTitle = computed(() => {
  return currentFeature.value === 'search' ? '搜索热门视频' : '获取视频封面'
})

function handleSelect(feature) {
  currentFeature.value = feature
}

function addLog(log) {
  if (logViewer.value) {
    logViewer.value.addLog(log)
  }
}
</script>

<style scoped>
.app-container {
  display: flex;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
}

.sidebar {
  width: 220px;
  min-width: 220px;
  height: 100vh;
  background: linear-gradient(180deg, #304156 0%, #1f2d3d 100%);
  display: flex;
  flex-direction: column;
  box-shadow: 2px 0 8px rgba(0, 0, 0, 0.15);
}

.logo {
  height: 60px;
  display: flex;
  align-items: center;
  padding: 0 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  gap: 12px;
}

.logo-icon {
  width: 32px;
  height: 32px;
}

.logo-text {
  color: white;
  font-size: 18px;
  font-weight: 600;
  letter-spacing: 1px;
}

.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: #f5f7fa;
  overflow: hidden;
}

.header {
  height: 60px;
  min-height: 60px;
  background: white;
  display: flex;
  align-items: center;
  padding: 0 30px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  border-bottom: 1px solid #e4e7ed;
}

.header h1 {
  font-size: 20px;
  font-weight: 600;
  color: #303133;
  margin: 0;
}

.content-area {
  flex: 1;
  padding: 30px;
  overflow-y: auto;
}
</style>
