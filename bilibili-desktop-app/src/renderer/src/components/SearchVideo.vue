<template>
  <div class="search-video">
    <div class="form-card">
      <el-form :model="form" label-width="100px" size="large">
        <el-form-item label="搜索关键词">
          <el-input
            v-model="form.keyword"
            placeholder="请输入搜索关键词"
            clearable
          />
        </el-form-item>

        <el-form-item label="获取数量">
          <el-select v-model="form.topN" style="width: 100%">
            <el-option label="TOP 10" :value="10" />
            <el-option label="TOP 20" :value="20" />
            <el-option label="TOP 50" :value="50" />
          </el-select>
        </el-form-item>

        <el-form-item>
          <el-button
            type="primary"
            size="large"
            :loading="loading"
            :disabled="!form.keyword"
            @click="handleSearch"
            style="width: 100%"
          >
            {{ loading ? '正在搜索...' : '开始搜索' }}
          </el-button>
        </el-form-item>
      </el-form>
    </div>

    <!-- 结果显示 -->
    <div v-if="results.length > 0" class="results-card">
      <h3>搜索结果 (TOP {{ results.length }})</h3>
      <el-table :data="results" style="width: 100%" max-height="400">
        <el-table-column type="index" label="排名" width="80" align="center" />
        <el-table-column prop="title" label="视频标题" min-width="250" show-overflow-tooltip />
        <el-table-column prop="author" label="作者" width="120" />
        <el-table-column prop="play_str" label="播放量" width="120" align="right" />
        <el-table-column label="操作" width="120" align="center">
          <template #default="scope">
            <el-button link type="primary" @click="openVideo(scope.row.url)">
              查看
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="result-actions" v-if="lastResult">
        <el-button type="success" @click="openFolder">
          打开输出文件夹
        </el-button>
        <el-button @click="clearResults">
          清空结果
        </el-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { ElMessage } from 'element-plus'

const emit = defineEmits<{
  log: [message: string]
}>()

const loading = ref(false)
const results = ref<any[]>([])
const lastResult = ref<any>(null)

const form = reactive({
  keyword: '鸣潮',
  topN: 10
})

async function handleSearch() {
  if (!form.keyword.trim()) {
    ElMessage.warning('请输入搜索关键词')
    return
  }

  loading.value = true
  results.value = []
  emit('log', `开始搜索关键词: ${form.keyword}`)

  try {
    const result = await (window as any).electronAPI.searchVideos({
      keyword: form.keyword.trim(),
      pageSize: 50,
      topN: form.topN
    })

    if (result.success) {
      results.value = result.videos || []
      lastResult.value = result
      ElMessage.success(`搜索完成，共找到 ${results.value.length} 个视频`)
      emit('log', `搜索完成！共找到 ${results.value.length} 个视频`)
    } else {
      ElMessage.error(result.message || '搜索失败')
      emit('log', `搜索失败: ${result.message}`)
    }
  } catch (error: any) {
    ElMessage.error(`搜索失败: ${error.message}`)
    emit('log', `搜索失败: ${error.message}`)
  } finally {
    loading.value = false
  }
}

function openVideo(url: string) {
  (window as any).electronAPI.openFile(url)
}

async function openFolder() {
  if (lastResult.value) {
    await (window as any).electronAPI.openFile(lastResult.value.excelPath)
  }
  ElMessage.info('文件已保存在应用数据目录')
}

function clearResults() {
  results.value = []
  lastResult.value = null
}
</script>

<style scoped>
.search-video {
  max-width: 900px;
}

.form-card {
  background: white;
  border-radius: 12px;
  padding: 30px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  margin-bottom: 20px;
}

.results-card {
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
}

.results-card h3 {
  margin-bottom: 15px;
  color: #303133;
  font-size: 16px;
}

.result-actions {
  margin-top: 15px;
  display: flex;
  gap: 10px;
}
</style>
