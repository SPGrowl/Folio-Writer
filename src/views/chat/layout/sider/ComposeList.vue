<script setup lang='ts'>
import { computed, onMounted, ref } from 'vue'
import { NButton, NInput, NPopconfirm, NScrollbar } from 'naive-ui'
import { SvgIcon } from '@/components/common'
import { useAppStore, useComposeStore, useComposeTabStore } from '@/store'
import { useBasicLayout } from '@/hooks/useBasicLayout'

const appStore = useAppStore()
const composeStore = useComposeStore()
const tabStore = useComposeTabStore()
const { isMobile } = useBasicLayout()

const editingGroupId = ref<string | null>(null)
const editingGroupName = ref('')
const collapsedGroups = ref<Set<string>>(new Set())

onMounted(() => {
  composeStore.bootstrap()
})

const hasContent = computed(() =>
  composeStore.groups.length > 0 || composeStore.articles.length > 0,
)

function isGroupExpanded(groupId: string) {
  return !collapsedGroups.value.has(groupId)
}

function toggleGroup(groupId: string) {
  const next = new Set(collapsedGroups.value)
  if (next.has(groupId))
    next.delete(groupId)
  else
    next.add(groupId)
  collapsedGroups.value = next
}

async function handleAdd(groupId?: string) {
  await composeStore.createArticle('# 新文章\n', undefined, groupId)
  if (isMobile.value)
    appStore.setSiderCollapsed(true)
}

async function handleAddGroup() {
  await composeStore.createGroup('新分组')
}

function isActive(id: number) {
  return tabStore.isTabOpen(id)
}

function handleSelect(article: Compose.Article) {
  tabStore.openTab(article.id)
  if (isMobile.value)
    appStore.setSiderCollapsed(true)
}

async function handleDeleteArticle(id: number, event?: MouseEvent | TouchEvent) {
  event?.stopPropagation()
  await composeStore.removeArticle(id)
}

function startEditGroup(group: Compose.ArticleGroup, event?: MouseEvent) {
  event?.stopPropagation()
  editingGroupId.value = group.id
  editingGroupName.value = group.name
}

async function saveEditGroup(groupId: string) {
  const name = editingGroupName.value.trim()
  if (name && name !== composeStore.groups.find(g => g.id === groupId)?.name)
    await composeStore.renameGroup(groupId, name)
  editingGroupId.value = null
}

function cancelEditGroup() {
  editingGroupId.value = null
}

function handleGroupNameKeydown(groupId: string, event: KeyboardEvent) {
  event.stopPropagation()
  if (event.key === 'Enter')
    saveEditGroup(groupId)
  else if (event.key === 'Escape')
    cancelEditGroup()
}

async function handleDeleteGroup(groupId: string, event?: MouseEvent) {
  event?.stopPropagation()
  await composeStore.removeGroup(groupId)
}
</script>

<template>
  <div class="flex flex-col flex-1 min-h-0">
    <div class="flex flex-col gap-2 p-4">
      <NButton dashed block @click="handleAdd()">
        {{ $t('compose.newTextButton') }}
      </NButton>
      <NButton dashed block @click="handleAddGroup">
        {{ $t('compose.newGroupButton') }}
      </NButton>
    </div>
    <div class="flex-1 min-h-0 pb-4 overflow-hidden">
      <NScrollbar class="px-4">
        <div class="flex flex-col gap-3 text-sm">
          <template v-if="composeStore.loading">
            <div class="flex flex-col items-center mt-4 text-center text-neutral-300">
              <SvgIcon icon="ri:loader-4-line" class="mb-2 text-3xl animate-spin" />
              <span>{{ $t('common.loading') }}</span>
            </div>
          </template>
          <template v-else-if="!hasContent">
            <div class="flex flex-col items-center mt-4 text-center text-neutral-300">
              <SvgIcon icon="ri:file-text-line" class="mb-2 text-3xl" />
              <span>{{ $t('common.noData') }}</span>
            </div>
          </template>
          <template v-else>
            <section
              v-for="group of composeStore.sortedGroups"
              :key="group.id"
              class="flex flex-col gap-1.5"
            >
              <div
                class="group/header flex items-center gap-1 rounded-md px-1 py-1 hover:bg-neutral-100 dark:hover:bg-[#24272e]"
              >
                <button
                  class="flex shrink-0 items-center p-0.5 text-neutral-400"
                  @click="toggleGroup(group.id)"
                >
                  <SvgIcon
                    :icon="isGroupExpanded(group.id) ? 'ri:arrow-down-s-line' : 'ri:arrow-right-s-line'"
                    class="text-base"
                  />
                </button>
                <div class="flex flex-1 items-center gap-1 min-w-0">
                  <SvgIcon icon="ri:folder-line" class="shrink-0 text-neutral-400" />
                  <NInput
                    v-if="editingGroupId === group.id"
                    v-model:value="editingGroupName"
                    size="tiny"
                    class="flex-1"
                    @click.stop
                    @keydown="handleGroupNameKeydown(group.id, $event)"
                    @blur="saveEditGroup(group.id)"
                  />
                  <span
                    v-else
                    class="flex-1 truncate font-medium cursor-pointer"
                    :title="group.name"
                    @click="toggleGroup(group.id)"
                    @dblclick="startEditGroup(group, $event)"
                  >
                    {{ group.name }}
                  </span>
                  <span
                    v-if="group.isDefault"
                    class="shrink-0 rounded px-1 py-0.5 text-[10px] text-neutral-400 bg-neutral-100 dark:bg-neutral-800"
                  >
                    {{ $t('compose.defaultGroup') }}
                  </span>
                </div>
                <div class="flex shrink-0 items-center opacity-0 transition group-hover/header:opacity-100">
                  <button
                    class="p-1 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
                    :title="$t('compose.renameGroup')"
                    @click="startEditGroup(group, $event)"
                  >
                    <SvgIcon icon="ri:edit-line" />
                  </button>
                  <button
                    class="p-1 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
                    @click="handleAdd(group.id)"
                  >
                    <SvgIcon icon="ri:add-line" />
                  </button>
                  <NPopconfirm
                    v-if="!group.isDefault"
                    placement="bottom"
                    @positive-click="handleDeleteGroup(group.id, $event)"
                  >
                    <template #trigger>
                      <button
                        class="p-1 text-neutral-400 hover:text-red-500"
                        @click.stop
                      >
                        <SvgIcon icon="ri:delete-bin-line" />
                      </button>
                    </template>
                    {{ $t('compose.deleteGroupConfirm') }}
                  </NPopconfirm>
                </div>
              </div>
              <div v-show="isGroupExpanded(group.id)" class="flex flex-col gap-1.5 pl-2">
                <template v-if="!composeStore.articlesByGroup(group.id).length">
                  <div class="px-3 py-2 text-xs text-neutral-400">
                    {{ $t('common.noData') }}
                  </div>
                </template>
                <div
                  v-for="article of composeStore.articlesByGroup(group.id)"
                  :key="article.id"
                >
                  <a
                    class="relative flex items-center gap-3 px-3 py-3 break-all border rounded-md cursor-pointer hover:bg-neutral-100 group dark:border-neutral-800 dark:hover:bg-[#24272e]"
                    :class="isActive(article.id) && ['border-[#4b9e5f]', 'bg-neutral-100', 'text-[#4b9e5f]', 'dark:bg-[#24272e]', 'dark:border-[#4b9e5f]', 'pr-14']"
                    @click="handleSelect(article)"
                  >
                    <span>
                      <SvgIcon icon="ri:file-text-line" />
                    </span>
                    <div class="relative flex-1 overflow-hidden break-all text-ellipsis whitespace-nowrap">
                      <span>{{ article.title }}</span>
                    </div>
                    <div v-if="isActive(article.id)" class="absolute z-10 flex visible right-1">
                      <NPopconfirm placement="bottom" @positive-click="handleDeleteArticle(article.id, $event)">
                        <template #trigger>
                          <button class="p-1" @click.stop>
                            <SvgIcon icon="ri:delete-bin-line" />
                          </button>
                        </template>
                        {{ $t('compose.deleteArticleConfirm') }}
                      </NPopconfirm>
                    </div>
                  </a>
                </div>
              </div>
            </section>
          </template>
        </div>
      </NScrollbar>
    </div>
  </div>
</template>
