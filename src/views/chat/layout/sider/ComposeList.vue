<script setup lang='ts'>
import { NScrollbar } from 'naive-ui'
import { SvgIcon } from '@/components/common'

const composeList: { uuid: number, title: string }[] = []
</script>

<template>
  <NScrollbar class="px-4">
    <div class="flex flex-col gap-2 text-sm">
      <template v-if="!composeList.length">
        <div class="flex flex-col items-center mt-4 text-center text-neutral-300">
          <SvgIcon icon="ri:file-text-line" class="mb-2 text-3xl" />
          <span>{{ $t('common.noData') }}</span>
        </div>
      </template>
    </div>
  </NScrollbar>
</template>
