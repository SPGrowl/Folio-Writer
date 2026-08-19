<script setup lang='ts'>
import { computed, h, onMounted, ref } from 'vue'
import { NButton, NDropdown, NInput, NPopconfirm, NScrollbar, useDialog, type DropdownOption } from 'naive-ui'
import { SvgIcon } from '@/components/common'
import { useAppStore, useComposeStore, useComposeTabStore } from '@/store'
import { useBasicLayout } from '@/hooks/useBasicLayout'
import { t } from '@/locales'

const appStore = useAppStore()
const composeStore = useComposeStore()
const tabStore = useComposeTabStore()
const { isMobile } = useBasicLayout()
const dialog = useDialog()

const editingGroupId = ref<string | null>(null)
const editingGroupName = ref('')
const editingArticleId = ref<number | null>(null)
const editingArticleTitle = ref('')
const collapsedGroups = ref<Set<string>>(new Set())

const articleMenuOptions = computed<DropdownOption[]>(() => [
  {
    label: t('compose.renameArticle'),
    key: 'rename',
  },
  {
    label: `${t('compose.moveArticle')}（${t('compose.comingSoon')}）`,
    key: 'move',
    disabled: true,
  },
  {
    label: `${t('compose.articleHistory')}（${t('compose.comingSoon')}）`,
    key: 'history',
    disabled: true,
  },
  {
    type: 'divider',
    key: 'divider',
  },
  {
    label: () => h('span', { class: 'text-red-500' }, t('common.delete')),
    key: 'delete',
  },
])

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

function isTabOpen(id: number) {
  return tabStore.isTabOpen(id)
}

function isCurrentTab(id: number) {
  return tabStore.activeArticleId === id
}

function hasChanges(id: number) {
  return tabStore.hasPendingChanges(id)
}

function articleClass(article: Compose.Article) {
  const current = isCurrentTab(article.id)
  const open = isTabOpen(article.id)
  const pending = hasChanges(article.id)
  const editing = editingArticleId.value === article.id

  if (pending) {
    return [
      current && ['border-red-400', 'bg-red-50', 'text-red-600', 'dark:bg-red-950/20', 'dark:border-red-500/70', 'dark:text-red-400', 'pr-10'],
      open && !current && ['border-red-300/60', 'bg-red-50/50', 'text-red-500', 'dark:bg-red-950/10', 'dark:border-red-500/30', 'dark:text-red-400', 'pr-10'],
      !open && !current && ['border-red-200', 'text-red-500', 'dark:border-red-500/25', 'dark:text-red-400'],
      editing && 'pr-10',
    ]
  }

  return [
    current && ['border-[#4b9e5f]', 'bg-neutral-100', 'text-[#4b9e5f]', 'dark:bg-[#24272e]', 'dark:border-[#4b9e5f]', 'pr-10'],
    open && !current && ['border-[#4b9e5f]/25', 'bg-neutral-50', 'text-neutral-500', 'dark:bg-[#1c1c20]', 'dark:border-[#4b9e5f]/20', 'dark:text-neutral-400', 'pr-10'],
    editing && 'pr-10',
  ]
}

function handleSelect(article: Compose.Article) {
  if (editingArticleId.value === article.id)
    return
  tabStore.openTab(article.id)
  if (isMobile.value)
    appStore.setSiderCollapsed(true)
}

function getArticleTitle(article: Compose.Article) {
  const tab = tabStore.findTab(article.id)
  return tab?.title ?? article.title
}

function startEditArticle(article: Compose.Article) {
  editingArticleId.value = article.id
  editingArticleTitle.value = getArticleTitle(article)
}

async function saveEditArticle(articleId: number) {
  const title = editingArticleTitle.value.trim()
  const current = getArticleTitle(composeStore.findArticle(articleId)!)
  if (title && title !== current)
    await composeStore.renameArticle(articleId, title)
  editingArticleId.value = null
}

function cancelEditArticle() {
  editingArticleId.value = null
}

function handleArticleTitleKeydown(articleId: number, event: KeyboardEvent) {
  event.stopPropagation()
  if (event.key === 'Enter')
    saveEditArticle(articleId)
  else if (event.key === 'Escape')
    cancelEditArticle()
}

function handleArticleMenuSelect(article: Compose.Article, key: string) {
  if (key === 'rename') {
    startEditArticle(article)
    return
  }
  if (key === 'delete') {
    dialog.warning({
      title: t('common.delete'),
      content: t('compose.deleteArticleConfirm'),
      positiveText: t('common.confirm'),
      negativeText: t('bubble.cancel'),
      onPositiveClick: () => composeStore.removeArticle(article.id),
    })
  }
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
                    class="group/article relative flex items-center gap-3 px-3 py-3 break-all border rounded-md cursor-pointer hover:bg-neutral-100 dark:border-neutral-800 dark:hover:bg-[#24272e] group-hover/article:pr-10"
                    :class="articleClass(article)"
                    @click="handleSelect(article)"
                  >
                    <span>
                      <SvgIcon icon="ri:file-text-line" />
                    </span>
                    <div class="relative flex-1 overflow-hidden break-all text-ellipsis whitespace-nowrap">
                      <NInput
                        v-if="editingArticleId === article.id"
                        v-model:value="editingArticleTitle"
                        size="tiny"
                        @click.stop
                        @keydown="handleArticleTitleKeydown(article.id, $event)"
                        @blur="saveEditArticle(article.id)"
                      />
                      <span v-else class="flex items-center gap-2">
                        <span class="truncate">{{ getArticleTitle(article) }}</span>
                        <span
                          v-if="hasChanges(article.id)"
                          class="h-1.5 w-1.5 shrink-0 rounded-full bg-red-500"
                        />
                      </span>
                    </div>
                    <div
                      class="absolute z-10 flex right-1 transition"
                      :class="editingArticleId === article.id ? 'visible opacity-100' : 'opacity-0 group-hover/article:opacity-100'"
                      @click.stop
                    >
                      <NDropdown
                        trigger="click"
                        placement="bottom-end"
                        :options="articleMenuOptions"
                        @select="handleArticleMenuSelect(article, $event as string)"
                      >
                        <button
                          class="p-1 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
                          :title="$t('common.action')"
                        >
                          <SvgIcon icon="ri:more-2-fill" />
                        </button>
                      </NDropdown>
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
