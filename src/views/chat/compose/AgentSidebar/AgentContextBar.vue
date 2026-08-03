<script setup lang="ts">
import { computed } from 'vue'
import { SvgIcon } from '@/components/common'
import { useAgentStore } from '@/store'

const agentStore = useAgentStore()

const context = computed(() => agentStore.activeSession?.documentContext ?? null)
</script>

<template>
  <div
    v-if="context"
    class="mb-3 rounded-md border border-neutral-200 bg-neutral-50 px-2.5 py-2 text-[11px] text-neutral-500 dark:border-neutral-700 dark:bg-neutral-900/50 dark:text-neutral-400"
  >
    <div class="flex items-center gap-1.5 truncate">
      <SvgIcon icon="ri:folder-line" class="shrink-0 text-xs" />
      <span class="truncate">{{ $t('compose.agent.contextGroup') }}：{{ context.groupName || $t('compose.agent.contextNoGroup') }}</span>
    </div>
    <div class="mt-1 flex items-center gap-1.5 truncate">
      <SvgIcon icon="ri:file-text-line" class="shrink-0 text-xs" />
      <span class="truncate">{{ $t('compose.agent.contextArticle') }}：{{ context.title || $t('compose.untitled') }}</span>
    </div>
  </div>
  <div
    v-else-if="agentStore.activeTurns.length > 0"
    class="mb-3 text-[11px] text-neutral-400"
  >
    {{ $t('compose.agent.contextNone') }}
  </div>
</template>
