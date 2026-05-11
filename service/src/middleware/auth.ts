import { isNotEmptyString } from '../utils/is'

const auth = async (req, res, next) => {
  const AUTH_SECRET_KEY = process.env.AUTH_SECRET_KEY
  if (isNotEmptyString(AUTH_SECRET_KEY)) {
    try {
      // 获取请求头中的Authorization字段
      const Authorization = req.header('Authorization')
      // 如果Authorization字段不存在或Authorization字段去除Bearer前缀后的值不等于AUTH_SECRET_KEY的值，则抛出错误
      if (!Authorization || Authorization.replace('Bearer ', '').trim() !== AUTH_SECRET_KEY.trim())
        throw new Error('Error: 无访问权限 | No access rights')
      next()
    }
    catch (error) {
      // 处理未授权错误
      res.send({ status: 'Unauthorized', message: error.message ?? 'Please authenticate.', data: null })
    }
  }
  else {
    next()
  }
}

export { auth }
