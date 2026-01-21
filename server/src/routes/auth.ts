import express, { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { JWT_EXPIRES_IN, JWT_SECRET } from "../config";
import { createUser, verifyUser } from "../services/userService";

const router = express.Router();

/**
 * 用户注册
 * POST /api/auth/register
 */
router.post("/register", async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body as { username?: string; password?: string };

    // 参数校验：避免空值或异常长度
    if (!username || !password) {
      return res.status(400).json({ error: "用户名和密码不能为空" });
    }

    if (username.length < 3 || username.length > 20) {
      return res.status(400).json({ error: "用户名长度必须在3-20个字符之间" });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: "密码长度至少为6个字符" });
    }

    const user = await createUser(username, password);
    const token = jwt.sign({ userId: user.id, username: user.username }, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN
    });

    res.json({
      message: "注册成功",
      token,
      user: { id: user.id, username: user.username }
    });
  } catch (error) {
    if (error instanceof Error && error.message === "用户名已存在") {
      return res.status(409).json({ error: error.message });
    }
    console.error("注册错误:", error);
    res.status(500).json({ error: "注册失败" });
  }
});

/**
 * 用户登录
 * POST /api/auth/login
 */
router.post("/login", async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body as { username?: string; password?: string };

    if (!username || !password) {
      return res.status(400).json({ error: "用户名和密码不能为空" });
    }

    const user = await verifyUser(username, password);
    if (!user) {
      return res.status(401).json({ error: "用户名或密码错误" });
    }

    const token = jwt.sign({ userId: user.id, username: user.username }, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN
    });

    res.json({
      message: "登录成功",
      token,
      user: { id: user.id, username: user.username }
    });
  } catch (error) {
    console.error("登录错误:", error);
    res.status(500).json({ error: "登录失败" });
  }
});

export default router;
