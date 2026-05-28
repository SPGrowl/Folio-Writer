<script setup lang="ts">
import { computed, ref } from 'vue'
import { NButton, NInput } from 'naive-ui'
import { SvgIcon } from '@/components/common'
import { useBasicLayout } from '@/hooks/useBasicLayout'
import { t } from '@/locales'
import { useSessionStore } from '@/store'
interface Props {
  size?: 'default' | 'large'
  static?: boolean
}
const sessionStore = useSessionStore()
const props = withDefaults(defineProps<Props>(), {
  size: 'default',
  static:true,
})

const emit = defineEmits<{
  (ev: 'submit', value: string): void
}>()

const { isMobile } = useBasicLayout()

const prompt = ref('')

const isLarge = computed(() => props.size === 'large')

const placeholder = computed(() => {
  if (isMobile.value)
    return t('chat.placeholderMobile')
  return t('chat.placeholder')
})

const buttonDisabled = computed(() => {
  return props.static || !prompt.value || prompt.value.trim() === ''
})

const rootClass = computed(() => {
  return [
    'flex items-end w-full',
    isLarge.value ? 'gap-3' : 'gap-2',
  ]
})

const inputClass = computed(() => {
  return isLarge.value ? 'home-composer-input' : ''
})

const autosize = computed(() => {
  if (isLarge.value)
    return { minRows: 3, maxRows: 8 }
  return { minRows: 1, maxRows: isMobile.value ? 4 : 8 }
})

function createSession() {
  sessionStore.createSession(prompt.value.trim())
}
// 实现换行功能
function handleEnter(event: KeyboardEvent) {
  if (!isMobile.value) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()

    }
  }
  else if (event.key === 'Enter' && event.ctrlKey) {
    event.preventDefault()
  }
}
</script>

<template>
  <div :class="rootClass">
    <NInput
      v-model:value="prompt"
      type="textarea"
      :class="inputClass"
      :placeholder="placeholder"
      :autosize="autosize"
      :disabled="!static"
      @keypress="handleEnter"
    >
			<template #suffix> <NButton
				type="primary"
				:size="isLarge ? 'large' : 'medium'"
				:disabled="!prompt.trim().length"
				@click="createSession"
			>
				<template #icon>
        <span :class="isLarge ? 'text-2xl' : ''" class="dark:text-black">
          <SvgIcon icon="ri:send-plane-fill" />
        </span>
				</template>
			</NButton></template>
		</NInput>

  </div>
</template>

<style scoped>
.home-composer-input :deep(.n-input__textarea-el) {
  font-size: 1.125rem;
  line-height: 1.75rem;
  text-align: left;
}

.home-composer-input :deep(.n-input-wrapper) {
  padding-top: 0.75rem;
  padding-bottom: 0.75rem;
}
</style>
