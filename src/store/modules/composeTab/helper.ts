import { ss } from '@/utils/storage'

const LOCAL_NAME = 'composeTabStorage'
const LEGACY_LOCAL_NAME = 'composeStorage'

export function defaultTabState(): Compose.TabState {
  return {
    tabs: {},
    openTabs: [],
    activeArticleId: null,
    articleChanges: {},
  }
}

interface LocalTabState {
  openTabs?: number[]
  /** @deprecated legacy key */
  openArticle?: number[]
  activeArticleId?: number | null
  articleChanges?: Record<number, Compose.ArticleChange>
  /** @deprecated 迁移至 articleChanges */
  pendingChanges?: Record<number, Compose.ArticleChange>
}

function normalizeArticleChanges(local: LocalTabState | null): Record<number, Compose.ArticleChange> {
  if (!local)
    return {}

  return {
    ...(local.pendingChanges ?? {}),
    ...(local.articleChanges ?? {}),
  }
}

export function getLocalTabState(): Pick<Compose.TabState, 'openTabs' | 'activeArticleId' | 'articleChanges'> {
  const local = ss.get(LOCAL_NAME) as LocalTabState | null
  if (local) {
    return {
      openTabs: local.openTabs ?? [],
      activeArticleId: local.activeArticleId ?? null,
      articleChanges: normalizeArticleChanges(local),
    }
  }

  const legacy = ss.get(LEGACY_LOCAL_NAME) as LocalTabState | null
  if (legacy) {
    return {
      openTabs: legacy.openArticle ?? legacy.openTabs ?? [],
      activeArticleId: legacy.activeArticleId ?? null,
      articleChanges: {},
    }
  }

  return { openTabs: [], activeArticleId: null, articleChanges: {} }
}

export function setLocalTabUi(state: Pick<Compose.TabState, 'openTabs' | 'activeArticleId' | 'articleChanges'>) {
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

/** bootstrap 后重建 tabs：已打开页签保留本地 draft 状态 */
export function mergeTabOnBootstrap(
  article: Compose.Article,
  openIds: number[],
  preserved: Map<number, Compose.Tab>,
): Compose.Tab | null {
  if (!openIds.includes(article.id))
    return null

  const kept = preserved.get(article.id)
  return kept
    ? { ...kept, title: article.title }
    : createTabFromArticle(article)
}

/** 从旧版 tab.changes 迁移进 articleChanges（内存/session 一次性） */
export function migrateLegacyTabChanges(
  preserved: Map<number, Compose.Tab>,
  articleChanges: Record<number, Compose.ArticleChange>,
): Record<number, Compose.ArticleChange> {
  const next = { ...articleChanges }
  for (const [id, tab] of preserved) {
    const legacy = (tab as Compose.Tab & { changes?: Compose.ArticleChange }).changes
    if (legacy?.content && !next[id])
      next[id] = { ...legacy }
  }
  return next
}
