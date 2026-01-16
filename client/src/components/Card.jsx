import './Card.css';

export function Card({ title, children, className = '' }) {
  return (
    <div className={`game-card ${className}`}>
      {title && <h2 className="card-title">{title}</h2>}
      <div className="card-content">
        {children}
      </div>
    </div>
  );
}
