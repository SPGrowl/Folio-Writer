<script setup lang="ts">
import { computed, onBeforeUnmount } from 'vue'
import { NTooltip } from 'naive-ui'
import AgentSidebar from '@/views/chat/compose/AgentSidebar/index.vue'
import ComposeTabs from '@/views/chat/compose/ComposeTabs.vue'
import MarkdownEditor from '@/components/custom/MarkdownEditor/index.vue'
import { SvgIcon } from '@/components/common'
import { useComposeStore } from '@/store'
import { debounce } from '@/utils/functions/debounce'
import { t } from '@/locales'

const composeStore = useComposeStore()

const debouncedSave = debounce((id: number, value: string, title: string) => {
  composeStore.saveArticle(id, value, title).catch(() => {})
}, 800)

const hasOpenTabs = computed(() => composeStore.openArticle.length > 0)
const isEmpty = computed(() => !composeStore.activeArticle)

const activeSyncState = computed(() => composeStore.activeArticle?.syncState ?? 'saved')
const activeSyncError = computed(() => composeStore.activeArticle?.syncError ?? null)

const draft = computed({
  get: () => composeStore.activeArticle?.draft ?? '',
  set: (value: string) => {
    
    const article = composeStore.activeArticle
    if (!article)
      return
    article.draft = value
    // 更改本篇文章时，设置为脏状态
    composeStore.markDirty(article.id)
    debouncedSave(article.id, value, article.title)
  },
})

onBeforeUnmount(async () => {
  await composeStore.flushOpenTabsIfDirty()
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

  const article = composeStore.activeArticle
  if (!article?.draft)
    return

  await composeStore.saveArticle(article.id, article.draft, article.title).catch(() => {})
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
        <div v-else class="relative flex min-h-0 flex-1 flex-col p-4">
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

          <MarkdownEditor v-model="draft" class="min-h-0 flex-1" />
        </div>
      </template>
    </div>

    <AgentSidebar />
  </div>
</template>
