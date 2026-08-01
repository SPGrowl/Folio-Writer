import { ss } from '@/utils/storage'

const LOCAL_NAME = 'composeStorage'

export function defaultState(): Compose.ComposeState {
  return {
    articles: [],
    groups: [],
    activeArticleId: null,
    openArticle: [],
    loading: false,
  }
}

export function getLocalState(): Pick<Compose.ComposeState, 'activeArticleId' | 'openArticle'> {
  const local = ss.get(LOCAL_NAME)
  return {
    activeArticleId: local?.activeArticleId ?? null,
    openArticle: local?.openArticle ?? [],
  }
}

export function setLocalComposeUi(state: Pick<Compose.ComposeState, 'activeArticleId' | 'openArticle'>) {
  ss.set(LOCAL_NAME, state)
}

/** API 文章 → store（不含 draft / sync 字段） */
export function articleFromApi(
  data: Omit<Compose.Article, 'draft' | 'syncState' | 'syncError'>,
): Compose.Article {
  return { ...data }
}

/** 首次加入页签：content → draft */
export function attachDraft(article: Compose.Article): Compose.Article {
  return {
    ...article,
    draft: article.content,
    syncState: 'saved',
    syncError: null,
  }
}

/** 关闭页签：移除 draft / sync 字段 */
export function detachDraft(article: Compose.Article): Compose.Article {
  const { draft: _d, syncState: _s, syncError: _e, ...rest } = article
  return rest
}

export function isTabOpen(state: Compose.ComposeState, id: number) {
  return state.openArticle.includes(id)
}

export function findArticleById(state: Compose.ComposeState, id: number) {
  return state.articles.find(article => article.id === id)
}

interface PreservedTabState {
  draft: string
  syncState: Compose.SyncState
  syncError: string | null
}

/** bootstrap 合并：已打开页签保留本地 draft，否则从 content 初始化 */
export function mergeArticleOnBootstrap(
  apiArticle: Compose.Article,
  openIds: number[],
  preserved: Map<number, PreservedTabState>,
): Compose.Article {
  if (!openIds.includes(apiArticle.id))
    return apiArticle

  const kept = preserved.get(apiArticle.id)
  if (kept) {
    return {
      ...apiArticle,
      draft: kept.draft,
      syncState: kept.syncState,
      syncError: kept.syncError,
    }
  }

  return attachDraft(apiArticle)
}

export function collectPreservedTabState(
  state: Compose.ComposeState,
): Map<number, PreservedTabState> {
  const map = new Map<number, PreservedTabState>()
  for (const id of state.openArticle) {
    const article = findArticleById(state, id)
    if (article?.draft !== undefined && article.syncState !== undefined) {
      map.set(id, {
        draft: article.draft,
        syncState: article.syncState,
        syncError: article.syncError ?? null,
      })
    }
  }
  return map
}
