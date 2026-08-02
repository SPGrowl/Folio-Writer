<script setup lang="ts">
import { computed, onBeforeUnmount } from 'vue'
import { NButton, NTooltip } from 'naive-ui'
import AgentSidebar from '@/views/chat/compose/AgentSidebar/index.vue'
import ComposeTabs from '@/views/chat/compose/ComposeTabs.vue'
import MarkdownEditor from '@/components/custom/MarkdownEditor/index.vue'
import DiffMarkdownEditor from '@/components/custom/DiffMarkdownEditor/index.vue'
import { SvgIcon } from '@/components/common'
import { useComposeTabStore } from '@/store'
import { debounce } from '@/utils/functions/debounce'
import { t } from '@/locales'

const tabStore = useComposeTabStore()

const debouncedSave = debounce((id: number, value: string, title: string) => {
  tabStore.saveTab(id, value, title).catch(() => {})
}, 800)

const hasOpenTabs = computed(() => tabStore.openTabs.length > 0)
const isEmpty = computed(() => !tabStore.activeTab)

const activeSyncState = computed(() => tabStore.activeTab?.syncState ?? 'saved')
const activeSyncError = computed(() => tabStore.activeTab?.syncError ?? null)

const diffOriginal = computed(() => tabStore.activeTab?.draft ?? '')
const diffProposed = computed(() => tabStore.activeTab?.changes?.content ?? '')
const showDiff = computed(() => diffProposed.value.length > 0)

const draft = computed({
  get: () => tabStore.activeTab?.draft ?? '',
  set: (value: string) => {
    const tab = tabStore.activeTab
    if (!tab)
      return
    tabStore.setDraft(tab.linkedID, value)
    debouncedSave(tab.linkedID, value, tab.title)
  },
})

onBeforeUnmount(async () => {
  await tabStore.flushOpenTabsIfDirty()
})

const syncIcon = computed(() => ({
  saved: 'ri:checkbox-circle-line',
  dirty: 'ri:record-circle-line',
  loading: 'ri:loader-4-line',
  failed: 'ri:error-warning-line',
}[activeSyncState.value]))

const syncClass = computed(() => ({
  saved: 'text-[#4b9e5f]',
  dirty: 'text-neutral-400',
  loading: 'text-neutral-400',
  failed: 'text-red-500 cursor-pointer',
}[activeSyncState.value]))

const syncTip = computed(() => {
  if (activeSyncState.value === 'failed' && activeSyncError.value)
    return activeSyncError.value
  return t(`compose.sync.${activeSyncState.value}`)
})

async function handleSyncClick() {
  if (activeSyncState.value !== 'failed')
    return

  const tab = tabStore.activeTab
  if (!tab)
    return

  await tabStore.saveTab(tab.linkedID, tab.draft, tab.title).catch(() => {})
}

function handleAcceptChanges() {
  const tab = tabStore.activeTab
  if (!tab)
    return
  tabStore.acceptChanges(tab.linkedID)
  debouncedSave(tab.linkedID, tab.draft, tab.title)
}

function handleRejectChanges() {
  const tab = tabStore.activeTab
  if (!tab)
    return
  tabStore.rejectChanges(tab.linkedID)
}
</script>

<template>
  <div class="flex h-full min-w-0">
    <div class="relative flex min-w-0 flex-1 flex-col">
      <div v-if="!hasOpenTabs" class="flex h-full items-center justify-center text-neutral-400">
        {{ $t('compose.placeholder') }}
      </div>
      <template v-else>
        <ComposeTabs />
        <div v-if="isEmpty" class="flex flex-1 items-center justify-center text-neutral-400">
          {{ $t('compose.placeholder') }}
        </div>
        <div v-else class="relative flex min-h-0 flex-1 flex-col gap-2 p-4">
          <NTooltip placement="left">
            <template #trigger>
              <button
                type="button"
                class="absolute right-6 top-6 z-10"
                :class="syncClass"
                @click="handleSyncClick"
              >
                <SvgIcon
                  :icon="syncIcon"
                  class="text-xl"
                  :class="{ 'animate-spin': activeSyncState === 'loading' }"
                />
              </button>
            </template>
            {{ syncTip }}
          </NTooltip>

          <div class="flex min-h-0 flex-1 gap-3" :class="showDiff ? 'flex-row' : 'flex-col'">
            <div class="flex min-h-0 min-w-0 flex-col" :class="showDiff ? 'flex-1' : 'flex-1'">
              <div v-if="showDiff" class="mb-1 shrink-0 text-xs text-neutral-500 dark:text-neutral-400">
                {{ $t('compose.editorMain') }}
              </div>
              <MarkdownEditor v-model="draft" class="min-h-0 flex-1" />
            </div>

            <div v-if="showDiff" class="flex min-h-0 min-w-0 flex-1 flex-col border-l border-neutral-200 pl-3 dark:border-neutral-700">
              <div class="mb-1 flex shrink-0 items-center justify-between gap-2">
                <span class="text-xs text-neutral-500 dark:text-neutral-400">
                  {{ $t('compose.editorDiff') }}
                </span>
                <div class="flex items-center gap-1">
                  <NButton size="tiny" type="primary" @click="handleAcceptChanges">
                    {{ $t('compose.acceptChanges') }}
                  </NButton>
                  <NButton size="tiny" @click="handleRejectChanges">
                    {{ $t('compose.rejectChanges') }}
                  </NButton>
                </div>
              </div>
              <DiffMarkdownEditor
                :original="diffOriginal"
                :proposed="diffProposed"
                class="min-h-0 flex-1"
              />
            </div>
          </div>
        </div>
      </template>
    </div>

    <AgentSidebar />
  </div>
</template>
