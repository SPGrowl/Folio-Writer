<script setup lang='ts'>
import type { Ref } from 'vue'
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { storeToRefs } from 'pinia'
import Bubble from "@/views/chat/components/Bubble/index.vue"
import {
	NAutoComplete,
	NButton,
	NInput,
	NTooltip,
	useDialog,
	useMessage,
	NDropdown,
	DropdownOption
} from 'naive-ui'
import {useSessionStore} from "@/store";
import {useSettingStore} from "@/store";
import { toPng } from 'html-to-image'
import { Message } from './components'
import { useScroll } from './hooks/useScroll'
import { useChat } from './hooks/useChat'
import { useUsingContext } from './hooks/useUsingContext'
import HeaderComponent from './components/Header/index.vue'
import { HoverButton, SvgIcon } from '@/components/common'
import { useBasicLayout } from '@/hooks/useBasicLayout'
import { useChatStore, usePromptStore } from '@/store'
import { fetchChatAPIProcess } from '@/api'
import { t } from '@/locales'
import { useIconRender } from '@/hooks/useIconRender'
const { iconRender } = useIconRender()
let controller = new AbortController()

const openLongReply = import.meta.env.VITE_GLOB_OPEN_LONG_REPLY === 'true'

const route = useRoute()
const dialog = useDialog()
const ms = useMessage()

const chatStore = useChatStore()
const sessionStore = useSessionStore()
const { isMobile } = useBasicLayout()
const { addChat, updateChat, updateChatSome, getChatByUuidAndIndex } = useChat()
const { scrollRef, scrollToBottom, scrollToBottomIfAtBottom } = useScroll()
const { usingContext, toggleUsingContext } = useUsingContext()

// 路由参数中解构uuid
const { uuid } = route.params as { uuid: string }

// 从store中获取本次聊天数据
const dataSources = computed(() => chatStore.getChatByUuid(+uuid))
const sessionSource = computed(() => sessionStore.getSessionByUuid(sessionStore.activeUuid))
const conversationList = computed(() => dataSources.value.filter(item => (!item.inversion && !!item.conversationOptions)))
// 输入框内容
const prompt = ref<string>('')
  // 是否正在加载
const loading = ref<boolean>(false)
const inputRef = ref<Ref | null>(null)
// 添加PromptStore
const promptStore = usePromptStore()

const settingStore = useSettingStore()
// 使用storeToRefs，保证store修改后，联想部分能够重新渲染
const { promptList: promptTemplate } = storeToRefs<any>(promptStore)

// 未知原因刷新页面，loading 状态不会重置，手动重置
dataSources.value.forEach((item, index) => {
  if (item.loading)
    updateChatSome(+uuid, index, { loading: false })
})

const modelList:DropdownOption[] = [
  {
    label: t('model.dsV4Flash'),
    key: 'deepseek-v4-flash',
		icon: iconRender({ icon: 'logos:deepseek-icon' }),
  },
	{
		label: t('model.dsv4Pro'),
		key: 'deepseek-v4-pro',
		icon: iconRender({icon: 'logos:deepseek-icon'}),
	}
]
function handleSubmit() {
  // onConversation()
  sessionStore.addTurn(sessionStore.activeUuid as number, prompt.value)
  prompt.value = ''
  // TODO：发送请求，更新store
  const requestBody:OpenAI.Message[]=sessionStore.composeRequest(sessionStore.activeUuid as number, (sessionSource.value?.context.length as number-1) as number)
//  
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

function handleDelete(index: number) {
 
}

function handleClear() {
 
}

// 处理回车键事件
function handleEnter(event: KeyboardEvent) {
  if (!isMobile.value) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      handleSubmit()
    }
  }
  else {
    if (event.key === 'Enter' && event.ctrlKey) {
      event.preventDefault()
      handleSubmit()
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
	settingStore.updateSetting({ modelName:key })
	ms.success(`${t('model.modelAlert')}${settingStore.modelName}`)

}
// 可优化部分
// 搜索选项计算，这里使用value作为索引项，所以当出现重复value时渲染异常(多项同时出现选中效果)
// 理想状态下其实应该是key作为索引项,但官方的renderOption会出现问题，所以就需要value反renderLabel实现
const searchOptions = computed(() => {
  if (prompt.value.startsWith('/')) {
    return promptTemplate.value.filter((item: { key: string }) => item.key.toLowerCase().includes(prompt.value.substring(1).toLowerCase())).map((obj: { value: any }) => {
      return {
        label: obj.value,
        value: obj.value,
      }
    })
  }
  else {
    return []
  }
})

// value反渲染key
const renderOption = (option: { label: string }) => {
  for (const i of promptTemplate.value) {
    if (i.value === option.label)
      return [i.key]
  }
  return []
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

onMounted(() => {
  scrollToBottom()
  if (inputRef.value && !isMobile.value)
    inputRef.value?.focus()
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
      :using-context="usingContext"
      @export="handleExport"
      @handle-clear="handleClear"
    />
    <main class="flex-1 overflow-hidden">
      <div id="scrollRef" ref="scrollRef" class="h-full overflow-hidden overflow-y-auto">
        <div
          class="w-full max-w-screen-xl m-auto dark:bg-[#101014]"
          :class="[isMobile ? 'p-2' : 'p-4']"
        >
<!--对话列表，对应着对话区-->
              </div>
							<div v-for="(turn,turnIndex) in sessionSource.context " :key="turnIndex">
								<Bubble v-bind="turn.user" :turnIndex="turnIndex" ></Bubble>
                <Bubble v-bind="turn.assistant" :turnIndex="turnIndex" ></Bubble>
							</div>
          </div>
    </main>
    <footer :class="footerClass">
      <div class="w-full max-w-screen-xl m-auto">
        <div class="flex items-center justify-between space-x-2">
          <HoverButton v-if="!isMobile" @click="handleClear">
            <span class="text-xl text-[#4f555e] dark:text-white">
              <SvgIcon icon="ri:delete-bin-line" />
            </span>
          </HoverButton>
          <HoverButton v-if="!isMobile" @click="handleExport">
            <span class="text-xl text-[#4f555e] dark:text-white">
              <SvgIcon icon="ri:download-2-line" />
            </span>
          </HoverButton>
<!--					是否使用对话上下文-->
          <HoverButton @click="toggleUsingContext">
            <span class="text-xl" :class="{ 'text-[#4b9e5f]': usingContext, 'text-[#a8071a]': !usingContext }">

              <SvgIcon icon="ri:chat-history-line" />
            </span>
          </HoverButton>
					<n-dropdown
						trigger="hover"
						placement="top-start"
						:show-arrow="true"
						:options="modelList"
						@select="handleModelName"
						:value="settingStore.modelName"

					>
<!--						模型选择-->
						<HoverButton >
            <span class="text-xl text-[#4f555e] dark:text-white">
							<SvgIcon icon="carbon:model-alt"></SvgIcon>
            </span>
						</HoverButton>
					</n-dropdown>

          <NAutoComplete v-model:value="prompt" :options="searchOptions" :render-label="renderOption" >
            <template #default="{ handleInput, handleBlur, handleFocus }">
              <NInput
                ref="inputRef"
                v-model:value="prompt"
                type="textarea"
                :placeholder="placeholder"
                :autosize="{ minRows: 1, maxRows: isMobile ? 4 : 8 }"
                @input="handleInput"
                @focus="handleFocus"
                @blur="handleBlur"
                @keypress="handleEnter"
              />
            </template>
          </NAutoComplete>
          <NButton type="primary" :disabled="buttonDisabled" @click="handleSubmit" v-if="!loading">
            <template #icon >
              <span class="dark:text-black">
                <SvgIcon  icon="ri:send-plane-fill" />
              </span>
            </template>
          </NButton>

					<template v-else>
						<n-tooltip trigger="hover"><template #trigger>
						<NButton type="primary" :disabled="!buttonDisabled" @click="handleStop"  >
							<template #icon>
              <span class="dark:text-black">
<!--								使用iconfy库-->
                <SvgIcon icon="famicons:stop-circle" />
              </span>
							</template>
						</NButton>
					</template>
							{{t('tooltip.stop')}}
						</n-tooltip>
					</template>


        </div>
      </div>
    </footer>
  </div>
</template>
