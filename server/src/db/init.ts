import initSqlJs from "sql.js";
import path from "path";
import fs from "fs";
import { DB_PATH } from "../config";

// sql.js 未提供类型，这里使用轻量 any 兜底
type SqlJsDatabase = any;
type SqlJsStatic = any;

let dbInstance: SqlJsDatabase | null = null;
let SQL: SqlJsStatic | null = null;

/**
 * 初始化数据库连接
 * 说明：sql.js 运行在内存中，此处负责载入/保存文件
 */
export async function initDatabase(): Promise<SqlJsDatabase> {
  if (!SQL) {
    // 首次初始化 SQL 引擎
    SQL = await initSqlJs();
  }

  let db: SqlJsDatabase;
  const dbDir = path.dirname(DB_PATH);

  // 确保数据库目录存在，避免写文件失败
  if (dbDir && !fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  // 如果已有数据库文件，载入现有数据
  if (fs.existsSync(DB_PATH)) {
    const buffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(buffer);
  } else {
    // 否则创建新数据库实例
    db = new SQL.Database();
  }

  // 启用外键约束，保证数据一致性
  db.run("PRAGMA foreign_keys = ON;");

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

  // 初始化完成后立即持久化到文件
  saveDatabase(db);

  console.log(`数据库已连接到 ${DB_PATH}`);
  console.log("数据库表初始化完成");

  return db;
}

/**
 * 保存数据库到文件
 * 注意：sql.js 需手动导出二进制再写入
 */
export function saveDatabase(db: SqlJsDatabase): void {
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_PATH, buffer);
}

/**
 * 获取数据库连接（单例模式）
 */
export async function getDatabase(): Promise<SqlJsDatabase> {
  if (!dbInstance) {
    dbInstance = await initDatabase();
  }
  return dbInstance;
}
