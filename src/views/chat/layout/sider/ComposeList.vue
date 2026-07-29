<script setup lang='ts'>
import { onMounted } from 'vue'
import { NButton, NPopconfirm, NScrollbar } from 'naive-ui'
import { SvgIcon } from '@/components/common'
import { useAppStore, useComposeStore } from '@/store'
import { useBasicLayout } from '@/hooks/useBasicLayout'

const appStore = useAppStore()
const composeStore = useComposeStore()
const { isMobile } = useBasicLayout()

onMounted(() => {
  composeStore.bootstrap()
})

async function handleAdd() {
  await composeStore.createArticle('# 新文章\n')
  if (isMobile.value)
    appStore.setSiderCollapsed(true)
}

function isActive(id: number) {
  return composeStore.activeArticleId === id
}

function handleSelect(article: Compose.Article) {
  composeStore.setActive(article.id)
  if (isMobile.value)
    appStore.setSiderCollapsed(true)
}

async function handleDelete(id: number, event?: MouseEvent | TouchEvent) {
  event?.stopPropagation()
  await composeStore.removeArticle(id)
}
</script>

<template>
  <div class="flex flex-col flex-1 min-h-0">
    <div class="p-4">
      <NButton dashed block @click="handleAdd">
        {{ $t('compose.newTextButton') }}
      </NButton>
    </div>
    <div class="flex-1 min-h-0 pb-4 overflow-hidden">
      <NScrollbar class="px-4">
        <div class="flex flex-col gap-2 text-sm">
          <template v-if="composeStore.loading">
            <div class="flex flex-col items-center mt-4 text-center text-neutral-300">
              <SvgIcon icon="ri:loader-4-line" class="mb-2 text-3xl animate-spin" />
              <span>{{ $t('common.loading') }}</span>
            </div>
          </template>
          <template v-else-if="!composeStore.articles.length">
            <div class="flex flex-col items-center mt-4 text-center text-neutral-300">
              <SvgIcon icon="ri:file-text-line" class="mb-2 text-3xl" />
              <span>{{ $t('common.noData') }}</span>
            </div>
          </template>
          <template v-else>
            <div v-for="article of composeStore.articles" :key="article.id">
              <a
                class="relative flex items-center gap-3 px-3 py-3 break-all border rounded-md cursor-pointer hover:bg-neutral-100 group dark:border-neutral-800 dark:hover:bg-[#24272e]"
                :class="isActive(article.id) && ['border-[#4b9e5f]', 'bg-neutral-100', 'text-[#4b9e5f]', 'dark:bg-[#24272e]', 'dark:border-[#4b9e5f]', 'pr-14']"
                @click="handleSelect(article)"
              >
                <span>
                  <SvgIcon icon="ri:file-text-line" />
                </span>
                <div class="relative flex-1 overflow-hidden break-all text-ellipsis whitespace-nowrap">
                  <span>{{ article.title }}</span>
                </div>
                <div v-if="isActive(article.id)" class="absolute z-10 flex visible right-1">
                  <NPopconfirm placement="bottom" @positive-click="handleDelete(article.id, $event)">
                    <template #trigger>
                      <button class="p-1" @click.stop>
                        <SvgIcon icon="ri:delete-bin-line" />
                      </button>
                    </template>
                    {{ $t('chat.deleteHistoryConfirm') }}
                  </NPopconfirm>
                </div>
              </a>
            </div>
          </template>
        </div>
      </NScrollbar>
    </div>
  </div>
</template>
