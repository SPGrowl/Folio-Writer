import type { Router } from 'express'
import {
  createArticleGroup,
  listArticleGroups,
} from '../db/articleGroups'
import {
  createArticle,
  deleteArticle,
  listArticles,
  updateArticle,
} from '../db/articles'

/**
 * 注册文章与文章组 CRUD 路由。
 *
 * 接口一览：
 *   GET    /articles              查：整表列表（含 history）
 *   POST   /articles              增：{ linkedGroupId, content, id?, title? }
 *   PUT    /articles/:id          改：{ title?, content }
 *   DELETE /articles/:id          删：删文章并级联清空历史
 *   GET    /article-groups        查：文章组列表
 *   POST   /article-groups        增：{ name }，后端生成唯一组 ID
 */
export function registerArticleRoutes(router: Router) {
  /** 查：拉取整个文章列表 */
  router.get('/articles', async (_req, res) => {
    try {
      const articles = await listArticles()
      res.send({
        status: 'Success',
        message: '',
        data: articles,
      })
    }
    catch (error: any) {
      res.status(500).send({
        status: 'Fail',
        message: error.message,
        data: null,
      })
    }
  })

  /** 增：根据文章内容及所属组 ID 新增文章，初始正文写入历史 */
  router.post('/articles', async (req, res) => {
    try {
      const { id, title, content, linkedGroupId } = req.body ?? {}

      if (typeof content !== 'string')
        throw new Error('content 必填且须为字符串')

      if (typeof linkedGroupId !== 'string' || !linkedGroupId.trim())
        throw new Error('linkedGroupId 必填且须为非空字符串')

      if (id != null && Number.isNaN(Number(id)))
        throw new Error('id 须为数字')

      const article = await createArticle({
        id: id != null ? Number(id) : undefined,
        title: typeof title === 'string' ? title : undefined,
        content,
        linkedGroupId: linkedGroupId.trim(),
      })

      res.send({
        status: 'Success',
        message: '',
        data: article,
      })
    }
    catch (error: any) {
      res.status(400).send({
        status: 'Fail',
        message: error.message,
        data: null,
      })
    }
  })

  /** 改：根据文章 id 更新内容，并将更新后的全量正文写入历史 */
  router.put('/articles/:id', async (req, res) => {
    try {
      const id = Number(req.params.id)
      if (Number.isNaN(id))
        throw new Error('路径参数 id 须为数字')


      const { title, content } = req.body ?? {}

      if (typeof content !== 'string')
        throw new Error('content 必填且须为字符串')

      const article = await updateArticle({
        id,
        title: typeof title === 'string' ? title : undefined,
        content,
      })

      if (!article) {
        res.status(404).send({
          status: 'Fail',
          message: '文章不存在',
          data: null,
        })
        return
      }

      res.send({
        status: 'Success',
        message: '',
        data: article,
      })
    }
    catch (error: any) {
      res.status(400).send({
        status: 'Fail',
        message: error.message,
        data: null,
      })
    }
  })

  /** 删：根据文章 id 删除，历史表由外键 CASCADE 自动清空 */
  router.delete('/articles/:id', async (req, res) => {
    try {
      const id = Number(req.params.id)
      if (Number.isNaN(id))
        throw new Error('路径参数 id 须为数字')

      const deleted = await deleteArticle(id)

      if (!deleted) {
        res.status(404).send({
          status: 'Fail',
          message: '文章不存在',
          data: null,
        })
        return
      }

      res.send({
        status: 'Success',
        message: '',
        data: null,
      })
    }
    catch (error: any) {
      res.status(400).send({
        status: 'Fail',
        message: error.message,
        data: null,
      })
    }
  })

  /** 查：拉取全部文章组 */
  router.get('/article-groups', async (_req, res) => {
    try {
      const groups = await listArticleGroups()
      res.send({
        status: 'Success',
        message: '',
        data: groups,
      })
    }
    catch (error: any) {
      res.status(500).send({
        status: 'Fail',
        message: error.message,
        data: null,
      })
    }
  })

  /** 增：新建文章组，后端生成唯一 ID */
  router.post('/article-groups', async (req, res) => {
    try {
      const { name } = req.body ?? {}

      if (typeof name !== 'string' || !name.trim())
        throw new Error('name 必填且须为非空字符串')

      const group = await createArticleGroup({ name: name.trim() })

      res.send({
        status: 'Success',
        message: '',
        data: group,
      })
    }
    catch (error: any) {
      res.status(400).send({
        status: 'Fail',
        message: error.message,
        data: null,
      })
    }
  })
}
