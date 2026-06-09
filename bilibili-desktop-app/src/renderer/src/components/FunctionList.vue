<template>
  <div class="function-list">
    <div
      v-for="item in functions"
      :key="item.id"
      :class="['function-item', { active: modelValue === item.id }]"
      @click="$emit('select', item.id)"
    >
      <el-icon :size="20">
        <component :is="item.icon" />
      </el-icon>
      <span class="function-name">{{ item.name }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { VideoPlay, PictureFilled } from '@element-plus/icons-vue'

defineProps<{
  modelValue: string
}>()

defineEmits<{
  select: [value: string]
}>()

const functions = [
  { id: 'search', name: '搜索热门视频', icon: VideoPlay },
  { id: 'cover', name: '获取封面', icon: PictureFilled }
]
</script>

<style scoped>
.function-list {
  flex: 1;
  padding: 10px;
  overflow-y: auto;
}

.function-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 20px;
  margin-bottom: 8px;
  border-radius: 8px;
  color: #bfcbd9;
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 14px;
}

.function-item:hover {
  background: rgba(255, 255, 255, 0.1);
  color: white;
}

.function-item.active {
  background: #409eff;
  color: white;
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.4);
}

.function-name {
  font-weight: 500;
}
</style>
