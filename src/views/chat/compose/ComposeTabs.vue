<script setup lang="ts">
import { computed } from 'vue'
import { SvgIcon } from '@/components/common'
import { useComposeTabStore } from '@/store'

const tabStore = useComposeTabStore()

const tabs = computed(() => tabStore.openTabList)

function isActive(id: number) {
  return tabStore.activeArticleId === id
}

function isTabDirty(tab: Compose.Tab) {
  return tab.syncState !== 'saved'
}

function hasChanges(id: number) {
  return tabStore.hasPendingChanges(id)
}

function tabClass(tab: Compose.Tab) {
  const active = isActive(tab.linkedID)
  const pending = hasChanges(tab.linkedID)

  if (pending) {
    return active
      ? 'border-red-300 bg-white text-red-600 dark:border-red-700/80 dark:bg-[#18181c] dark:text-red-400'
      : 'border-transparent bg-transparent text-red-500 hover:bg-red-50/80 hover:text-red-600 dark:text-red-400 dark:hover:bg-red-950/30 dark:hover:text-red-300'
  }

  return active
    ? 'border-neutral-200 bg-white text-neutral-900 dark:border-neutral-700 dark:bg-[#18181c] dark:text-neutral-100'
    : 'border-transparent bg-transparent text-neutral-500 hover:bg-neutral-100/80 hover:text-neutral-700 dark:hover:bg-neutral-800/60 dark:hover:text-neutral-300'
}

function handleSelect(id: number) {
  tabStore.switchTab(id)
}

async function handleClose(id: number, event: MouseEvent) {
  event.stopPropagation()
  await tabStore.closeTab(id)
}
</script>

<template>
  <div class="flex shrink-0 items-end gap-0 overflow-x-auto border-b border-neutral-200 bg-[#fafafa] px-2 pt-2 dark:border-neutral-800 dark:bg-[#101014]">
    <button
      v-for="tab in tabs"
      :key="tab.linkedID"
      type="button"
      class="group relative flex max-w-[180px] shrink-0 items-center gap-1.5 rounded-t-md border border-b-0 px-3 py-2 text-xs transition"
      :class="tabClass(tab)"
      @click="handleSelect(tab.linkedID)"
    >
      <SvgIcon icon="ri:file-text-line" class="shrink-0 text-sm" />
      <span class="truncate">{{ tab.title || $t('compose.untitled') }}</span>
      <span
        v-if="tabs.length > 1"
        class="ml-0.5 rounded p-0.5 opacity-0 transition group-hover:opacity-100 hover:bg-neutral-200 dark:hover:bg-neutral-700"
        @click="handleClose(tab.linkedID, $event)"
      >
        <SvgIcon icon="ri:close-line" class="text-xs" />
      </span>
      <span
        v-if="hasChanges(tab.linkedID)"
        class="h-1.5 w-1.5 shrink-0 rounded-full bg-red-500"
      />
      <span
        v-else-if="isTabDirty(tab)"
        class="h-1.5 w-1.5 shrink-0 rounded-full bg-neutral-400"
      />
    </button>
  </div>
</template>
