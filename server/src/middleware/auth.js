"use strict";

const jwt = require("jsonwebtoken");
const { JWT_SECRET } = require("../config");

/**
 * JWT 认证中间件
 * 验证请求头中的 Authorization token
 */
function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: "未提供认证令牌" });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: "无效或过期的令牌" });
    }
    req.user = user;
    next();
  });
}

module.exports = { authenticateToken };
