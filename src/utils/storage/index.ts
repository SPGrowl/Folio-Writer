interface StorageData<T = any> {
  data: T
  // 时间戳或者null
  expire: number | null
}

export function createLocalStorage(options?: { expire?: number | null }) {
  // 
  const DEFAULT_CACHE_TIME = 60 * 60 * 24 * 7

  const { expire } = Object.assign({ expire: DEFAULT_CACHE_TIME }, options)

  // 根据传入的键名和数据，将数据存储到本地存储中
  function set<T = any>(key: string, data: T) {
  //  给数据打上时间戳
    const storageData: StorageData<T> = {
      data,
      // 过期时间
      expire: expire !== null ? new Date().getTime() + expire * 1000 : null,
    }
    const json = JSON.stringify(storageData)
    // 将包装好的键值对存入本地储存
    window.localStorage.setItem(key, json)
  }

  function get(key: string) {
    const json = window.localStorage.getItem(key)
    if (json) {
      // 若json不为空，则将json转换为StorageData类型
      let storageData: StorageData | null = null

      try {
        storageData = JSON.parse(json)
      }
      catch {
        // Prevent failure
      }

      if (storageData) {

        const { data, expire } = storageData
        if (expire === null || expire >= Date.now())
          return data
      }

      remove(key)
      return null
    }
  }

  function remove(key: string) {
    window.localStorage.removeItem(key)
  }

  function clear() {
    window.localStorage.clear()
  }

  return { set, get, remove, clear }
}

export const ls = createLocalStorage()

export const ss = createLocalStorage({ expire: null })
