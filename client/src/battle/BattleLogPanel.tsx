import { useEffect, useRef } from 'react';
import styles from './BattleLogPanel.module.css';

interface BattleLogPanelProps {
  logs: string[];
}

export function BattleLogPanel({ logs }: BattleLogPanelProps) {
  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
    logEndRef.current?.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth' });
  }, [logs]);

  return (
    <div className={styles.battleLogPanel}>
      <div className={styles.title}>战斗日志</div>
      <div className={styles.logContainer}>
        {logs.length === 0 ? (
          <div className={styles.emptyLog}>暂无战斗日志</div>
        ) : (
          logs.map((log, index) => (
            <div key={index} className={styles.logEntry}>
              {log}
            </div>
          ))
        )}
        <div ref={logEndRef} />
      </div>
    </div>
  );
}
