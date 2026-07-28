import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios'
import { getToken, removeToken } from '@/store/modules/auth/helper'

/** 与后端 res.send({ status, message, data }) 对齐 */
export interface ApiResponse<T = unknown> {
  status: 'Success' | 'Fail' | 'Unauthorized'
  message: string | null
  data: T
}

export class ApiError extends Error {
  status: ApiResponse['status']
  constructor(status: ApiResponse['status'], message: string) {
    super(message)
    this.status = status
  }
}

const service = axios.create({
  baseURL: import.meta.env.VITE_GLOB_API_URL,
  timeout: 60_000,
})

/** 请求拦截：挂 Bearer Token（直接用 helper，避免 store → api → axios 循环依赖） */
service.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = getToken()
  if (token)
    config.headers.Authorization = `Bearer ${token}`
  return config
})

function isApiResponse(body: unknown): body is ApiResponse {
  return !!body
    && typeof body === 'object'
    && 'status' in body
    && typeof (body as ApiResponse).status === 'string'
}

/** 解析业务信封（HTTP 2xx 时） */
function resolveEnvelope<T>(body: unknown): ApiResponse<T> {
  if (!isApiResponse(body))
    throw new ApiError('Fail', 'Invalid response format')

  if (body.status === 'Success')
    return body as ApiResponse<T>

  if (body.status === 'Unauthorized') {
    removeToken()
    window.location.reload()
    throw new ApiError('Unauthorized', body.message ?? 'Unauthorized')
  }

  throw new ApiError('Fail', body.message ?? 'Request failed')
}

/** 响应拦截：统一解析 Success / Fail / Unauthorized */
service.interceptors.response.use(
  (response) => resolveEnvelope(response.data as ApiResponse),
  (error: AxiosError<ApiResponse>) => {
    const body = error.response?.data
    if (isApiResponse(body))
      return Promise.reject(resolveEnvelope(body))

    const message = error.message || 'Network error'
    return Promise.reject(new ApiError('Fail', message))
  },
)

export default service