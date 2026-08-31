<script setup lang='ts'>
import type { Ref } from 'vue'
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import Bubble from '@/views/chat/components/Bubble/index.vue'
import {
  NButton,
  NInput,
  useDialog,
  useMessage,
  NDropdown,
  DropdownOption,
} from 'naive-ui'
import { useSessionStore, useSettingStore } from '@/store'
import { toPng } from 'html-to-image'
import { useScroll } from './hooks/useScroll'
import HeaderComponent from './components/Header/index.vue'
import { HoverButton, SvgIcon } from '@/components/common'
import { useBasicLayout } from '@/hooks/useBasicLayout'
import { submitRequestBody } from '@/api'
import { t } from '@/locales'
import { useIconRender } from '@/hooks/useIconRender'

const { iconRender } = useIconRender()
let controller = new AbortController()

const route = useRoute()
const dialog = useDialog()
const ms = useMessage()

const sessionStore = useSessionStore()
const { isMobile } = useBasicLayout()
const { scrollRef, scrollToBottom, scrollToBottomIfAtBottom } = useScroll()

const { uuid } = route.params as { uuid: string }

const sessionSource = computed(() => {
  const id = +uuid || sessionStore.activeUuid
  if (id == null)
    return null
  return sessionStore.getSessionByUuid(id)
})

const prompt = ref<string>('')
const loading = ref<boolean>(false)
const inputRef = ref<Ref | null>(null)
const settingStore = useSettingStore()

const modelList: DropdownOption[] = [
  {
    label: t('model.dsV4Flash'),
    key: 'deepseek-v4-flash',
    icon: iconRender({ icon: 'logos:deepseek-icon' }),
  },
  {
    label: t('model.dsv4Pro'),
    key: 'deepseek-v4-pro',
    icon: iconRender({ icon: 'logos:deepseek-icon' }),
  },
]

/** 对指定轮次发起 SSE 流式请求，增量更新 sessionStore */
async function streamTurn(uuid: number, turnIndex: number) {
  loading.value = true
  // 终止请求
  controller = new AbortController()

  const messages = sessionStore.composeRequest(uuid, turnIndex)

  try {
    await submitRequestBody(messages, {
      signal: controller.signal,
      onChunk(delta) {
        sessionStore.appendAssistantDelta(uuid, turnIndex, delta)
        scrollToBottomIfAtBottom()
      },
      onDone() {
        sessionStore.finishTurn(uuid, turnIndex)
        loading.value = false
      },
      onError(message) {
        sessionStore.setTurnError(uuid, turnIndex, message)
        loading.value = false
      },
    })
  }
  catch (error: any) {
    if (error?.name === 'AbortError')
      loading.value = false
    else
      sessionStore.setTurnError(uuid, turnIndex, error?.message ?? 'Request failed')
    loading.value = false
  }
}

async function handleAppend() {
  const activeUuid = sessionStore.activeUuid
  const text = prompt.value.trim()
  if (!activeUuid || !text || loading.value)
    return

  sessionStore.addTurn(activeUuid, text)
  prompt.value = ''

  const turnIndex = (sessionStore.getSessionByUuid(activeUuid)?.context.length ?? 1) - 1
  scrollToBottom()
  await streamTurn(activeUuid, turnIndex)
}

/** 更新上下文并重新流式请求指定轮次 */
async function resendTurn(turnIndex: number, text?: string) {
  const activeUuid = sessionStore.activeUuid
  if (!activeUuid || loading.value)
    return

  sessionStore.updateContext(activeUuid, turnIndex, text)
  scrollToBottom()
  await streamTurn(activeUuid, turnIndex)
}

async function handleEditSubmit(turnIndex: number, text: string) {
  await resendTurn(turnIndex, text)
}

async function handleRetry(turnIndex: number) {
  await resendTurn(turnIndex)
}

function handleExport() {
  if (loading.value)
    return

  const d = dialog.warning({
    title: t('chat.exportImage'),
    content: t('chat.exportImageConfirm'),
    positiveText: t('common.yes'),
    negativeText: t('common.no'),
 
    onPositiveClick: async () => {
      try {
        d.loading = true
        const ele = document.getElementById('image-wrapper')
        const imgUrl = await toPng(ele as HTMLDivElement)
        const tempLink = document.createElement('a')
        tempLink.style.display = 'none'
        tempLink.href = imgUrl
        tempLink.setAttribute('download', 'chat-shot.png')
        if (typeof tempLink.download === 'undefined')
          tempLink.setAttribute('target', '_blank')
        document.body.appendChild(tempLink)
        tempLink.click()
        document.body.removeChild(tempLink)
        window.URL.revokeObjectURL(imgUrl)
        d.loading = false
        ms.success(t('chat.exportSuccess'))
        Promise.resolve()
      }
      catch (error: any) {
        ms.error(t('chat.exportFailed'))
      }
      finally {
        d.loading = false
      }
    },
  })
}

function handleEnter(event: KeyboardEvent) {
  if (!isMobile.value) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      handleAppend()
    }
  }
  else {
    if (event.key === 'Enter' && event.ctrlKey) {
      event.preventDefault()
      handleAppend()
    }
  }
}

function handleStop() {
  if (loading.value) {
    controller.abort()
    loading.value = false
  }
}

function handleModelName(key: string) {
  settingStore.updateSetting({ modelName: key })
  ms.success(`${t('model.modelAlert')}${settingStore.modelName}`)
}

const placeholder = computed(() => {
  if (isMobile.value)
    return t('chat.placeholderMobile')
  return t('chat.placeholder')
})

const buttonDisabled = computed(() => {
  return loading.value || !prompt.value || prompt.value.trim() === ''
})

const footerClass = computed(() => {
  let classes = ['p-4']
  if (isMobile.value)
    classes = ['sticky', 'left-0', 'bottom-0', 'right-0', 'p-2', 'pr-3', 'overflow-hidden']
  return classes
})

onMounted(async () => {
  scrollToBottom()
  if (inputRef.value && !isMobile.value)
    inputRef.value?.focus()

  // 从 Home 页 createSession 跳转而来时，首轮 assistant 尚未回复，自动发起流式请求
  const activeUuid = sessionStore.activeUuid
  if (activeUuid == null || loading.value)
    return
  const session = sessionStore.getSessionByUuid(activeUuid)
  if (!session?.context.length)
    return
  const lastTurn = session.context[session.context.length - 1]
  if (lastTurn.assistant.text == null)
    await streamTurn(activeUuid, lastTurn.turnIndex)
})

onUnmounted(() => {
  if (loading.value)
    controller.abort()
})
</script>

<template>
  <div class="flex flex-col w-full h-full">
    <HeaderComponent
      v-if="isMobile"
      @export="handleExport"
    />
    <main class="flex-1 overflow-hidden">
      <div id="scrollRef" ref="scrollRef" class="h-full overflow-hidden overflow-y-auto">
        <div
          id="image-wrapper"
          class="w-full max-w-screen-xl m-auto dark:bg-[#101014]"
          :class="[isMobile ? 'p-2' : 'p-4']"
        >
          <template v-if="sessionSource?.context">
            <div v-for="(turn, turnIndex) in sessionSource.context" :key="turnIndex">
              <Bubble
                v-bind="turn.user"
                :turn-index="turnIndex"
                @edit-submit="handleEditSubmit($event.turnIndex, $event.text)"
              />
              <Bubble
                v-bind="turn.assistant"
                :turn-index="turnIndex"
                @retry="handleRetry($event.turnIndex)"
              />
            </div>
          </template>
        </div>
      </div>
    </main>
    <footer :class="footerClass">
      <div class="w-full max-w-screen-xl m-auto">
        <div class="flex items-center justify-between space-x-2">
          <HoverButton v-if="!isMobile" @click="handleExport">
            <span class="text-xl text-[#4f555e] dark:text-white">
              <SvgIcon icon="ri:download-2-line" />
            </span>
          </HoverButton>
          <n-dropdown
            trigger="hover"
            placement="top-start"
            :show-arrow="true"
            :options="modelList"
            :value="settingStore.modelName"
            @select="handleModelName"
          >
            <HoverButton>
              <span class="text-xl text-[#4f555e] dark:text-white">
                <SvgIcon icon="carbon:model-alt" />
              </span>
            </HoverButton>
          </n-dropdown>

          <NInput
            ref="inputRef"
            v-model:value="prompt"
            type="textarea"
            :placeholder="placeholder"
            :autosize="{ minRows: 1, maxRows: isMobile ? 4 : 8 }"
            @keypress="handleEnter"
          />
          <NButton v-if="!loading" type="primary" :disabled="buttonDisabled" @click="handleAppend">
            <template #icon>
              <span class="dark:text-black">
                <SvgIcon icon="ri:send-plane-fill" />
              </span>
            </template>
          </NButton>

          <template v-else>
            <n-tooltip trigger="hover">
              <template #trigger>
                <NButton type="primary" :disabled="!buttonDisabled" @click="handleStop">
                  <template #icon>
                    <span class="dark:text-black">
                      <SvgIcon icon="famicons:stop-circle" />
                    </span>
                  </template>
                </NButton>
              </template>
              {{ t('tooltip.stop') }}
            </n-tooltip>
          </template>
        </div>
      </div>
    </footer>
  </div>
</template>
