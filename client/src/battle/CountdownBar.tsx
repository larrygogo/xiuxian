import styles from './CountdownBar.module.css';

interface CountdownBarProps {
  turnNumber: number;
  countdown: number | null;
  submittedCount: number;
  totalPlayers: number;
}

export function CountdownBar({ turnNumber, countdown, submittedCount, totalPlayers }: CountdownBarProps) {
  if (countdown === null) {
    return (
      <div className={styles.countdownBar}>
        <div className={styles.label}>等待中...</div>
      </div>
    );
  }

  const percentage = Math.max(0, Math.min(100, (countdown / 30) * 100));
  const urgency = countdown <= 5 ? 'urgent' : countdown <= 10 ? 'warning' : 'normal';
  const barClassName = `${styles.bar} ${urgency === 'urgent' ? styles.barUrgent : urgency === 'warning' ? styles.barWarning : ''}`;
  const timeClassName = `${styles.time} ${urgency === 'urgent' ? styles.timeUrgent : urgency === 'warning' ? styles.timeWarning : ''}`;

  return (
    <div className={styles.countdownBar}>
      <div className={styles.header}>
        <div className={styles.turnInfo}>第 {turnNumber} 回合</div>
        <div className={styles.submittedInfo}>
          已提交: {submittedCount}/{totalPlayers}
        </div>
      </div>
      <div className={styles.barContainer}>
        <div
          className={barClassName}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <div className={timeClassName}>剩余时间: {countdown}秒</div>
    </div>
  );
}
