import { useAgentStore, useComposeStore, useComposeTabStore } from '@/store'

/** 发送前将当前活跃页签快照写入 session.documentContext */
export function syncDocumentContextFromActiveTab() {
  const store = useAgentStore()
  const tabStore = useComposeTabStore()
  const composeStore = useComposeStore()
  const tab = tabStore.activeTab

  if (!tab) {
    store.setDocumentContext(null)
    return
  }

  const article = composeStore.findArticle(tab.linkedID)
  if (!article) {
    store.setDocumentContext(null)
    return
  }

  const group = composeStore.groups.find(item => item.id === article.linkedGroup)

  store.setDocumentContext({
    articleId: tab.linkedID,
    title: tab.title || article.title,
    content: tab.draft ?? article.content,
    groupId: article.linkedGroup,
    groupName: group?.name ?? '',
    capturedAt: new Date().toISOString(),
  })
}
