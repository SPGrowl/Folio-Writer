<script setup lang="ts">
import { computed, onBeforeUnmount, watch } from 'vue'
import { NTooltip } from 'naive-ui'
import MarkdownEditor from '@/components/custom/MarkdownEditor/index.vue'
import { SvgIcon } from '@/components/common'
import { useComposeStore } from '@/store'
import { debounce } from '@/utils/functions/debounce'
import { t } from '@/locales'

const composeStore = useComposeStore()

const debouncedSave = debounce((id: number, value: string, title: string) => {
  composeStore.saveArticle(id, value, title).catch(() => {})
}, 800)

const isEmpty = computed(() => !composeStore.activeArticle)

// TODO：友好的提示信息
const content = computed({
  get: () => composeStore.activeArticle?.content ?? '',
  set: (value: string) => {
    const article = composeStore.activeArticle
    if (!article)
      return
    article.content = value
    composeStore.markDirty()
    debouncedSave(article.id, value, article.title)
  },
})

watch(
  () => composeStore.activeArticleId,
  async (_newId, oldId) => {
    if (oldId != null && composeStore.syncState !== 'saved') {
      const prev = composeStore.articles.find(item => item.id === oldId)
      if (prev)
        await composeStore.saveArticle(oldId, prev.content, prev.title).catch(() => {})
    }
    composeStore.resetSyncState()
  },
)

onBeforeUnmount(async () => {
  const id = composeStore.activeArticleId
  if (id == null || composeStore.syncState === 'saved')
    return

  const article = composeStore.articles.find(item => item.id === id)
  if (article)
    await composeStore.saveArticle(id, article.content, article.title).catch(() => {})
})

const syncIcon = computed(() => ({
  saved: 'ri:checkbox-circle-line',
  dirty: 'ri:record-circle-line',
  loading: 'ri:loader-4-line',
  failed: 'ri:error-warning-line',
}[composeStore.syncState]))

const syncClass = computed(() => ({
  saved: 'text-[#4b9e5f]',
  dirty: 'text-neutral-400',
  loading: 'text-neutral-400',
  failed: 'text-red-500 cursor-pointer',
}[composeStore.syncState]))

const syncTip = computed(() => {
  if (composeStore.syncState === 'failed' && composeStore.syncError)
    return composeStore.syncError
  return t(`compose.sync.${composeStore.syncState}`)
})

async function handleSyncClick() {
  if (composeStore.syncState !== 'failed')
    return

  const article = composeStore.activeArticle
  if (!article)
    return

  await composeStore.saveArticle(article.id, article.content, article.title).catch(() => {})
}
</script>

<template>
  <div v-if="isEmpty" class="flex h-full items-center justify-center text-neutral-400">
    {{ $t('compose.placeholder') }}
  </div>
  <div v-else class="relative flex h-full w-full flex-col p-4">
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
            :class="{ 'animate-spin': composeStore.syncState === 'loading' }"
          />
        </button>
      </template>
      {{ syncTip }}
    </NTooltip>

    <MarkdownEditor v-model="content" class="min-h-0 flex-1" />
  </div>
</template>
