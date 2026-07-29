<script setup lang='ts'>
import type { CSSProperties } from 'vue'
import { computed, watch } from 'vue'
import { NLayoutSider } from 'naive-ui'
import List from './List.vue'
import ComposeList from './ComposeList.vue'
import Footer from './Footer.vue'
import { useAppStore } from '@/store'
import { useBasicLayout } from '@/hooks/useBasicLayout'
import type { SiderMode } from '@/store/modules/app/helper'

const appStore = useAppStore()
const { isMobile } = useBasicLayout()

const collapsed = computed(() => appStore.siderCollapsed)
const siderMode = computed(() => appStore.siderMode)
const isChatMode = computed(() => siderMode.value === 'chat')

function handleSwitchMode(mode: SiderMode) {
  appStore.setSiderMode(mode)
}

function handleUpdateCollapsed() {
  appStore.setSiderCollapsed(!collapsed.value)
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
        <List v-if="isChatMode" />
        <ComposeList v-else />
      </main>
      <Footer />
    </div>
  </NLayoutSider>
  <template v-if="isMobile">
    <div v-show="!collapsed" class="fixed inset-0 z-40 w-full h-full bg-black/40" @click="handleUpdateCollapsed" />
  </template>
</template>
