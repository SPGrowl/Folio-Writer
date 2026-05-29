<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import { NButton, NInput } from 'naive-ui'
import { SvgIcon } from '@/components/common'
import { useBasicLayout } from '@/hooks/useBasicLayout'
import { t } from '@/locales'
import { useSessionStore } from '@/store'

interface Props {
  size?: 'default' | 'large'
}

const props = withDefaults(defineProps<Props>(), {
  size: 'default',
  static: true,
})

const sessionStore = useSessionStore()
const { isMobile } = useBasicLayout()

const prompt = ref('')

const isLarge = computed(() => props.size === 'large')

const placeholder = computed(() => {
  if (isMobile.value)
    return t('chat.placeholderMobile')
  return t('chat.placeholder')
})

const canSend = computed(() => prompt.value.trim().length > 0)

const rootClass = computed(() => [
  'flex items-end w-full',
  isLarge.value ? 'gap-3' : 'gap-2',
])

const inputClass = computed(() => (isLarge.value ? 'home-composer-input' : ''))

const autosize = computed(() => {
  if (isLarge.value)
    return { minRows: 3, maxRows: 8 }
  return { minRows: 1, maxRows: isMobile.value ? 4 : 8 }
})

function insertNewline(event: KeyboardEvent) {
  const target = event.target as HTMLTextAreaElement | null
  if (!target || target.selectionStart == null)
    return

  event.preventDefault()
  const start = target.selectionStart
  const end = target.selectionEnd ?? start
  const value = prompt.value
  prompt.value = `${value.slice(0, start)}\n${value.slice(end)}`
  nextTick(() => {
    target.selectionStart = target.selectionEnd = start + 1
  })
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key !== 'Enter')
    return

  if (event.ctrlKey) {
    insertNewline(event)
    return
  }

  event.preventDefault()
  handleSend()
}

function handleSend() {
  const text = prompt.value.trim()
  if (!text)
    return

  sessionStore.createSession(text)
  prompt.value = ''
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
      @keydown="handleKeydown"
    >
      <template #suffix>
        <NButton
          type="primary"
          :size="isLarge ? 'large' : 'medium'"
          :disabled="!canSend"
          @click="handleSend"
        >
          <template #icon>
            <span :class="isLarge ? 'text-2xl' : ''" class="dark:text-black">
              <SvgIcon icon="ri:send-plane-fill" />
            </span>
          </template>
        </NButton>
      </template>
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
