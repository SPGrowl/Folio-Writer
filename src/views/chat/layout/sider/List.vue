<script setup lang='ts'>
import { ref } from 'vue'
import { NButton, NInput, NPopconfirm, NScrollbar } from 'naive-ui'
import { PromptStore, SvgIcon } from '@/components/common'
import { useAppStore, useChatStore, useSessionStore } from '@/store'
import { useBasicLayout } from '@/hooks/useBasicLayout'
import { debounce } from '@/utils/functions/debounce'

const { isMobile } = useBasicLayout()

const appStore = useAppStore()
const chatStore = useChatStore()
const sessionStore = useSessionStore()
const editingUuid = ref<number | null>(null)
const showPromptStore = ref(false)

async function handleAdd() {
  await chatStore.goHome()
  if (isMobile.value)
    appStore.setSiderCollapsed(true)
}

async function handleSelect(session: Chat.Session) {
  if (isActive(session.uuid))
    return

  editingUuid.value = null
  await sessionStore.setActive(session.uuid)
  if (isMobile.value)
    appStore.setSiderCollapsed(true)
}

function handleEdit(session: Chat.Session, isEdit: boolean, event?: MouseEvent) {
  event?.stopPropagation()
  editingUuid.value = isEdit ? session.uuid : null
  if (!isEdit)
    sessionStore.recordState()
}

function handleDelete(uuid: number, event?: MouseEvent | TouchEvent) {
  event?.stopPropagation()
  if (editingUuid.value === uuid)
    editingUuid.value = null
  sessionStore.deleteSession(uuid)
  if (isMobile.value)
    appStore.setSiderCollapsed(true)
}

const handleDeleteDebounce = debounce(handleDelete, 600)

function handleEnter(session: Chat.Session, event: KeyboardEvent) {
  event?.stopPropagation()
  if (event.key === 'Enter') {
    editingUuid.value = null
    sessionStore.recordState()
  }
}

function isActive(uuid: number) {
  return sessionStore.active === uuid
}

function isEditing(uuid: number) {
  return editingUuid.value === uuid
}
</script>

<template>
  <div class="flex flex-col flex-1 min-h-0">
    <div class="p-4">
      <NButton dashed block @click="handleAdd">
        {{ $t('chat.newChatButton') }}
      </NButton>
    </div>
    <div class="flex-1 min-h-0 pb-4 overflow-hidden">
      <NScrollbar class="px-4">
        <div class="flex flex-col gap-2 text-sm">
          <template v-if="!sessionStore.sessions.length">
            <div class="flex flex-col items-center mt-4 text-center text-neutral-300">
              <SvgIcon icon="ri:inbox-line" class="mb-2 text-3xl" />
              <span>{{ $t('common.noData') }}</span>
            </div>
          </template>
          <template v-else>
            <div v-for="session of sessionStore.sessions" :key="session.uuid">
              <a
                class="relative flex items-center gap-3 px-3 py-3 break-all border rounded-md cursor-pointer hover:bg-neutral-100 group dark:border-neutral-800 dark:hover:bg-[#24272e]"
                :class="isActive(session.uuid) && ['border-[#4b9e5f]', 'bg-neutral-100', 'text-[#4b9e5f]', 'dark:bg-[#24272e]', 'dark:border-[#4b9e5f]', 'pr-14']"
                @click="handleSelect(session)"
              >
                <span>
                  <SvgIcon icon="ri:message-3-line" />
                </span>
                <div class="relative flex-1 overflow-hidden break-all text-ellipsis whitespace-nowrap">
                  <NInput
                    v-if="isEditing(session.uuid)"
                    v-model:value="session.title" size="tiny"
                    @keypress="handleEnter(session, $event)"
                  />
                  <span v-else>{{ session.title }}</span>
                </div>
                <div v-if="isActive(session.uuid)" class="absolute z-10 flex visible right-1">
                  <template v-if="isEditing(session.uuid)">
                    <button class="p-1" @click="handleEdit(session, false, $event)">
                      <SvgIcon icon="ri:save-line" />
                    </button>
                  </template>
                  <template v-else>
                    <button class="p-1">
                      <SvgIcon icon="ri:edit-line" @click="handleEdit(session, true, $event)" />
                    </button>
                    <NPopconfirm placement="bottom" @positive-click="handleDeleteDebounce(session.uuid, $event)">
                      <template #trigger>
                        <button class="p-1">
                          <SvgIcon icon="ri:delete-bin-line" />
                        </button>
                      </template>
                      {{ $t('chat.deleteHistoryConfirm') }}
                    </NPopconfirm>
                  </template>
                </div>
              </a>
            </div>
          </template>
        </div>
      </NScrollbar>
    </div>
    <div v-if="!appStore.liteMode" class="p-4">
      <NButton block @click="showPromptStore = true">
        {{ $t('store.siderButton') }}
      </NButton>
    </div>
    <PromptStore v-model:visible="showPromptStore" />
  </div>
</template>
