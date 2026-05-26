<script setup lang='ts'>
import { ref } from 'vue'
import { NButton, NInput, useMessage } from 'naive-ui'
import AvatarComponent from './Avatar.vue'
import TextComponent from './Text.vue'
import { SvgIcon } from '@/components/common'
import { t } from '@/locales'
import { useBasicLayout } from '@/hooks/useBasicLayout'
import { copyToClip } from '@/utils/copy'

interface Props {
  dateTime?: string
  text?: string
  inversion?: boolean
  error?: boolean
  loading?: boolean
  count?: number
}

interface Emit {
  (ev: 'regenerate'): void
  (ev: 'delete'): void
}

const props = defineProps<Props>()

const emit = defineEmits<Emit>()

const { isMobile } = useBasicLayout()

const message = useMessage()

const asRawText = ref(props.inversion)
const editDraft = ref<string>('')
const isEditing = ref<boolean>(false)
const showActions = ref<boolean>(false)

async function handleCopy() {
  try {
    await copyToClip(props.text || '')
    message.success(t('chat.copied'))
  }
  catch {
    message.error(t('chat.copyFailed'))
  }
}

function updatePrompt() {
  editDraft.value = props.text as string
  isEditing.value = true
}

function handleCancelEdit() {
  isEditing.value = false
  editDraft.value = ''
}

function handleSubmitEdit() {
  isEditing.value = false
  editDraft.value = ''
  // TODO:将本次编辑的Promt发送，并更新会话
}
</script>

<template>
  <div
    class="flex w-full mb-6 overflow-hidden"
    :class="[{ 'flex-row-reverse': inversion }]"
  >
    <div
      class="flex items-center justify-center flex-shrink-0 h-8 overflow-hidden rounded-full basis-8"
      :class="[inversion ? 'ml-2' : 'mr-2']"
    >
      <AvatarComponent :image="inversion" />
    </div>
    <div class="overflow-hidden text-sm" :class="[inversion ? 'items-end' : 'items-start']">
      <p class="text-xs text-[#b4bbc4]" :class="[inversion ? 'text-right' : 'text-left']">
        {{ dateTime }}
      </p>
      <div
        class="flex items-end gap-1 mt-2"
        :class="[inversion ? 'flex-row-reverse' : 'flex-row']"
      >
        <div
          class="relative max-w-full"
          :class="[inversion ? 'flex flex-col items-end' : 'flex flex-col items-start']"
          @mouseenter="showActions = true"
          @mouseleave="showActions = false"
        >
          <TextComponent
            v-if="!isEditing"
            :inversion="inversion"
            :error="error"
            :text="text"
            :loading="loading"
            :as-raw-text="asRawText"
          />

          <NInput
            v-else
            v-model:value="editDraft"
            class="message-edit-input w-full min-w-[20px]"
            type="textarea"
            :autosize="{ minRows: 2, maxRows: 8 }"
          >
            <template #suffix>
              <div class="message-edit-actions flex items-center gap-2">
                <NButton size="tiny" quaternary @click="handleCancelEdit">
                  {{ t('bubble.cancel') }}
                </NButton>
                <NButton
                  size="tiny"
                  type="primary"
                  :disabled="!editDraft.trim()"
                  @click="handleSubmitEdit"
                >
                  {{ t('bubble.send') }}
                </NButton>
              </div>
            </template>
          </NInput>

          <!-- 操作栏：气泡下方、右侧，固定高度占位 -->
          <div
            v-if="inversion && !isEditing"
            class="message-actions flex h-6 min-h-6 w-full shrink-0 items-center justify-end"
          >
            <div
              class="flex items-center gap-0.5 transition-opacity duration-150"
              :class="[
                isMobile || showActions ? 'opacity-100' : 'opacity-0 pointer-events-none',
              ]"
            >
              <button
                type="button"
                class="p-1 transition text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
                :title="t('common.edit')"
                @click="updatePrompt"
              >
                <SvgIcon icon="ri:edit-line" class="text-base" />
              </button>
              <button
                type="button"
                class="p-1 transition text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
                :title="t('chat.copy')"
                @click="handleCopy"
              >
                <SvgIcon icon="ri:file-copy-2-line" class="text-base" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.message-edit-input :deep(.n-input-wrapper) {
  align-items: flex-end;
}

.message-edit-input :deep(.n-input__suffix) {
  align-self: flex-end;
  line-height: 1;
  padding-bottom: 6px;
}
</style>
