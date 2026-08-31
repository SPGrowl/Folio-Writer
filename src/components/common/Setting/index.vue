<script setup lang='ts'>
import { computed } from 'vue'
import { NModal } from 'naive-ui'
import General from './General.vue'

interface Props {
  visible: boolean
}

interface Emit {
  (e: 'update:visible', visible: boolean): void
}

const props = defineProps<Props>()

const emit = defineEmits<Emit>()

const show = computed({
  get() {
    return props.visible
  },
  set(visible: boolean) {
    emit('update:visible', visible)
  },
})
</script>

<template>
  <NModal v-model:show="show" :auto-focus="false" preset="card" style="width: 95%; max-width: 640px" :title="$t('setting.setting')">
    <General />
  </NModal>
</template>
