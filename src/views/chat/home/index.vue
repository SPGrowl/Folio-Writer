<script setup lang="ts">
import ChatComposer from '../components/ChatComposer/index.vue'
import { SvgIcon } from '@/components/common'
import { t } from '@/locales'
</script>

<template>
  <div class="flex flex-col w-full h-full">
    <main class="flex-1 overflow-hidden">
      <div class="flex h-full items-center justify-center px-6 py-8">
        <div class="flex w-full max-w-3xl flex-col items-center gap-10">
          <div class="flex flex-col items-center gap-4 text-center text-neutral-600 dark:text-neutral-300">
            <SvgIcon icon="si:ai-chat-line" class="text-6xl text-[#4b9e5f]" />
            <h1 class="text-3xl font-medium tracking-wide md:text-4xl">
              {{ t('common.welcome') }}
            </h1>
          </div>
          <ChatComposer size="large" static class="w-full text-left" />
        </div>
      </div>
    </main>
  </div>
</template>
