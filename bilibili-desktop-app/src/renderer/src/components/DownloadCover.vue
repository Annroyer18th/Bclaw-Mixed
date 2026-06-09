<template>
  <div class="download-cover">
    <div class="form-card">
      <el-form :model="form" label-width="100px" size="large">
        <el-form-item label="BV号">
          <el-input
            v-model="form.bvid"
            placeholder="请输入BV号，例如：BV1xx411c7mD"
            clearable
            :prefix-icon="VideoPlay"
            @keyup.enter="handleDownload"
          />
          <div class="input-tip">BV号格式：以 BV 开头，后跟10位字符</div>
        </el-form-item>

        <el-form-item>
          <el-button
            type="primary"
            size="large"
            :loading="loading"
            :disabled="!isValidBvid"
            @click="handleDownload"
            style="width: 100%"
          >
            {{ loading ? '正在获取...' : '获取封面' }}
          </el-button>
        </el-form-item>
      </el-form>
    </div>

    <!-- 结果展示 -->
    <div v-if="videoInfo" class="result-card">
      <h3>视频信息</h3>
      <el-descriptions :column="1" border>
        <el-descriptions-item label="视频标题">{{ videoInfo.title }}</el-descriptions-item>
        <el-descriptions-item label="作者">{{ videoInfo.author }}</el-descriptions-item>
        <el-descriptions-item label="BV号">{{ videoInfo.bvid }}</el-descriptions-item>
        <el-descriptions-item label="链接">
          <el-link type="primary" :href="videoInfo.url" target="_blank">
            {{ videoInfo.url }}
          </el-link>
        </el-descriptions-item>
        <el-descriptions-item label="封面">
          <div v-if="coverPath" class="cover-preview">
            <img :src="`file://${coverPath}`" alt="封面" class="cover-image" />
            <div class="cover-actions">
              <el-button type="primary" size="small" @click="openCoverFolder">
                打开封面文件夹
              </el-button>
            </div>
          </div>
          <span v-else>封面下载中...</span>
        </el-descriptions-item>
      </el-descriptions>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { VideoPlay } from '@element-plus/icons-vue'

const emit = defineEmits<{
  log: [message: string]
}>()

const loading = ref(false)
const form = ref({ bvid: '' })
const videoInfo = ref<any>(null)
const coverPath = ref('')

const isValidBvid = computed(() => {
  const bvid = form.value.bvid.trim().toUpperCase()
  return bvid.startsWith('BV') && bvid.length >= 10
})

async function handleDownload() {
  const bvid = form.value.bvid.trim()
  
  if (!isValidBvid.value) {
    ElMessage.warning('请输入正确的BV号格式（以BV开头）')
    return
  }

  loading.value = true
  videoInfo.value = null
  coverPath.value = ''
  emit('log', `开始获取 BV 号: ${bvid}`)

  try {
    const result = await (window as any).electronAPI.getCover(bvid)

    if (result.success) {
      videoInfo.value = result.videoInfo
      coverPath.value = result.coverPath || ''
      ElMessage.success('获取成功！')
      emit('log', `获取成功！封面已保存: ${result.coverPath}`)
    } else {
      ElMessage.error(result.message || '获取失败')
      emit('log', `获取失败: ${result.message}`)
    }
  } catch (error: any) {
    ElMessage.error(`获取失败: ${error.message}`)
    emit('log', `获取失败: ${error.message}`)
  } finally {
    loading.value = false
  }
}

function openCoverFolder() {
  ElMessage.info('封面已保存在应用的 covers 目录下')
}
</script>

<style scoped>
.download-cover {
  max-width: 900px;
}

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

.result-card {
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
}

.result-card h3 {
  margin-bottom: 15px;
  color: #303133;
  font-size: 16px;
}

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
</style>
