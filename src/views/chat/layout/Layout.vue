<script setup lang='ts'>
import { computed, watch } from 'vue'
import { NLayout, NLayoutContent } from 'naive-ui'
import { useRoute, useRouter } from 'vue-router'
import Sider from './sider/index.vue'
import Permission from './Permission.vue'
import { useBasicLayout } from '@/hooks/useBasicLayout'
import { useAppStore, useAuthStore, useSessionStore } from '@/store'
import ComposePlaceholder from '@/views/chat/compose/index.vue'

const route = useRoute()
const router = useRouter()
const appStore = useAppStore()
const sessionStore = useSessionStore()
const authStore = useAuthStore()

function syncActiveRoute() {
  if (route.name === 'Home')
    return

  if (sessionStore.active)
    router.replace({ name: 'Chat', params: { uuid: String(sessionStore.active) } })
}

watch(
  () => route.name,
  () => syncActiveRoute(),
  { immediate: true },
)

const { isMobile } = useBasicLayout()

const collapsed = computed(() => appStore.siderCollapsed)
const isComposeMode = computed(() => appStore.siderMode === 'compose')

const needPermission = computed(() => !!authStore.session?.auth && !authStore.token)

const getMobileClass = computed(() => {
  if (isMobile.value)
    return ['rounded-none', 'shadow-none']
  return ['border', 'rounded-md', 'shadow-md', 'dark:border-neutral-800']
})

const getContainerClass = computed(() => {
  return [
    'h-full',
    { 'pl-[260px]': !isMobile.value && !collapsed.value },
  ]
})
</script>

<template>
  <div class="h-full dark:bg-[#24272e] transition-all" :class="[isMobile ? 'p-0' : 'p-4']">
    <div class="h-full overflow-hidden" :class="getMobileClass">
      <NLayout class="z-40 transition" :class="getContainerClass" has-sider>
        <Sider />
        <NLayoutContent class="h-full">
          <ComposePlaceholder v-if="isComposeMode" />
          <RouterView v-else v-slot="{ Component, route }">
            <component :is="Component" :key="route.fullPath" />
          </RouterView>
        </NLayoutContent>
      </NLayout>
    </div>
    <Permission :visible="needPermission" />
  </div>
</template>
