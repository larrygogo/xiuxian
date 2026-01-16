"use strict";

const { BEASTS } = require("../config");
const { logLine } = require("../services/logger");

/**
 * 生成指定范围内的随机整数（包含边界）
 * @param {number} min - 最小值
 * @param {number} max - 最大值
 * @returns {number} 随机整数
 */
function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * 执行一次探索
 * 根据气运值调整事件概率，随机触发好/中性/坏事件
 * @param {Object} s - 游戏状态对象
 */
function exploreTick(s) {
  // luck 越高，收益略增；同时保持下限/上限
  const luckBias = s.luck * 0.002;
  let good = 0.40 + luckBias;
  let neutral = 0.30;
  let bad = 0.30 - luckBias;

  good = Math.max(0.25, Math.min(0.65, good));
  bad = Math.max(0.10, Math.min(0.45, bad));

  const total = good + neutral + bad;
  good /= total; neutral /= total; bad /= total;

  const r = Math.random();
  if (r < good) return goodEvent(s);
  if (r < good + neutral) return neutralEvent(s);
  return badEvent(s);
}

/**
 * 处理好事件
 * 可能触发奇遇机缘（获得大量灵气）或采集灵草
 * @param {Object} s - 游戏状态对象
 */
function goodEvent(s) {
  // 大机缘限流：每天最多 2 次
  if (Math.random() < 0.25 && s.daily.fortuneCount < 2) {
    s.daily.fortuneCount += 1;
    const gain = randInt(18, 36) + s.realmIndex * 4;
    s.qi += gain;
    logLine(`奇遇机缘：灵气 +${gain}。`, s);
    return;
  }

  const herbs = randInt(0, 2) + (Math.random() < 0.25 ? 1 : 0);
  if (herbs > 0) {
    s.herbs += herbs;
    logLine(`采到灵草 x${herbs}（当前 ${s.herbs}）。`, s);
  }
}

/**
 * 处理中性事件
 * 可能触发清泉洗髓，恢复少量生命
 * @param {Object} s - 游戏状态对象
 */
function neutralEvent(s) {
  if (Math.random() < 0.35) {
    const heal = randInt(4, 10);
    s.hp = Math.min(s.maxHp, s.hp + heal);
    logLine(`清泉洗髓：生命 +${heal}（${s.hp}/${s.maxHp}）。`, s);
  }
}

/**
 * 处理坏事件（遇到妖兽）
 * 根据实力对比决定是斩杀获得奖励还是受伤
 * @param {Object} s - 游戏状态对象
 */
function badEvent(s) {
  // 妖兽限流：每天最多 3 次
  if (s.daily.beastCount >= 3) return;
  s.daily.beastCount += 1;

  const beast = BEASTS[randInt(0, BEASTS.length - 1)];
  const pwr = randInt(15, 30) + s.realmIndex * 6;

  let myPower = randInt(18, 32) + s.realmIndex * 8 + Math.floor(s.luck / 3);
  myPower += Math.floor((s.hp / s.maxHp) * 6);

  if (myPower >= pwr) {
    const reward = randInt(8, 18) + s.realmIndex * 3;
    s.qi += reward;
    logLine(`斩杀【${beast}】：灵气 +${reward}。`, s);
  } else {
    const dmg = randInt(12, 26) + s.realmIndex * 3;
    s.hp = Math.max(0, s.hp - dmg);
    logLine(`遭遇【${beast}】受创：生命 -${dmg}（${s.hp}/${s.maxHp}）。`, s);
    if (s.hp <= 0) {
      s.alive = false;
      logLine("你倒在荒野之中，身死道消。", s);
    }
  }
}

module.exports = { exploreTick };
