<script setup lang="ts">
defineProps<{
  invocation: Agent.ToolInvocation
}>()
</script>

<template>
  <div class="text-[10px] leading-relaxed text-neutral-400">
    <template v-if="invocation.status === 'calling'">
      正在调用「{{ invocation.displayName }}」<span v-if="invocation.paramsSummary">，参数：{{ invocation.paramsSummary }}</span>
    </template>
    <template v-else-if="invocation.status === 'done'">
      「{{ invocation.displayName }}」调用完成<span v-if="invocation.resultSummary">，返回：{{ invocation.resultSummary }}</span>
    </template>
    <template v-else-if="invocation.status === 'failed'">
      「{{ invocation.displayName }}」调用失败：{{ invocation.error }}
    </template>
  </div>
</template>
