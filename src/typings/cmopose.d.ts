declare namespace Compose {
	interface history{
     insertTime:string
     content:string
	}
	interface Article {
		id: number
		title: string
		content: string
		createdAt: string
		updatedAt: string
        history:history[]
	}
    interface ArticleState
    {
        articles:Article[]
        activeArticle:number
    }
}