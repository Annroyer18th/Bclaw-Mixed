<template>
  <div class="download-cover">
    <!-- 顶部操作栏 -->
    <div class="top-bar">
      <h2>获取封面</h2>
      <div class="path-selector">
        <el-button type="default" size="default" @click="selectSaveFolder">
          <el-icon><FolderOpened /></el-icon>
          选择保存文件夹
        </el-button>
        <div class="current-path" v-if="customSavePath">{{ customSavePath }}</div>
        <div class="current-path default-path" v-else>默认: {{ defaultSavePath }}</div>
      </div>
    </div>

    <!-- 获取封面交互框 -->
    <div class="form-card">
      <el-form :model="form" label-width="100px" size="large" @submit.prevent>
        <el-form-item label="BV号">
          <el-input
            v-model="form.bvid"
            placeholder="请输入BV号，按回车添加到队列"
            clearable
            :prefix-icon="VideoPlay"
            @keyup.enter="addToQueue"
          />
          <div class="input-tip">输入BV号后按回车添加到队列，单次最多10个</div>
          
          <!-- BV号队列显示 -->
          <div class="bvid-queue" v-if="bvidQueue.length > 0">
            <div class="queue-header">
              <span>已添加 {{ bvidQueue.length }} 个BV号（最多10个）</span>
              <el-button type="danger" link size="small" @click="clearQueue">
                清空队列
              </el-button>
            </div>
            <div class="queue-list">
              <el-tag
                v-for="(item, index) in bvidQueue"
                :key="index"
                closable
                @close="removeFromQueue(index)"
                type="primary"
                effect="plain"
                style="margin-right: 8px; margin-bottom: 8px;"
              >
                {{ item }}
              </el-tag>
            </div>
          </div>
          
          <div class="bvid-count" v-if="bvidQueue.length >= 10" style="color: #f56c6c;">
            已达到最大数量限制（10个）
          </div>
        </el-form-item>

        <el-form-item>
          <el-button
            type="primary"
            size="large"
            :loading="loading"
            :disabled="bvidQueue.length === 0"
            @click="handleDownload"
            style="width: 100%"
          >
            {{ loading ? `正在获取...(${currentProgress}/${totalCount})` : `开始获取（${bvidQueue.length}个）` }}
          </el-button>
        </el-form-item>
      </el-form>
    </div>

    <!-- 结果展示 -->
    <div v-if="coverResults.length > 0" class="result-card">
      <!-- 左右切换箭头 -->
      <div class="result-nav" v-if="coverResults.length > 1">
        <el-button 
          class="nav-btn nav-prev" 
          :icon="ArrowLeft" 
          circle 
          @click="prevResult"
        />
        <div class="result-indicator">
          第 {{ currentIndex + 1 }} / {{ coverResults.length }} 个
        </div>
        <el-button 
          class="nav-btn nav-next" 
          :icon="ArrowRight" 
          circle 
          @click="nextResult"
        />
      </div>

      <!-- 结果卡片 with 动画 -->
      <Transition name="fade-up" mode="out-in">
        <div class="result-content" :key="currentIndex">
          <h3>视频信息</h3>
          <el-descriptions :column="1" border>
            <el-descriptions-item label="视频标题">{{ currentResult.videoInfo.title }}</el-descriptions-item>
            <el-descriptions-item label="作者">{{ currentResult.videoInfo.author }}</el-descriptions-item>
            <el-descriptions-item label="BV号">{{ currentResult.videoInfo.bvid }}</el-descriptions-item>
            <el-descriptions-item label="链接">
              <el-link type="primary" :href="currentResult.videoInfo.url" target="_blank">
                {{ currentResult.videoInfo.url }}
              </el-link>
            </el-descriptions-item>
            <el-descriptions-item label="封面">
              <div v-if="currentResult.coverPath" class="cover-preview">
                <img :src="`file://${currentResult.coverPath}`" alt="封面" class="cover-image" />
                <div class="cover-actions">
                  <el-button type="primary" size="small" @click="openCoverFolder">
                    打开封面文件夹
                  </el-button>
                </div>
              </div>
              <span v-else-if="currentResult.error" style="color: #f56c6c;">
                获取失败: {{ currentResult.error }}
              </span>
              <span v-else>封面下载中...</span>
            </el-descriptions-item>
          </el-descriptions>
        </div>
      </Transition>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { VideoPlay, ArrowLeft, ArrowRight, FolderOpened } from '@element-plus/icons-vue'

const emit = defineEmits<{
  log: [message: string]
}>()

const loading = ref(false)
const form = ref({ bvid: '' })
const bvidQueue = ref<string[]>([])  // BV号队列
const coverResults = ref<any[]>([])
const currentIndex = ref(0)
const customSavePath = ref('')
const defaultSavePath = ref('')
const currentProgress = ref(0)
const totalCount = ref(0)

// 获取默认保存路径
;(window as any).electronAPI.getCover({ getDefaultPath: true }).then((result: any) => {
  if (result.success && result.defaultPath) {
    defaultSavePath.value = result.defaultPath
  }
})

const currentResult = computed(() => {
  return coverResults.value[currentIndex.value] || null
})

// 添加BV号到队列
function addToQueue() {
  const bvid = form.value.bvid.trim().toUpperCase()
  
  if (!bvid) {
    ElMessage.warning('请输入BV号')
    return
  }
  
  // 校验BV号格式：以BV开头，后跟字母数字组合（通常10-12位）
  if (!bvid.startsWith('BV') || bvid.length < 10) {
    ElMessage.warning('BV号格式不正确，请以BV开头，后跟字母数字组合')
    return
  }
  
  // 检查是否已存在
  if (bvidQueue.value.includes(bvid)) {
    ElMessage.warning('该BV号已在队列中')
    form.value.bvid = ''
    return
  }
  
  // 检查队列长度
  if (bvidQueue.value.length >= 10) {
    ElMessage.error('单次最多支持10个BV号')
    return
  }
  
  // 添加到队列
  bvidQueue.value.push(bvid)
  form.value.bvid = ''  // 清空输入框
  ElMessage.success(`已添加 ${bvid} 到队列`)
}

// 从队列中删除
function removeFromQueue(index: number) {
  const removed = bvidQueue.value.splice(index, 1)
  ElMessage.info(`已移除 ${removed[0]}`)
}

// 清空队列
function clearQueue() {
  bvidQueue.value = []
  ElMessage.info('队列已清空')
}

async function handleDownload() {
  if (bvidQueue.value.length === 0) {
    ElMessage.warning('请先添加BV号到队列')
    return
  }

  loading.value = true
  coverResults.value = []
  currentIndex.value = 0
  totalCount.value = bvidQueue.value.length
  currentProgress.value = 0
  
  emit('log', `开始批量获取 ${bvidQueue.value.length} 个BV号`)
  emit('log', `BV号列表: ${bvidQueue.value.join(', ')}`)

  try {
    const savePath = customSavePath.value || undefined
    const results = []
    
    for (let i = 0; i < bvidQueue.value.length; i++) {
      const bvid = bvidQueue.value[i]
      currentProgress.value = i + 1
      emit('log', `正在获取第 ${i + 1}/${bvidQueue.value.length} 个: ${bvid}`)
      
      try {
        emit('log', `调用API: electronAPI.getCover({ bvid: ${bvid}, savePath: ${savePath || 'default'} })`)
        
        const result = await (window as any).electronAPI.getCover({ 
          bvid, 
          savePath 
        })
        
        emit('log', `API返回结果: ${JSON.stringify(result)}`)
        
        if (result.success) {
          results.push({
            videoInfo: result.videoInfo,
            coverPath: result.coverPath || ''
          })
          emit('log', `获取成功 ${bvid}: ${result.coverPath}`)
        } else {
          results.push({
            videoInfo: { bvid, title: '获取失败', author: '-', url: '' },
            coverPath: '',
            error: result.message
          })
          emit('log', `获取失败 ${bvid}: ${result.message}`)
        }
      } catch (error: any) {
        emit('log', `API调用异常 ${bvid}: ${error.message}`)
        results.push({
          videoInfo: { bvid, title: '获取失败', author: '-', url: '' },
          coverPath: '',
          error: error.message
        })
        emit('log', `获取失败 ${bvid}: ${error.message}`)
      }
      
      // 添加延迟避免被限流
      if (i < bvidQueue.value.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }
    
    coverResults.value = results
    const successCount = results.filter(r => r.coverPath).length
    ElMessage.success(`批量获取完成！成功 ${successCount}/${bvidQueue.value.length}`)
    emit('log', `批量获取完成！成功 ${successCount}/${bvidQueue.value.length}`)
    
    // 清空队列
    bvidQueue.value = []
    
  } catch (error: any) {
    ElMessage.error(`批量获取失败: ${error.message}`)
    emit('log', `批量获取失败: ${error.message}`)
  } finally {
    loading.value = false
  }
}

function prevResult() {
  if (coverResults.value.length === 0) return
  currentIndex.value = (currentIndex.value - 1 + coverResults.value.length) % coverResults.value.length
}

function nextResult() {
  if (coverResults.value.length === 0) return
  currentIndex.value = (currentIndex.value + 1) % coverResults.value.length
}

async function selectSaveFolder() {
  try {
    const result = await (window as any).electronAPI.selectFolder()
    if (result && result.success && result.path) {
      customSavePath.value = result.path
      ElMessage.success(`保存路径已设置为: ${result.path}`)
    }
  } catch (error: any) {
    ElMessage.error(`选择文件夹失败: ${error.message}`)
  }
}

function openCoverFolder() {
  const result = currentResult.value
  if (result && result.coverPath) {
    ;(window as any).electronAPI.openFile(result.coverPath)
  } else if (defaultSavePath.value) {
    ;(window as any).electronAPI.openFile(defaultSavePath.value)
  } else {
    ElMessage.info('请先获取封面')
  }
}
</script>

<style scoped>
.download-cover {
  max-width: 900px;
}

/* 顶部操作栏 */
.top-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding: 15px 20px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
}

.top-bar h2 {
  margin: 0;
  color: #303133;
  font-size: 20px;
}

.path-selector {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 5px;
}

.current-path {
  font-size: 11px;
  color: #909399;
  max-width: 300px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.default-path {
  color: #c0c4cc;
}

/* 表单卡片 */
.form-card {
  background: white;
  border-radius: 12px;
  padding: 30px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  margin-bottom: 20px;
}

.input-tip {
  font-size: 12px;
  color: #909399;
  margin-top: 5px;
}

/* BV号队列 */
.bvid-queue {
  margin-top: 10px;
  padding: 12px;
  background: #f5f7fa;
  border-radius: 8px;
  border: 1px solid #e4e7ed;
}

.queue-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
  font-size: 13px;
  color: #606266;
  font-weight: 500;
}

.queue-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

/* 结果卡片 */
.result-card {
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  position: relative;
}

.result-card h3 {
  margin-bottom: 15px;
  color: #303133;
  font-size: 16px;
}

/* 结果导航 */
.result-nav {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 20px;
  margin-bottom: 15px;
}

.nav-btn {
  font-size: 18px;
}

.result-indicator {
  font-size: 14px;
  color: #606266;
  font-weight: 500;
}

/* 封面预览 */
.cover-preview {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.cover-image {
  max-width: 320px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.cover-actions {
  display: flex;
  gap: 10px;
}

/* 向上浮现动画 */
.fade-up-enter-active {
  animation: fadeUpIn 0.3s ease-out;
}

.fade-up-leave-active {
  animation: fadeUpOut 0.2s ease-in;
}

@keyframes fadeUpIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes fadeUpOut {
  from {
    opacity: 1;
    transform: translateY(0);
  }
  to {
    opacity: 0;
    transform: translateY(-20px);
  }
}
</style>
