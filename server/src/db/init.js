"use strict";

const initSqlJs = require("sql.js");
const { DB_PATH } = require("../config");
const path = require("path");
const fs = require("fs");

let dbInstance = null;
let SQL = null;

/**
 * 初始化数据库连接
 * @returns {Promise<Object>} 数据库连接对象
 */
async function initDatabase() {
  if (!SQL) {
    SQL = await initSqlJs();
  }

  let db;
  const dbDir = path.dirname(DB_PATH);
  if (dbDir && !fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  if (fs.existsSync(DB_PATH)) {
    const buffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }

  // 启用外键约束
  db.run("PRAGMA foreign_keys = ON;");

  // 创建表
  // 用户表
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
    )
  `);

  // 游戏状态表
  db.run(`
    CREATE TABLE IF NOT EXISTS game_states (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      state_data TEXT NOT NULL,
      last_ts INTEGER NOT NULL,
      updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(user_id)
    )
  `);

  // 保存数据库到文件
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_PATH, buffer);

  console.log(`数据库已连接到 ${DB_PATH}`);
  console.log("数据库表初始化完成");

  return db;
}

/**
 * 保存数据库到文件
 */
function saveDatabase(db) {
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_PATH, buffer);
}

/**
 * 获取数据库连接（单例模式）
 */
async function getDatabase() {
  if (!dbInstance) {
    dbInstance = await initDatabase();
  }
  return dbInstance;
}

module.exports = { initDatabase, getDatabase, saveDatabase };
