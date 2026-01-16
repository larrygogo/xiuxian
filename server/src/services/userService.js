"use strict";

const bcrypt = require("bcryptjs");
const { getDatabase } = require("../db/init");

/**
 * 创建新用户
 * @param {string} username - 用户名
 * @param {string} password - 明文密码
 * @returns {Promise<{id: number, username: string}>} 用户信息
 */
async function createUser(username, password) {
  const db = await getDatabase();
  const passwordHash = await bcrypt.hash(password, 10);

  try {
    const insertStmt = db.prepare("INSERT INTO users (username, password_hash) VALUES (?, ?)");
    insertStmt.bind([username, passwordHash]);
    insertStmt.step();
    insertStmt.free();
    
    // 获取最后插入的 ID
    const selectStmt = db.prepare("SELECT id FROM users WHERE username = ?");
    selectStmt.bind([username]);
    selectStmt.step();
    const result = selectStmt.getAsObject();
    selectStmt.free();
    
    if (!result || !result.id) {
      throw new Error("无法获取新用户ID");
    }
    
    // 保存数据库
    const { saveDatabase } = require("../db/init");
    saveDatabase(db);
    
    return { id: result.id, username };
  } catch (err) {
    if (err.message && (err.message.includes("UNIQUE constraint") || err.message.includes("UNIQUE"))) {
      throw new Error("用户名已存在");
    }
    console.error("创建用户错误:", err);
    throw err;
  }
}

/**
 * 验证用户密码
 * @param {string} username - 用户名
 * @param {string} password - 明文密码
 * @returns {Promise<{id: number, username: string}|null>} 用户信息，验证失败返回 null
 */
async function verifyUser(username, password) {
  const db = await getDatabase();

  try {
    const stmt = db.prepare("SELECT id, username, password_hash FROM users WHERE username = ?");
    stmt.bind([username]);
    
    // 执行查询
    if (!stmt.step()) {
      // 没有找到记录
      stmt.free();
      return null;
    }
    
    const result = stmt.getAsObject();
    stmt.free();

    if (!result || !result.id) {
      return null;
    }

    const isValid = await bcrypt.compare(password, result.password_hash);
    if (isValid) {
      return { id: result.id, username: result.username };
    }
    
    return null;
  } catch (err) {
    console.error("验证用户失败:", err);
    return null;
  }
}

/**
 * 根据用户ID获取用户信息
 * @param {number} userId - 用户ID
 * @returns {Promise<{id: number, username: string}|null>} 用户信息
 */
async function getUserById(userId) {
  const db = await getDatabase();
  
  try {
    const stmt = db.prepare("SELECT id, username FROM users WHERE id = ?");
    stmt.bind([userId]);
    
    if (!stmt.step()) {
      stmt.free();
      return null;
    }
    
    const result = stmt.getAsObject();
    stmt.free();

    if (!result || !result.id) {
      return null;
    }

    return { id: result.id, username: result.username };
  } catch (err) {
    console.error("获取用户失败:", err);
    return null;
  }
}

module.exports = { createUser, verifyUser, getUserById };
