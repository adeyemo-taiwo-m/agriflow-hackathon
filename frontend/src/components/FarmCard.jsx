import { Link } from 'react-router-dom';
import { useRef, useEffect } from 'react';
import gsap from 'gsap';
import { formatCurrency } from '../utils/format';

export default function FarmCard({ farm }) {
  const cardRef = useRef(null);
  
  // Real data use amount_raised/total_budget; Mock uses raised/goal
  const raised = farm.amount_raised !== undefined ? farm.amount_raised : (farm.raised || 0);
  const goal = farm.total_budget !== undefined ? farm.total_budget : (farm.goal || 1200000);
  const percentFunded = Math.min(100, Math.round((raised / goal) * 100));
  


  const getTrustBadge = (tier) => {
    const t = (tier || '').toLowerCase();
    if (t === 'verified') return { label: 'Verified Farmer', color: '#10b981', bg: 'rgba(16, 185, 129, 0.1)' };
    if (t === 'emerging') return { label: 'Emerging Farmer', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)' };
    return { label: 'Unrated', color: 'var(--color-text-secondary)', bg: 'var(--color-card-alt)' };
  };

  const farmer = farm.farmer || farm.owner || {};
  const trustBadge = getTrustBadge(farmer.trust_tier || farmer.trustTier);
  const farmerName = farmer.full_name || farmer.name || 'Unknown Farmer';
  const displayPhoto = (farm.listing_display_picture_url && farm.listing_display_picture_url[0]) || (farm.photos && farm.photos[0]) || '/placeholder-farm.jpg';
  const cropName = farm.crop_name || farm.cropTag || 'Crop';
  const stateName = farm.state || (farm.location && farm.location.state) || 'Nigeria';
  
  const startDate = new Date(farm.start_date || farm.startDate);
  const daysLeft = Math.max(0, Math.ceil((startDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)));

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
        <img src={displayPhoto} alt={farm.name} loading="lazy" />
      </div>
      <div className="farm-card-body">
        <span className="badge badge-active farm-card-crop">{cropName}</span>
        <h3 className="farm-card-name">{farm.name}</h3>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <p className="farm-card-meta">{farmerName.split(' ')[0]} · {stateName}</p>
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
              {formatCurrency(raised)} raised of {formatCurrency(goal)}
            </span>
            <span className="text-mono farm-card-percent">{percentFunded}%</span>
          </div>
        </div>

        <div className="farm-card-stats">
          <span>Target Yield: <strong>{farm.expected_yield || farm.expectedYield || '—'} {farm.yieldUnit || (farm.crop_name === 'Poultry' ? 'birds' : 'tons')}</strong></span>
          <span style={{ 
            color: percentFunded >= 100 ? 'var(--color-primary)' : (daysLeft <= 7 ? '#f59e0b' : 'var(--color-text-secondary)'), 
            fontWeight: (percentFunded >= 100 || daysLeft <= 7) ? 700 : 500,
            fontSize: '12px'
          }}>
             {percentFunded >= 100 ? 'Fully Funded' : (daysLeft > 0 ? `${daysLeft} days left` : 'Funding Closed')}
          </span>
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
