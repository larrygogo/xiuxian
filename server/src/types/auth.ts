// JWT 载荷结构
export interface AuthTokenPayload {
  userId: number;
  username: string;
  isAdmin: boolean;
}
