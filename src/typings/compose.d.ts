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

  /** Agent 待审改动（按 articleId 单槽存储，与页签开闭无关） */
  interface ArticleChange {
    content: string
    /** 推送该 changes 的 Agent tool step index */
    sourceToolStepIndex?: number
    /** 推送时所在的 Agent session id */
    sourceSessionId?: number
  }

  /** 页签视图层：draft / 同步状态 */
  interface Tab {
    linkedID: number
    title: string
    draft: string
    syncState: SyncState
    syncError: string | null
  }

  interface TabState {
    tabs: Record<number, Tab>
    openTabs: number[]
    activeArticleId: number | null
    /** 全局待审改动：articleId → 单槽变更 */
    articleChanges: Record<number, ArticleChange>
  }
}
