import type { ReactNode } from 'react';
import styles from './Card.module.css';

interface CardProps {
  title?: string;
  children: ReactNode;
  className?: string;
}

export function Card({ title, children, className = '' }: CardProps) {
  return (
    <div className={`${styles['game-card']} ${className}`}>
      {title && <h2 className={styles['card-title']}>{title}</h2>}
      <div className={styles['card-content']}>
        {children}
      </div>
    </div>
  );
}
