<script setup lang="ts">
import { computed } from 'vue'
import { SvgIcon } from '@/components/common'
import { useComposeStore } from '@/store'

const composeStore = useComposeStore()

const tabs = computed(() => composeStore.openArticles)

function isActive(id: number) {
  return composeStore.activeArticleId === id
}

function isTabDirty(article: Compose.Article) {
  return article.syncState != null && article.syncState !== 'saved'
}

function handleSelect(id: number) {
  composeStore.switchTab(id)
}

async function handleClose(id: number, event: MouseEvent) {
  event.stopPropagation()
  await composeStore.closeTab(id)
}
</script>

<template>
  <div class="flex shrink-0 items-end gap-0 overflow-x-auto border-b border-neutral-200 bg-[#fafafa] px-2 pt-2 dark:border-neutral-800 dark:bg-[#101014]">
    <button
      v-for="article in tabs"
      :key="article.id"
      type="button"
      class="group relative flex max-w-[180px] shrink-0 items-center gap-1.5 rounded-t-md border border-b-0 px-3 py-2 text-xs transition"
      :class="isActive(article.id)
        ? 'border-neutral-200 bg-white text-neutral-900 dark:border-neutral-700 dark:bg-[#18181c] dark:text-neutral-100'
        : 'border-transparent bg-transparent text-neutral-500 hover:bg-neutral-100/80 hover:text-neutral-700 dark:hover:bg-neutral-800/60 dark:hover:text-neutral-300'"
      @click="handleSelect(article.id)"
    >
      <SvgIcon icon="ri:file-text-line" class="shrink-0 text-sm" />
      <span class="truncate">{{ article.title || $t('compose.untitled') }}</span>
      <span
        v-if="tabs.length > 1"
        class="ml-0.5 rounded p-0.5 opacity-0 transition group-hover:opacity-100 hover:bg-neutral-200 dark:hover:bg-neutral-700"
        @click="handleClose(article.id, $event)"
      >
        <SvgIcon icon="ri:close-line" class="text-xs" />
      </span>
      <span
        v-if="isTabDirty(article)"
        class="h-1.5 w-1.5 shrink-0 rounded-full bg-neutral-400"
      />
    </button>
  </div>
</template>
