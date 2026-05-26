<script setup lang='ts'>
import { computed, ref } from 'vue'
import { NDropdown, useMessage } from 'naive-ui'
import AvatarComponent from './Avatar.vue'
import TextComponent from './Text.vue'
import { SvgIcon } from '@/components/common'
import { useIconRender } from '@/hooks/useIconRender'
import { t } from '@/locales'
import { useBasicLayout } from '@/hooks/useBasicLayout'
import { copyToClip } from '@/utils/copy'

interface Props {
  dateTime?: string
  text?: string
  inversion?: boolean
  error?: boolean
  loading?: boolean
	count?:number
}

interface Emit {
  (ev: 'regenerate'): void
  (ev: 'delete'): void
}

const props = defineProps<Props>()

const emit = defineEmits<Emit>()

const { isMobile } = useBasicLayout()

const { iconRender } = useIconRender()

const message = useMessage()

const textRef = ref<HTMLElement>()


const asRawText = ref(props.inversion)
const editDraft = ref<string>('')
const messageRef = ref<HTMLElement>()
const isEditing = ref<boolean>(false)
const showActions = ref<boolean>(false)
const options = computed(() => {
  const common = [
    {
      label: t('chat.copy'),
      key: 'copyText',
      icon: iconRender({ icon: 'ri:file-copy-2-line' }),
    },
    // {
    //   label: t('common.delete'),
    //   key: 'delete',
    //   icon: iconRender({ icon: 'ri:delete-bin-line' }),
    // },

  ]
if (props.inversion) {
  common.unshift({
    label: t('common.edit'),  // 已有文案「编辑」
    key: 'edit',
    icon: iconRender({ icon: 'mingcute:edit-line' }),
  })
}
  if (!props.inversion) {
    common.unshift({
      label: asRawText.value ? t('chat.preview') : t('chat.showRawText'),
      key: 'toggleRenderType',
      icon: iconRender({ icon: asRawText.value ? 'ic:outline-code-off' : 'ic:outline-code' }),
    })
  }

  return common
})


function handleSelect(key: 'copyText' | 'delete' | 'toggleRenderType') {
  switch (key) {
    case 'copyText':
      handleCopy()
      return
    case 'toggleRenderType':
      asRawText.value = !asRawText.value
      return
    case 'delete':
      emit('delete')
  }
}

function handleRegenerate() {
  messageRef.value?.scrollIntoView()
  emit('regenerate')
}

async function handleCopy() {
  try {
    await copyToClip(props.text || '')
    message.success(t('chat.copied'))
  }
  catch {
    message.error(t('chat.copyFailed'))
  }
}
function updatePrompt(){
  editDraft.value = props.text as string
  isEditing.value = true
}
function handleCancelEdit(){
  isEditing.value = false
  editDraft.value = ''
}
function handleSubmitEdit(){
  isEditing.value = false
  editDraft.value = ''
  // TODO:将本次编辑的Promt发送，并更新会话
}
</script>

<template>
  <div
    ref="messageRef"
    class="flex w-full mb-6 overflow-hidden"
    :class="[{ 'flex-row-reverse': inversion }]"
  >
    <div
      class="flex items-center justify-center flex-shrink-0 h-8 overflow-hidden rounded-full basis-8"
      :class="[inversion ? 'ml-2' : 'mr-2']"
    >
      <AvatarComponent :image="inversion" />
    </div>
    <div class="overflow-hidden text-sm " :class="[inversion ? 'items-end' : 'items-start']">
      <!-- 对话时间 -->
      <p class="text-xs text-[#b4bbc4]" :class="[inversion ? 'text-right' : 'text-left']">
        {{ dateTime }}
      </p>
      <div
        class="flex items-end gap-1 mt-2"
        :class="[inversion ? 'flex-row-reverse' : 'flex-row']"
      >
<div
  class="relative mt-2"
  :class="[inversion ? 'flex flex-col items-end' : 'flex flex-col items-start']"
>
  <!-- 仅用户消息需要悬停条；助手可另做一套或保留 regenerate -->
  <div
    class="group/bubble relative max-w-full"
    @mouseenter="showActions = true"
    @mouseleave="showActions = false"
  >
    <!-- 编辑态 NInput + 取消/发送 -->
       <TextComponent
          ref="textRef"
          :inversion="inversion"
          :error="error"
          :text="text"
          :loading="loading"
          :as-raw-text="asRawText"
          v-if="!isEditing"
        />
        <!-- 编辑态 -->
        <div v-else>
          <NInput
         v-model:value="editDraft"
        type="textarea"
         :autosize="{ minRows: 2, maxRows: 8 }"/>
        <!-- 取消/发送 -->
        <div class="flex gap-2 mt-2 justify-end">
          <NButton size="small" @click="handleCancelEdit">
            {{ t('common.no') }}  <!-- 或 locales 里加 cancel -->
          </NButton>
          <NButton size="small" type="primary" :disabled="!editDraft.trim()" @click="handleSubmitEdit">
            {{ t('common.confirm') }} <!-- 或「发送」文案 -->
          </NButton>
        </div>
        </div>
          <div
            v-if="inversion && !isEditing&&showActions"
            class="flex items-center gap-1 mt-1 h-6 transition-opacity duration-150"
            :class="[
              inversion ? 'justify-end' : 'justify-start',
              isMobile ? 'opacity-100' : 'opacity-0 group-hover/bubble:opacity-100',
            ]"
          >
            <button :title="t('common.edit')" @click="updatePrompt">
              <SvgIcon icon="mingcute:edit-line" />
            </button>
            <button :title="t('chat.copy')" @click="handleCopy">
              <SvgIcon icon="ri:file-copy-2-line" />
            </button>
            <!-- 需要再加删除等，继续横排即可 -->
          </div>  
  </div>
  </div>

  <!-- 操作栏：气泡外、下方、右侧 -->

</div>
      
        <!-- <div class="flex flex-col">
          <button
            v-if="!inversion"
            class="mb-2 transition text-neutral-300 hover:text-neutral-800 dark:hover:text-neutral-300"
            @click="handleRegenerate"
          >
            <SvgIcon icon="ri:restart-line" />
          </button>
          <NDropdown
            :trigger="isMobile ? 'click' : 'hover'"
            :placement="!inversion ? 'right' : 'left'"
            :options="options"
            @select="handleSelect"
          >
            <button class="transition text-neutral-300 hover:text-neutral-800 dark:hover:text-neutral-200">
              <SvgIcon icon="ri:more-2-fill" />
            </button>
          </NDropdown>
        </div> -->
        
      </div>
    </div>
</template>
