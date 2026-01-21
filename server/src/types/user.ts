// 用户最小信息（用于鉴权与响应）
export interface User {
  id: number;
  username: string;
  isAdmin: boolean;
}
