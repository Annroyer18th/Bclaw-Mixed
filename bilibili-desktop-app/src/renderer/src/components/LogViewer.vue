<template>
  <div :class="['log-viewer', { collapsed: isCollapsed }]">
    <div class="log-header" @click="toggleCollapse">
      <div class="log-title">
        <el-icon><Monitor /></el-icon>
        <span>运行日志</span>
        <el-badge :value="logCount" :hidden="logCount === 0" class="log-badge" />
      </div>
      <div class="log-actions">
        <el-button
          v-if="!isCollapsed"
          type="text"
          size="small"
          @click.stop="clearLogs"
        >
          清除
        </el-button>
        <el-icon class="collapse-icon">
          <ArrowDown v-if="!isCollapsed" />
          <ArrowUp v-else />
        </el-icon>
      </div>
    </div>

    <div v-if="!isCollapsed" class="log-content" ref="logContentRef">
      <div
        v-for="(log, index) in logs"
        :key="index"
        :class="['log-item', `log-${log.type}`]"
      >
        <span class="log-time">{{ log.timestamp }}</span>
        <span class="log-type">[{{ typeLabels[log.type] }}]</span>
        <pre class="log-message">{{ log.content }}</pre>
      </div>
      <div v-if="logs.length === 0" class="log-empty">
        暂无日志信息
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import { Monitor, ArrowDown, ArrowUp } from '@element-plus/icons-vue'

interface LogMessage {
  type: 'info' | 'success' | 'error' | 'warning'
  content: string
  timestamp: string
}

const logs = ref<LogMessage[]>([])
const isCollapsed = ref(false)
const logContentRef = ref<HTMLElement | null>(null)
const logCount = ref(0)

const typeLabels = {
  info: '信息',
  success: '成功',
  error: '错误',
  warning: '警告'
}

let unsubscribe: (() => void) | null = null

onMounted(() => {
  // 监听主进程发送的日志
  if (window.electronAPI && window.electronAPI.onLogMessage) {
    unsubscribe = window.electronAPI.onLogMessage((data: LogMessage) => {
      logs.value.push(data)
      logCount.value = logs.value.length
      scrollToBottom()
    })
  }
})

onUnmounted(() => {
  if (unsubscribe) {
    unsubscribe()
  }
})

function addLog(log: LogMessage) {
  logs.value.push(log)
  logCount.value = logs.value.length
  scrollToBottom()
}

function clearLogs() {
  logs.value = []
  logCount.value = 0
}

function toggleCollapse() {
  isCollapsed.value = !isCollapsed.value
}

async function scrollToBottom() {
  await nextTick()
  if (logContentRef.value) {
    logContentRef.value.scrollTop = logContentRef.value.scrollHeight
  }
}

defineExpose({
  addLog,
  clearLogs
})
</script>

<style scoped>
.log-viewer {
  background: #1e1e1e;
  border-top: 1px solid #3c3c3c;
  display: flex;
  flex-direction: column;
  transition: all 0.3s ease;
}

.log-viewer.collapsed {
  height: auto;
}

.log-header {
  height: 40px;
  min-height: 40px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 15px;
  background: #252526;
  cursor: pointer;
  user-select: none;
  border-bottom: 1px solid #3c3c3c;
}

.log-title {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #cccccc;
  font-size: 13px;
  font-weight: 500;
}

.log-badge {
  margin-left: 5px;
}

.log-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.collapse-icon {
  color: #cccccc;
  transition: transform 0.3s ease;
}

.log-content {
  flex: 1;
  overflow-y: auto;
  padding: 10px 15px;
  max-height: 300px;
  min-height: 100px;
}

.log-item {
  margin-bottom: 8px;
  line-height: 1.6;
  font-size: 13px;
  font-family: 'Consolas', 'Courier New', monospace;
}

.log-time {
  color: #666666;
  margin-right: 8px;
  font-size: 12px;
}

.log-type {
  margin-right: 8px;
  font-weight: 600;
}

.log-info .log-type {
  color: #3794ff;
}

.log-success .log-type {
  color: #4ec9b0;
}

.log-error .log-type {
  color: #f44747;
}

.log-warning .log-type {
  color: #ff8c00;
}

.log-message {
  color: #d4d4d4;
  margin: 0;
  white-space: pre-wrap;
  word-break: break-all;
  display: inline;
}

.log-empty {
  color: #666666;
  text-align: center;
  padding: 30px;
  font-size: 13px;
}
</style>
