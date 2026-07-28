declare namespace Compose {
	interface History {
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
		loading: boolean
		saving: boolean
	  }
}