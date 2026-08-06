<script setup lang="ts">
import { computed } from 'vue'
import { t } from '@/locales'

const props = defineProps<{
  context: AgentStep.InitialContext
}>()

const groupLabel = computed(() =>
  props.context.groupName?.trim() || t('compose.agent.contextNoGroup'),
)
</script>

<template>
  <div
    class="mb-3 shrink-0 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-800/40"
  >
    <div class="text-[11px] leading-relaxed text-neutral-500 dark:text-neutral-400">
      {{ t('compose.agent.contextGroup') }}：{{ groupLabel }}
    </div>
    <div class="mt-0.5 truncate text-xs font-medium text-neutral-800 dark:text-neutral-100">
      {{ t('compose.agent.contextArticle') }}：{{ context.title }}
    </div>
  </div>
</template>
