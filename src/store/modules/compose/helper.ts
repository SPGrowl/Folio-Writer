export function defaultState(): Compose.ComposeState {
  return {
    articles: [],
    groups: [],
    loading: false,
  }
}

/** API 文章 → store */
export function articleFromApi(data: Compose.Article): Compose.Article {
  return { ...data }
}

export function findArticleById(state: Compose.ComposeState, id: number) {
  return state.articles.find(article => article.id === id)
}
