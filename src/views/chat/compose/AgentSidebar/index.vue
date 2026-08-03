<script setup lang="ts">
import { computed, nextTick, onUnmounted, ref, watch } from 'vue'
import { NButton, NInput, NSelect, NTooltip } from 'naive-ui'
import { SvgIcon } from '@/components/common'
import { useAgentStore, useAppStore } from '@/store'
import { t } from '@/locales'
import AgentTurnList from './AgentTurnList.vue'

const MIN_WIDTH = 280
const MAX_WIDTH = 560

const appStore = useAppStore()
const agentStore = useAgentStore()

const collapsed = computed(() => appStore.agentSidebarCollapsed)
const width = computed(() => appStore.agentSidebarWidth)

const prompt = ref('')
const scrollRef = ref<HTMLElement | null>(null)

const sessions = computed(() => agentStore.sessions)
const activeSessionId = computed(() => agentStore.activeSessionId)
const hasTurns = computed(() => agentStore.activeTurns.length > 0)

const agentMode = computed({
  get: () => agentStore.activeSession?.mode ?? 'agent',
  set: (mode: Agent.Mode) => {
    if (agentStore.activeSessionId != null)
      agentStore.setMode(agentStore.activeSessionId, mode)
  },
})

const modeOptions = computed(() => [
  { label: t('compose.agent.modeAgent'), value: 'agent' },
  { label: t('compose.agent.modeAsk'), value: 'ask' },
])

const canSend = computed(() =>
  prompt.value.trim().length > 0 && !agentStore.isRunning,
)

const inputPlaceholder = computed(() =>
  agentMode.value === 'agent'
    ? t('compose.agent.placeholderAgent')
    : t('compose.agent.placeholderAsk'),
)

const rootStyle = computed(() => ({
  width: collapsed.value ? '24px' : `${width.value}px`,
}))

async function scrollToBottom() {
  await nextTick()
  if (scrollRef.value)
    scrollRef.value.scrollTop = scrollRef.value.scrollHeight
}

watch(
  () => agentStore.activeTurns,
  () => scrollToBottom(),
  { deep: true },
)

function toggleCollapsed() {
  appStore.setAgentSidebarCollapsed(!collapsed.value)
}

function handleNewChat() {
  agentStore.createSession(agentMode.value)
}

function handleSelectTab(id: number) {
  agentStore.switchSession(id)
}

function handleCloseTab(id: number) {
  agentStore.closeSession(id)
}

async function handleSend() {
  if (!canSend.value)
    return

  const text = prompt.value.trim()
  prompt.value = ''
  await agentStore.sendMessage(text)
  scrollToBottom()
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key !== 'Enter' || event.shiftKey)
    return
  event.preventDefault()
  handleSend()
}

let resizeStartX = 0
let resizeStartWidth = 0

function onResizeMove(event: MouseEvent) {
  const delta = resizeStartX - event.clientX
  const next = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, resizeStartWidth + delta))
  appStore.setAgentSidebarWidth(next)
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

onUnmounted(() => {
  document.removeEventListener('mousemove', onResizeMove)
  document.removeEventListener('mouseup', onResizeEnd)
  agentStore.abortRun()
})
</script>

<template>
  <div
    class="agent-sidebar-root relative flex h-full shrink-0"
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
      class="agent-sidebar relative flex h-full w-full flex-col overflow-hidden border-l border-neutral-200 bg-white dark:border-neutral-800 dark:bg-[#18181c]"
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

      <main
        ref="scrollRef"
        class="min-h-0 flex-1 overflow-y-auto px-3 py-4"
      >
        <div
          v-if="!hasTurns"
          class="flex h-full items-center justify-center text-center text-xs text-neutral-400"
        >
          {{ $t('compose.agent.emptyHint') }}
        </div>
        <AgentTurnList v-else />
      </main>

      <footer class="shrink-0 border-t border-neutral-200 p-3 dark:border-neutral-800">
        <NInput
          v-model:value="prompt"
          type="textarea"
          class="agent-sidebar-input mb-2"
          :placeholder="inputPlaceholder"
          :disabled="agentStore.isRunning"
          :autosize="{ minRows: 2, maxRows: 6 }"
          @keydown="handleKeydown"
        />

        <div class="flex items-center justify-between gap-2">
          <NSelect
            v-model:value="agentMode"
            size="small"
            class="w-[108px]"
            :disabled="agentStore.isRunning"
            :options="modeOptions"
          />

          <NButton
            type="primary"
            size="small"
            :disabled="!canSend"
            :loading="agentStore.isRunning"
            @click="handleSend"
          >
            <template #icon>
              <span class="dark:text-black">
                <SvgIcon icon="ri:send-plane-fill" />
              </span>
            </template>
          </NButton>
        </div>
      </footer>
    </aside>
  </div>
</template>

<style scoped>
.agent-sidebar-input :deep(.n-input-wrapper) {
  padding-top: 0.5rem;
  padding-bottom: 0.5rem;
}
</style>
