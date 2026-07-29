import { ss } from '@/utils/storage'

const LOCAL_NAME = 'composeStorage'

export function defaultState(): Compose.ComposeState {
  return {
    articles: [],
    groups: [],
    activeArticleId: null,
    loading: false,
    syncState: 'saved',
    syncError: null,
  }
}

// TODO:语义不一致
export function getLocalState(): Pick<Compose.ComposeState, 'activeArticleId'> {
  return ss.get(LOCAL_NAME) ?? { activeArticleId: null }
}

export function setLocalActiveId(activeArticleId: number | null) {
  ss.set(LOCAL_NAME, { activeArticleId })
}
