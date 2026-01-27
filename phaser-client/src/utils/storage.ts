/**
 * localStorage封装工具
 */

export const storage = {
  /**
   * 保存数据
   */
  set<T>(key: string, value: T): void {
    try {
      const serialized = JSON.stringify(value);
      localStorage.setItem(key, serialized);
    } catch (error) {
      console.error(`Failed to save to localStorage: ${key}`, error);
    }
  },

  /**
   * 获取数据
   */
  get<T>(key: string, defaultValue?: T): T | null {
    try {
      const item = localStorage.getItem(key);
      if (item === null) {
        return defaultValue ?? null;
      }
      return JSON.parse(item) as T;
    } catch (error) {
      console.error(`Failed to read from localStorage: ${key}`, error);
      return defaultValue ?? null;
    }
  },

  /**
   * 删除数据
   */
  remove(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error(`Failed to remove from localStorage: ${key}`, error);
    }
  },

  /**
   * 清空所有数据
   */
  clear(): void {
    try {
      localStorage.clear();
    } catch (error) {
      console.error('Failed to clear localStorage', error);
    }
  },

  /**
   * 检查key是否存在
   */
  has(key: string): boolean {
    return localStorage.getItem(key) !== null;
  }
};
