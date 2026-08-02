declare namespace Compose {
  type SyncState = 'saved' | 'dirty' | 'loading' | 'failed'

  interface History {
    id: string
    message: string
    insertTime: string
    content: string
  }

  /** 纯数据源：来自 API / 持久化层 */
  interface Article {
    id: number
    title: string
    content: string
    linkedGroup: string
    createdAt: string
    updatedAt: string
    history: History[]
  }

  interface ArticleGroup {
    id: string
    name: string
    articleIds: number[]
    isDefault: boolean
    createdAt: string
    updatedAt: string
  }

  interface ComposeState {
    articles: Article[]
    groups: ArticleGroup[]
    loading: boolean
  }

  /** LLM 工具调用返回的变更，用于副编辑器 diff 对比 */
  interface TabChanges {
    diff: unknown
    content: string
  }

  /** 页签视图层：draft / 同步状态 / LLM 变更 */
  interface Tab {
    linkedID: number
    title: string
    draft: string
    syncState: SyncState
    syncError: string | null
    changes?: TabChanges
  }

  interface TabState {
    tabs: Record<number, Tab>
    openTabs: number[]
    activeArticleId: number | null
  }
}
