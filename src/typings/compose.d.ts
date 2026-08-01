declare namespace Compose {
  type SyncState = 'saved' | 'dirty' | 'loading' | 'failed'

  interface History {
    id: string
    message: string
    insertTime: string
    content: string
  }

  interface Article {
    id: number
    title: string
    content: string
    linkedGroup: string
    createdAt: string
    updatedAt: string
    history: History[]
    /** 仅 openArticle 中的文章存在 */
    draft?: string
    syncState?: SyncState
    syncError?: string | null
  }

  interface ArticleGroup {
    id: string
    name: string
    articleIds: number[]
    createdAt: string
    updatedAt: string
  }

  interface ComposeState {
    articles: Article[]
    groups: ArticleGroup[]
    activeArticleId: number | null
    openArticle: number[]
    loading: boolean
  }
  interface Tab{
    linkedID:number,
    title:string,
    changes?:
    {
      diff:any,
      content:string,
    }
    syncState:SyncState,
    draft:string,
    syncError:string | null,
  }
  interface TabState{
    openTabs:number[],
    activeArticleId:number,
  }
}
