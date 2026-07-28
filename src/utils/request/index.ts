import type { AxiosRequestConfig, GenericAbortSignal } from 'axios'
import service from './axios'
import type { ApiResponse } from './axios'

/** 除 url/method/params/data 外的 axios 配置 */
type RequestConfig = Omit<
  AxiosRequestConfig,
  'url' | 'method' | 'params' | 'data'
> & {
  signal?: GenericAbortSignal
}

export type { ApiResponse }
export { ApiError } from './axios'

export function get<T>(
  url: string,
  params?: Record<string, unknown>,
  config?: RequestConfig,
): Promise<ApiResponse<T>> {
  return service.get<unknown, ApiResponse<T>>(url, { params, ...config })
}

export function post<T>(
  url: string,
  data?: unknown,
  config?: RequestConfig,
): Promise<ApiResponse<T>> {
  return service.post<unknown, ApiResponse<T>>(url, data, config)
}

export function put<T>(
  url: string,
  data?: unknown,
  config?: RequestConfig,
): Promise<ApiResponse<T>> {
  return service.put<unknown, ApiResponse<T>>(url, data, config)
}

export function del<T>(
  url: string,
  config?: RequestConfig,
): Promise<ApiResponse<T>> {
  return service.delete<unknown, ApiResponse<T>>(url, config)
}