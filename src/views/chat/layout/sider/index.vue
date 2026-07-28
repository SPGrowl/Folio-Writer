<script setup lang='ts'>
import type { CSSProperties } from 'vue'
import { computed, ref, watch } from 'vue'
import { NButton, NLayoutSider, useDialog } from 'naive-ui'
import List from './List.vue'
import ComposeList from './ComposeList.vue'
import Footer from './Footer.vue'
import { useAppStore, useChatStore, useComposeStore } from '@/store'
import { useBasicLayout } from '@/hooks/useBasicLayout'
import { PromptStore, SvgIcon } from '@/components/common'
import { t } from '@/locales'
import type { SiderMode } from '@/store/modules/app/helper'

const appStore = useAppStore()
const chatStore = useChatStore()
const composeStore = useComposeStore()

const dialog = useDialog()

const { isMobile } = useBasicLayout()
const show = ref(false)

const collapsed = computed(() => appStore.siderCollapsed)
const siderMode = computed(() => appStore.siderMode)
const isChatMode = computed(() => siderMode.value === 'chat')
const isComposeMode = computed(() => siderMode.value === 'compose')

async function handleAdd() {
  await chatStore.goHome()
  if (isMobile.value)
    appStore.setSiderCollapsed(true)
}

async function handleAddText() {
  await composeStore.bootstrap()
  await composeStore.createArticle('# 新文章\n')
  if (isMobile.value)
    appStore.setSiderCollapsed(true)
}

function handleSwitchMode(mode: SiderMode) {
  appStore.setSiderMode(mode)
}

function handleUpdateCollapsed() {
  appStore.setSiderCollapsed(!collapsed.value)
}

function handleClearAll() {
  dialog.warning({
    title: t('chat.deleteMessage'),
    content: t('chat.clearHistoryConfirm'),
    positiveText: t('common.yes'),
    negativeText: t('common.no'),
    onPositiveClick: () => {
      chatStore.clearHistory()
      if (isMobile.value)
        appStore.setSiderCollapsed(true)
    },
  })
}

const getMobileClass = computed<CSSProperties>(() => {
  if (isMobile.value) {
    return {
      position: 'fixed',
      zIndex: 50,
    }
  }
  return {}
})

const mobileSafeArea = computed(() => {
  if (isMobile.value) {
    return {
      paddingBottom: 'env(safe-area-inset-bottom)',
    }
  }
  return {}
})

watch(
  isComposeMode,
  (val) => {
    if (val)
      composeStore.bootstrap()
  },
  {
    immediate: true,
  },
)

watch(
  isMobile,
  (val) => {
    appStore.setSiderCollapsed(val)
  },
  {
    immediate: true,
    flush: 'post',
  },
)
</script>

<template>
  <NLayoutSider
    :collapsed="collapsed"
    :collapsed-width="0"
    :width="260"
    :show-trigger="isMobile ? false : 'arrow-circle'"
    collapse-mode="transform"
    position="absolute"
    bordered
    :style="getMobileClass"
    @update-collapsed="handleUpdateCollapsed"
  >
    <div class="flex flex-col h-full" :style="mobileSafeArea">
      <div class="flex border-b dark:border-neutral-800">
        <button
          class="flex-1 py-3 text-sm"
          :class="isChatMode ? 'font-medium border-b-2 border-[#4b9e5f] text-[#4b9e5f]' : 'text-neutral-500'"
          @click="handleSwitchMode('chat')"
        >
          {{ $t('sider.chatTab') }}
        </button>
        <button
          class="flex-1 py-3 text-sm"
          :class="!isChatMode ? 'font-medium border-b-2 border-[#4b9e5f] text-[#4b9e5f]' : 'text-neutral-500'"
          @click="handleSwitchMode('compose')"
        >
          {{ $t('sider.composeTab') }}
        </button>
      </div>
      <main class="flex flex-col flex-1 min-h-0">
        <div class="p-4">
          <NButton v-if="isChatMode" dashed block @click="handleAdd">
            {{ $t('chat.newChatButton') }}
          </NButton>
          <NButton v-else dashed block @click="handleAddText">
            {{ $t('compose.newTextButton') }}
          </NButton>
        </div>
        <div class="flex-1 min-h-0 pb-4 overflow-hidden">
          <!-- 区分聊天模式和创作模式 -->
          <List v-if="isChatMode" />
          <ComposeList v-else />
        </div>
        <div v-if="isChatMode" class="flex items-center p-4 space-x-4">
          <div class="flex-1">
            <NButton v-if="!appStore.liteMode" block @click="show = true">
              {{ $t('store.siderButton') }}
            </NButton>
          </div>
          <NButton v-if="!appStore.liteMode" @click="handleClearAll">
            <SvgIcon icon="ri:close-circle-line" />
          </NButton>
        </div>
      </main>
      <Footer />
    </div>
  </NLayoutSider>
  <template v-if="isMobile">
    <div v-show="!collapsed" class="fixed inset-0 z-40 w-full h-full bg-black/40" @click="handleUpdateCollapsed" />
  </template>

  <PromptStore v-model:visible="show" />
</template>
