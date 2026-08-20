<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { NButton, NInput, NSelect, NTooltip } from 'naive-ui'
import { SvgIcon } from '@/components/common'
import { abortAgentMessage, sendAgentMessage } from '@/agent/control'
import { useAgentStore, useAppStore } from '@/store'
import {
  AGENT_SIDEBAR_LAYOUT_WIDTH,
  AGENT_SIDEBAR_MIN_EDITOR_VISIBLE,
} from '@/store/modules/app/helper'
import { t } from '@/locales'
import AgentStepList from './AgentStepList.vue'
import DocumentContextBar from './DocumentContextBar.vue'
import SessionListPopover from './SessionListPopover.vue'

const LAYOUT_WIDTH = AGENT_SIDEBAR_LAYOUT_WIDTH
const MIN_WIDTH = LAYOUT_WIDTH

const appStore = useAppStore()
const agentStore = useAgentStore()

const rootRef = ref<HTMLElement | null>(null)

const collapsed = computed(() => appStore.agentSidebarCollapsed)
const width = computed(() => appStore.agentSidebarWidth)

const prompt = ref('')

const sessions = computed(() => agentStore.sessions)
const activeSessionId = computed(() => agentStore.activeSessionId)
const activeSteps = computed(() => agentStore.activeSteps)
const hasSteps = computed(() => activeSteps.value.length > 0)
const documentContext = computed(() => agentStore.activeSession?.documentContext ?? null)
const showContextBar = computed(() => hasSteps.value && documentContext.value != null)
const isRunning = computed(() => agentStore.isRunning)
const canSend = computed(() => !isRunning.value && prompt.value.trim().length > 0)

const agentMode = computed({
  get: () => agentStore.activeSession?.mode ?? 'agent',
  set: (mode: AgentStep.Mode) => {
    agentStore.setMode(mode)
  },
})

const modeOptions = computed(() => [
  { label: t('compose.agent.modeAgent'), value: 'agent' },
  { label: t('compose.agent.modeAsk'), value: 'ask' },
])

const inputPlaceholder = computed(() =>
  agentMode.value === 'agent'
    ? t('compose.agent.placeholderAgent')
    : t('compose.agent.placeholderAsk'),
)

const rootStyle = computed(() => ({
  width: collapsed.value ? '24px' : `${LAYOUT_WIDTH}px`,
}))

const panelStyle = computed(() => ({
  width: `${width.value}px`,
}))

const isOverlay = computed(() => !collapsed.value && width.value > LAYOUT_WIDTH)

function getMaxPanelWidth(): number {
  const row = rootRef.value?.parentElement
  if (!row)
    return LAYOUT_WIDTH + 480
  const rowWidth = row.getBoundingClientRect().width
  return Math.max(MIN_WIDTH, rowWidth - AGENT_SIDEBAR_MIN_EDITOR_VISIBLE)
}

function clampPanelWidth(value: number): number {
  return Math.min(getMaxPanelWidth(), Math.max(MIN_WIDTH, value))
}

function syncPanelWidth() {
  const next = clampPanelWidth(width.value)
  if (next !== width.value)
    appStore.setAgentSidebarWidth(next)
}

function toggleCollapsed() {
  appStore.setAgentSidebarCollapsed(!collapsed.value)
}

function handleNewChat() {
  agentStore.createSession(agentMode.value)
  requestAnimationFrame(() => scrollToBottom())
}

function handleSelectTab(id: number) {
  agentStore.switchSession(id)
  requestAnimationFrame(() => scrollToBottom())
}

function handleCloseTab(id: number) {
  const wasActive = activeSessionId.value === id
  agentStore.closeSession(id)
  if (wasActive)
    requestAnimationFrame(() => scrollToBottom())
}

function handleSend() {
  if (!canSend.value)
    return

  const text = prompt.value.trim()
  prompt.value = ''
  sendAgentMessage(text)
  requestAnimationFrame(() => scrollToBottom())
}

function handlePause() {
  if (!isRunning.value)
    return
  abortAgentMessage()
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key !== 'Enter' || event.shiftKey)
    return
  event.preventDefault()
  handleSend()
}

const mainRef = ref<HTMLElement | null>(null)
const NEAR_BOTTOM = 80

function isNearBottom(el: HTMLElement, threshold = NEAR_BOTTOM) {
  return el.scrollHeight - el.scrollTop - el.clientHeight <= threshold
}

function scrollToBottom() {
  const el = mainRef.value
  if (!el)
    return
  el.scrollTop = el.scrollHeight
}

function stickToBottom() {
  const el = mainRef.value
  if (!el || !isNearBottom(el))
    return
  el.scrollTop = el.scrollHeight
}

watch(activeSteps, () => {
  requestAnimationFrame(stickToBottom)
}, { deep: true })

let resizeStartX = 0
let resizeStartWidth = 0

function onResizeMove(event: MouseEvent) {
  const delta = resizeStartX - event.clientX
  appStore.setAgentSidebarWidth(clampPanelWidth(resizeStartWidth + delta))
}

function onResizeEnd() {
  document.removeEventListener('mousemove', onResizeMove)
  document.removeEventListener('mouseup', onResizeEnd)
  document.body.style.cursor = ''
  document.body.style.userSelect = ''
}

function onResizeStart(event: MouseEvent) {
  if (collapsed.value)
    return

  event.preventDefault()
  resizeStartX = event.clientX
  resizeStartWidth = width.value
  document.body.style.cursor = 'col-resize'
  document.body.style.userSelect = 'none'
  document.addEventListener('mousemove', onResizeMove)
  document.addEventListener('mouseup', onResizeEnd)
}

onMounted(() => {
  syncPanelWidth()
  window.addEventListener('resize', syncPanelWidth)
})

onUnmounted(() => {
  window.removeEventListener('resize', syncPanelWidth)
  document.removeEventListener('mousemove', onResizeMove)
  document.removeEventListener('mouseup', onResizeEnd)
})
</script>

<template>
  <div
    ref="rootRef"
    class="agent-sidebar-root relative h-full shrink-0 overflow-visible"
    :style="rootStyle"
  >
    <button
      v-if="collapsed"
      type="button"
      class="agent-sidebar-expand flex h-full w-6 shrink-0 items-center justify-center border-l border-neutral-200 bg-white text-neutral-500 transition hover:text-neutral-800 dark:border-neutral-800 dark:bg-[#18181c] dark:hover:text-neutral-200"
      :title="$t('compose.agent.expand')"
      @click="toggleCollapsed"
    >
      <SvgIcon icon="ri:sidebar-unfold-line" class="text-base" />
    </button>

    <aside
      v-else
      class="agent-sidebar absolute right-0 top-0 flex h-full flex-col overflow-hidden border-l border-neutral-200 bg-white dark:border-neutral-800 dark:bg-[#18181c]"
      :class="{ 'agent-sidebar--overlay': isOverlay }"
      :style="panelStyle"
    >
      <div
        class="agent-sidebar-resizer absolute bottom-0 left-0 top-0 z-10 w-1 cursor-col-resize hover:bg-[#4b9e5f]/30"
        @mousedown="onResizeStart"
      />

      <header class="flex shrink-0 items-center gap-1 border-b border-neutral-200 px-2 py-2 dark:border-neutral-800">
        <div class="flex min-w-0 flex-1 items-center gap-0.5 overflow-x-auto">
          <button
            v-for="tab in sessions"
            :key="tab.id"
            type="button"
            class="group flex max-w-[120px] shrink-0 items-center gap-1 rounded-md px-2 py-1 text-xs transition"
            :class="activeSessionId === tab.id
              ? 'bg-neutral-100 text-neutral-900 dark:bg-neutral-800 dark:text-neutral-100'
              : 'text-neutral-500 hover:bg-neutral-50 hover:text-neutral-700 dark:hover:bg-neutral-800/60 dark:hover:text-neutral-300'"
            @click="handleSelectTab(tab.id)"
          >
            <span class="truncate">{{ tab.title }}</span>
            <span
              v-if="sessions.length > 1"
              class="rounded p-0.5 opacity-0 transition group-hover:opacity-100 hover:bg-neutral-200 dark:hover:bg-neutral-700"
              @click.stop="handleCloseTab(tab.id)"
            >
              <SvgIcon icon="ri:close-line" class="text-xs" />
            </span>
          </button>

          <NTooltip placement="bottom">
            <template #trigger>
              <button
                type="button"
                class="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-800 dark:hover:text-neutral-300"
                @click="handleNewChat"
              >
                <SvgIcon icon="ri:add-line" class="text-sm" />
              </button>
            </template>
            {{ $t('compose.agent.newChat') }}
          </NTooltip>
        </div>

        <div class="flex shrink-0 items-center gap-0.5">
          <SessionListPopover />

          <NTooltip placement="bottom">
            <template #trigger>
              <button
                type="button"
                class="flex h-7 w-7 items-center justify-center rounded-md text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-800 dark:hover:text-neutral-300"
                @click="toggleCollapsed"
              >
                <SvgIcon icon="ri:sidebar-fold-line" class="text-base" />
              </button>
            </template>
            {{ $t('compose.agent.collapse') }}
          </NTooltip>
        </div>
      </header>

      <main ref="mainRef" class="min-h-0 flex-1 overflow-y-auto px-3 py-4">
        <div
          v-if="!hasSteps"
          class="flex h-full items-center justify-center text-center text-xs text-neutral-400"
        >
          {{ $t('compose.agent.emptyHint') }}
        </div>

        <template v-else>
          <DocumentContextBar v-if="showContextBar" :context="documentContext!" />
          <AgentStepList :steps="activeSteps" :is-running="isRunning" />
        </template>
      </main>

      <footer class="shrink-0 border-t border-neutral-200 p-3 dark:border-neutral-800">
        <NInput
          v-model:value="prompt"
          type="textarea"
          class="agent-sidebar-input mb-2"
          :placeholder="inputPlaceholder"
          :autosize="{ minRows: 2, maxRows: 6 }"
          @keydown="handleKeydown"
        />

        <div class="flex items-center justify-between gap-2">
          <NSelect
            v-model:value="agentMode"
            size="small"
            class="w-[108px]"
            :options="modeOptions"
          />

          <NButton
            v-if="!isRunning"
            type="primary"
            size="small"
            :disabled="!canSend"
            @click="handleSend"
          >
            <template #icon>
              <span class="dark:text-black">
                <SvgIcon icon="ri:send-plane-fill" />
              </span>
            </template>
          </NButton>

          <NTooltip v-else placement="top">
            <template #trigger>
              <NButton type="primary" size="small" @click="handlePause">
                <template #icon>
                  <span class="dark:text-black">
                    <SvgIcon icon="famicons:stop-circle" />
                  </span>
                </template>
              </NButton>
            </template>
            {{ t('tooltip.stop') }}
          </NTooltip>
        </div>
      </footer>
    </aside>
  </div>
</template>

<style scoped>
.agent-sidebar--overlay {
  z-index: 30;
  box-shadow: -8px 0 24px -4px rgb(0 0 0 / 0.12);
}

.dark .agent-sidebar--overlay {
  box-shadow: -8px 0 28px -4px rgb(0 0 0 / 0.45);
}

.agent-sidebar-input :deep(.n-input-wrapper) {
  padding-top: 0.5rem;
  padding-bottom: 0.5rem;
}
</style>
