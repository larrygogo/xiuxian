import jwt from "jsonwebtoken";
import type { Request, Response, NextFunction } from "express";
import { JWT_SECRET } from "../config";
import type { AuthTokenPayload } from "../types/auth";

/**
 * JWT 认证中间件
 * 验证请求头中的 Authorization token
 */
export function authenticateToken(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1]; // Bearer TOKEN

  if (!token) {
    res.status(401).json({ error: "未提供认证令牌" });
    return;
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      res.status(403).json({ error: "无效或过期的令牌" });
      return;
    }

    // 保存用户信息到请求对象，供后续路由读取
    req.user = decoded as AuthTokenPayload;
    next();
  });
}
