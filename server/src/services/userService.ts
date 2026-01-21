import bcrypt from "bcryptjs";
import { getDatabase, saveDatabase } from "../db/init";
import type { User } from "../types/user";

/**
 * 创建新用户
 */
export async function createUser(username: string, password: string): Promise<User> {
  const db = await getDatabase();
  const passwordHash = await bcrypt.hash(password, 10);

  try {
    // 插入用户记录
    const insertStmt = db.prepare("INSERT INTO users (username, password_hash) VALUES (?, ?)");
    insertStmt.bind([username, passwordHash]);
    insertStmt.step();
    insertStmt.free();

    // 查询刚创建的用户 ID
    const selectStmt = db.prepare("SELECT id FROM users WHERE username = ?");
    selectStmt.bind([username]);
    selectStmt.step();
    const result = selectStmt.getAsObject() as { id?: number };
    selectStmt.free();

    if (!result || !result.id) {
      throw new Error("无法获取新用户ID");
    }

    // 持久化数据库到文件
    saveDatabase(db);

    return { id: result.id, username };
  } catch (err) {
    if (err instanceof Error && err.message.includes("UNIQUE")) {
      // 唯一约束冲突，说明用户名已存在
      throw new Error("用户名已存在");
    }
    console.error("创建用户错误:", err);
    throw err;
  }
}

/**
 * 验证用户密码
 * 成功则返回用户对象，失败返回 null
 */
export async function verifyUser(username: string, password: string): Promise<User | null> {
  const db = await getDatabase();

  try {
    const stmt = db.prepare("SELECT id, username, password_hash FROM users WHERE username = ?");
    stmt.bind([username]);

    // 没有找到记录直接返回 null
    if (!stmt.step()) {
      stmt.free();
      return null;
    }

    const result = stmt.getAsObject() as { id?: number; username?: string; password_hash?: string };
    stmt.free();

    if (!result || !result.id || !result.password_hash || !result.username) {
      return null;
    }

    const isValid = await bcrypt.compare(password, result.password_hash);
    if (!isValid) return null;

    return { id: result.id, username: result.username };
  } catch (err) {
    console.error("验证用户失败:", err);
    return null;
  }
}

/**
 * 根据用户ID获取用户信息
 */
export async function getUserById(userId: number): Promise<User | null> {
  const db = await getDatabase();

  try {
    const stmt = db.prepare("SELECT id, username FROM users WHERE id = ?");
    stmt.bind([userId]);

    if (!stmt.step()) {
      stmt.free();
      return null;
    }

    const result = stmt.getAsObject() as { id?: number; username?: string };
    stmt.free();

    if (!result || !result.id || !result.username) {
      return null;
    }

    return { id: result.id, username: result.username };
  } catch (err) {
    console.error("获取用户失败:", err);
    return null;
  }
}
