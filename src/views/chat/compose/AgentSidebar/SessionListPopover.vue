<script setup lang="ts">
import { computed, ref } from 'vue'
import { NPopover, NTooltip } from 'naive-ui'
import { SvgIcon } from '@/components/common'
import { useAgentStore } from '@/store'
import { t } from '@/locales'
import { formatSessionTime } from './stepView'

const agentStore = useAgentStore()
const show = ref(false)

const sessions = computed(() => agentStore.sessions)
const activeSessionId = computed(() => agentStore.activeSessionId)

function handleSelect(id: number) {
  agentStore.switchSession(id)
  show.value = false
}
</script>

<template>
  <NPopover
    v-model:show="show"
    trigger="click"
    placement="bottom-end"
    :width="260"
    raw
  >
    <template #trigger>
      <NTooltip placement="bottom">
    <template #trigger>
      <NTooltip placement="bottom">
        <template #trigger>
          <button
            type="button"
            class="flex h-7 w-7 items-center justify-center rounded-md text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-800 dark:hover:text-neutral-300"
          >
            <SvgIcon icon="ri:history-line" class="text-base" />
          </button>
        </template>
        {{ t('compose.agent.sessionList') }}
      </NTooltip>
    </template>
        {{ t('compose.agent.sessionList') }}
      </NTooltip>
    </template>

    <div class="rounded-lg border border-neutral-200 bg-white py-1 shadow-lg dark:border-neutral-700 dark:bg-[#242428]">
      <div class="border-b border-neutral-100 px-3 py-2 text-xs font-medium text-neutral-600 dark:border-neutral-700 dark:text-neutral-300">
        {{ t('compose.agent.sessionList') }}
      </div>

      <div class="max-h-64 overflow-y-auto py-1">
        <button
          v-for="session in sessions"
          :key="session.id"
          type="button"
          class="flex w-full flex-col gap-0.5 px-3 py-2 text-left transition hover:bg-neutral-50 dark:hover:bg-neutral-800/60"
          :class="activeSessionId === session.id ? 'bg-neutral-50 dark:bg-neutral-800/40' : ''"
          @click="handleSelect(session.id)"
        >
          <span
            class="truncate text-xs font-medium"
            :class="activeSessionId === session.id ? 'text-[#4b9e5f]' : 'text-neutral-800 dark:text-neutral-100'"
          >
            {{ session.title }}
          </span>
          <span class="text-[11px] text-neutral-400">
            {{ formatSessionTime(session.createTime) }}
            ·
            {{ session.mode === 'agent' ? t('compose.agent.modeAgent') : t('compose.agent.modeAsk') }}
            ·
            {{ session.steps.length }} steps
          </span>
        </button>
      </div>
    </div>
  </NPopover>
</template>
