import { ss } from '@/utils/storage'

const LOCAL_NAME = 'composeTabStorage'
const LEGACY_LOCAL_NAME = 'composeStorage'

export function defaultTabState(): Compose.TabState {
  return {
    tabs: {},
    openTabs: [],
    activeArticleId: null,
  }
}

export function getLocalTabState(): Pick<Compose.TabState, 'openTabs' | 'activeArticleId'> {
  const local = ss.get(LOCAL_NAME)
  if (local)
    return { openTabs: local.openTabs ?? [], activeArticleId: local.activeArticleId ?? null }

  const legacy = ss.get(LEGACY_LOCAL_NAME)
  if (legacy) {
    return {
      openTabs: legacy.openArticle ?? legacy.openTabs ?? [],
      activeArticleId: legacy.activeArticleId ?? null,
    }
  }

  return { openTabs: [], activeArticleId: null }
}

export function setLocalTabUi(state: Pick<Compose.TabState, 'openTabs' | 'activeArticleId'>) {
  ss.set(LOCAL_NAME, state)
}

export function createTabFromArticle(article: Compose.Article): Compose.Tab {
  return {
    linkedID: article.id,
    title: article.title,
    draft: article.content,
    syncState: 'saved',
    syncError: null,
  }
}

export function findTabById(state: Compose.TabState, id: number): Compose.Tab | undefined {
  return state.tabs[id]
}

export function collectPreservedTabs(state: Compose.TabState): Map<number, Compose.Tab> {
  const map = new Map<number, Compose.Tab>()
  for (const id of state.openTabs) {
    const tab = state.tabs[id]
    if (tab)
      map.set(id, { ...tab })
  }
  return map
}

/** bootstrap 后重建 tabs：已打开页签保留本地状态，否则从 Article 初始化 */
export function mergeTabOnBootstrap(
  article: Compose.Article,
  openIds: number[],
  preserved: Map<number, Compose.Tab>,
): Compose.Tab | null {
  if (!openIds.includes(article.id))
    return null

  const kept = preserved.get(article.id)
  if (kept) {
    return {
      ...kept,
      title: article.title,
    }
  }

  return createTabFromArticle(article)
}
