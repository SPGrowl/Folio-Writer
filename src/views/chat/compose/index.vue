<script setup lang="ts">
import { computed, onMounted } from 'vue'
import MarkdownEditor from '@/components/custom/MarkdownEditor/index.vue'
import { useComposeStore } from '@/store'
import { debounce } from '@/utils/functions/debounce'

const composeStore = useComposeStore()

onMounted(() => {
  composeStore.bootstrap()
})

const debouncedSave = debounce((id: number, value: string) => {
  const article = composeStore.articles.find(item => item.id === id)
  if (!article)
    return
  composeStore.saveArticle(id, {
    title: article.title,
    content: value,
  })
}, 800)

const isEmpty = computed(() => !composeStore.activeArticle)

const content = computed({
  get: () => composeStore.activeArticle?.content ?? '',
  set: (value: string) => {
    const article = composeStore.activeArticle
    if (!article)
      return
    article.content = value
    debouncedSave(article.id, value)
  },
})
</script>

<template>
  <div v-if="isEmpty" class="flex h-full items-center justify-center text-neutral-400">
    {{ $t('compose.placeholder') }}
  </div>
  <div v-else class="flex h-full w-full flex-col p-4">
    <MarkdownEditor v-model="content" class="min-h-0 flex-1" />
  </div>
</template>
