import { Link } from 'react-router-dom';
import { useRef, useEffect } from 'react';
import gsap from 'gsap';

export default function FarmCard({ farm }) {
  const cardRef = useRef(null);
  const percentFunded = Math.min(100, Math.round((farm.raised / farm.goal) * 100));
  const formatCurrency = (n) => `₦${(n / 1000).toFixed(0)}k`;

  const getTrustBadge = (score) => {
    if (score >= 75) return { label: '✓ Verified Farmer', color: '#10b981', bg: 'rgba(16, 185, 129, 0.1)' };
    if (score >= 50) return { label: '◑ Emerging Farmer', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)' };
    return { label: '○ Unrated', color: 'var(--color-text-secondary)', bg: 'var(--color-card-alt)' };
  };
  const trustBadge = getTrustBadge(farm.farmer.trustScore || 0);

  useEffect(() => {
    const card = cardRef.current;
    if (!card) return;
    const onEnter = () => gsap.to(card, { y: -4, boxShadow: '0 6px 20px rgba(0,0,0,0.12)', duration: 0.2, ease: 'power2.out' });
    const onLeave = () => gsap.to(card, { y: 0, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', duration: 0.2, ease: 'power2.out' });
    card.addEventListener('mouseenter', onEnter);
    card.addEventListener('mouseleave', onLeave);
    return () => { card.removeEventListener('mouseenter', onEnter); card.removeEventListener('mouseleave', onLeave); };
  }, []);

  return (
    <div ref={cardRef} className="farm-card">
      <div className="farm-card-photo">
        <img src={farm.photos[0]} alt={farm.name} loading="lazy" />
      </div>
      <div className="farm-card-body">
        <span className="badge badge-active farm-card-crop">{farm.cropTag}</span>
        <h3 className="farm-card-name">{farm.name}</h3>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <p className="farm-card-meta">{farm.farmer.firstName} · {farm.location.state}</p>
          <span style={{ fontSize: '11px', fontWeight: 600, padding: '4px 8px', borderRadius: '4px', color: trustBadge.color, background: trustBadge.bg, letterSpacing: '0.2px' }}>
            {trustBadge.label}
          </span>
        </div>

        <div className="farm-card-progress">
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${percentFunded}%` }} />
          </div>
          <div className="farm-card-progress-row">
            <span className="text-mono" style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>
              {formatCurrency(farm.raised)} raised of {formatCurrency(farm.goal)}
            </span>
            <span className="text-mono farm-card-percent">{percentFunded}%</span>
          </div>
        </div>

        <div className="farm-card-stats">
          <span>Yield: <strong>{farm.expectedYield} {farm.yieldUnit}</strong></span>
          <span>{farm.daysLeft > 0 ? `Closes: ${new Date(farm.closingDate).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })}` : 'Fully Funded'}</span>
        </div>

        <Link to={`/farms/${farm.id}`} className="farm-card-cta">View Farm →</Link>
      </div>

      <style>{`
        .farm-card {
          background: var(--color-card);
          border-radius: var(--radius-lg);
          box-shadow: var(--shadow-md);
          border: 1px solid var(--color-border);
          overflow: hidden;
          display: flex;
          flex-direction: column;
          cursor: pointer;
        }
        .farm-card-photo {
          height: 200px;
          overflow: hidden;
        }
        .farm-card-photo img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
          transition: transform var(--transition-slow);
        }
        .farm-card:hover .farm-card-photo img { transform: scale(1.03); }
        .farm-card-body {
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 10px;
          flex: 1;
        }
        .farm-card-crop { align-self: flex-start; }
        .farm-card-name {
          font-size: 18px;
          font-weight: 600;
          color: var(--color-text-primary);
          line-height: 1.3;
        }
        .farm-card-meta {
          font-size: 13px;
          color: var(--color-text-secondary);
        }
        .farm-card-progress { display: flex; flex-direction: column; gap: 6px; }
        .farm-card-progress-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }
        .farm-card-percent {
          font-size: 13px;
          font-weight: 600;
          color: var(--color-primary);
        }
        .farm-card-stats {
          display: flex;
          justify-content: space-between;
          font-size: 13px;
          color: var(--color-text-secondary);
          padding-top: 4px;
          gap: 8px;
          flex-wrap: wrap;
        }
        .farm-card-stats strong { color: var(--color-text-primary); }
        .farm-card-cta {
          align-self: flex-end;
          font-size: 14px;
          font-weight: 600;
          color: var(--color-primary);
          margin-top: 4px;
          transition: gap var(--transition-fast);
        }
        .farm-card-cta:hover { text-decoration: underline; }
      `}</style>
    </div>
  );
}
