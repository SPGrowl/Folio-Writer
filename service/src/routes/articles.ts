import type { Router } from 'express'
import {
  createArticleGroup,
  listArticleGroups,
} from '../db/articleGroups'
import {
  createArticle,
  createArticleHistory,
  deleteArticle,
  deleteArticleHistory,
  listArticleHistory,
  listArticles,
  updateArticle,
} from '../db/articles'

/**
 * 注册文章与文章组 CRUD 路由。
 *
 * 文章：
 *   GET    /articles                        查：全部文章（含 history）
 *   POST   /articles                        增：{ linkedGroupId, content, id?, title? }
 *   PUT    /articles/:id                    改：{ title?, content }，不写 history
 *   DELETE /articles/:id                    删：删文章并级联清空 history
 *
 * 版本历史（类似 git）：
 *   GET    /articles/:id/history            查：本文章全部版本
 *   POST   /articles/:id/history            增：{ content, message } 提交版本
 *   DELETE /articles/:id/history/:versionId 删：删除单条版本
 *
 * 文章组：
 *   GET    /article-groups                  查：文章组列表
 *   POST   /article-groups                  增：{ name }
 */
export function registerArticleRoutes(router: Router) {
  router.get('/articles', async (_req, res) => {
    try {
      const articles = await listArticles()
      res.send({ status: 'Success', message: '', data: articles })
    }
    catch (error: any) {
      res.status(500).send({ status: 'Fail', message: error.message, data: null })
    }
  })

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

      res.send({ status: 'Success', message: '', data: article })
    }
    catch (error: any) {
      res.status(400).send({ status: 'Fail', message: error.message, data: null })
    }
  })

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
        res.status(404).send({ status: 'Fail', message: '文章不存在', data: null })
        return
      }

      res.send({ status: 'Success', message: '', data: article })
    }
    catch (error: any) {
      res.status(400).send({ status: 'Fail', message: error.message, data: null })
    }
  })

  router.delete('/articles/:id', async (req, res) => {
    try {
      const id = Number(req.params.id)
      if (Number.isNaN(id))
        throw new Error('路径参数 id 须为数字')

      const deleted = await deleteArticle(id)

      if (!deleted) {
        res.status(404).send({ status: 'Fail', message: '文章不存在', data: null })
        return
      }

      res.send({ status: 'Success', message: '', data: null })
    }
    catch (error: any) {
      res.status(400).send({ status: 'Fail', message: error.message, data: null })
    }
  })

  /** 查：拉取本文章的全部版本历史 */
  router.get('/articles/:id/history', async (req, res) => {
    try {
      const articleId = Number(req.params.id)
      if (Number.isNaN(articleId))
        throw new Error('路径参数 id 须为数字')

      const versions = await listArticleHistory(articleId)

      if (versions === null) {
        res.status(404).send({ status: 'Fail', message: '文章不存在', data: null })
        return
      }

      res.send({ status: 'Success', message: '', data: versions })
    }
    catch (error: any) {
      res.status(400).send({ status: 'Fail', message: error.message, data: null })
    }
  })

  /** 增：提交一条版本（content + message，类似 git commit -m） */
  router.post('/articles/:id/history', async (req, res) => {
    try {
      const articleId = Number(req.params.id)
      if (Number.isNaN(articleId))
        throw new Error('路径参数 id 须为数字')

      const { content, message } = req.body ?? {}

      if (typeof content !== 'string')
        throw new Error('content 必填且须为字符串')

      if (typeof message !== 'string')
        throw new Error('message 必填且须为字符串（类似 git -m）')

      const result = await createArticleHistory({
        articleId,
        content,
        message: message.trim(),
      })

      if (!result) {
        res.status(404).send({ status: 'Fail', message: '文章不存在', data: null })
        return
      }

      res.send({ status: 'Success', message: '', data: result })
    }
    catch (error: any) {
      res.status(400).send({ status: 'Fail', message: error.message, data: null })
    }
  })

  /** 删：根据文章 ID + 版本 ID 删除单条历史 */
  router.delete('/articles/:id/history/:versionId', async (req, res) => {
    try {
      const articleId = Number(req.params.id)
      if (Number.isNaN(articleId))
        throw new Error('路径参数 id 须为数字')

      const versionId = req.params.versionId?.trim()
      if (!versionId)
        throw new Error('versionId 必填')

      const result = await deleteArticleHistory(articleId, versionId)

      if (!result) {
        res.status(404).send({
          status: 'Fail',
          message: '文章或版本不存在',
          data: null,
        })
        return
      }

      res.send({ status: 'Success', message: '', data: result })
    }
    catch (error: any) {
      res.status(400).send({ status: 'Fail', message: error.message, data: null })
    }
  })

  router.get('/article-groups', async (_req, res) => {
    try {
      const groups = await listArticleGroups()
      res.send({ status: 'Success', message: '', data: groups })
    }
    catch (error: any) {
      res.status(500).send({ status: 'Fail', message: error.message, data: null })
    }
  })

  router.post('/article-groups', async (req, res) => {
    try {
      const { name } = req.body ?? {}

      if (typeof name !== 'string' || !name.trim())
        throw new Error('name 必填且须为非空字符串')

      const group = await createArticleGroup({ name: name.trim() })

      res.send({ status: 'Success', message: '', data: group })
    }
    catch (error: any) {
      res.status(400).send({ status: 'Fail', message: error.message, data: null })
    }
  })
}
