<script setup lang="ts">
import Text from '@/views/chat/components/Bubble/Text.vue'

defineProps<{
  content: string
  streaming?: boolean
}>()
</script>

<template>
  <div class="agent-assistant-markdown max-w-full w-full">
    <Text :text="content" :loading="streaming" />
  </div>
</template>

<style scoped>
.agent-assistant-markdown :deep(.text-wrap) {
  min-width: 0;
  padding: 0;
  background: transparent !important;
}

.agent-assistant-markdown :deep(.markdown-body) {
  font-size: 12px;
  line-height: 1.625;
  color: inherit;
}

.dark .agent-assistant-markdown :deep(.markdown-body) {
  color: rgb(245 245 245);
}
</style>
