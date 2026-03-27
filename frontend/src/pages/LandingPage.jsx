import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import FarmCard from '../components/FarmCard';
import SEO from '../components/SEO';
import { mockFarms } from '../data/mockData';

gsap.registerPlugin(ScrollTrigger);

export default function LandingPage() {
  const heroRef = useRef(null);
  const trustRef = useRef(null);
  const stepsRef = useRef(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Hero entrance
      gsap.fromTo('.hero-headline', { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8, ease: 'power3.out', delay: 0.1 });
      gsap.fromTo('.hero-sub', { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.7, ease: 'power3.out', delay: 0.3 });
      gsap.fromTo('.hero-ctas', { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, ease: 'power3.out', delay: 0.5 });
      gsap.fromTo('.hero-visual', { x: 30, opacity: 0 }, { x: 0, opacity: 1, duration: 0.9, ease: 'power3.out', delay: 0.4 });

      // Step cards scroll reveal
      gsap.fromTo('.step-card', { y: 40, opacity: 0 }, {
        y: 0, opacity: 1, duration: 0.6, stagger: 0.15, ease: 'power2.out',
        scrollTrigger: { trigger: '.steps-grid', start: 'top 80%' }
      });

      // Trust strips
      gsap.fromTo('.trust-stat', { scale: 0.9, opacity: 0 }, {
        scale: 1, opacity: 1, duration: 0.5, stagger: 0.1, ease: 'back.out(1.4)',
        scrollTrigger: { trigger: '.trust-strip', start: 'top 90%' }
      });
    });
    return () => ctx.revert();
  }, []);

  const featuredFarms = mockFarms.slice(0, 3);

  return (
    <div className="landing">
      <SEO
        title="Harvest-Backed Farm Investments"
        description="AgriFlow connects verified farmers with investors through transparent, milestone-gated farm funding and harvest-backed returns."
        type="website"
      />
      <Navbar />

      {/* ── HERO ── */}
      <section className="hero" ref={heroRef}>
        <div className="container">
          <div className="hero-inner">
            <div className="hero-copy">
              <h1 className="hero-headline">
                Fund a farm.<br/>Track every milestone.<br/>Earn your returns.
              </h1>
              <p className="hero-sub">
                AgriFlow connects Nigerian farmers with investors through a transparent, milestone-gated platform — every naira tracked, every stage verified.
              </p>
              <div className="hero-ctas">
                <Link to="/farms" className="btn btn-solid btn-lg">Browse Active Farms</Link>
                <Link to="/auth?tab=signup&role=farmer" className="btn btn-ghost btn-lg">List Your Farm</Link>
              </div>
            </div>
            <div className="hero-visual">
              <div className="hero-card-preview">
                <div className="preview-tag badge badge-active">Maize · Kaduna</div>
                <div className="preview-name">Oduya Maize Farm</div>
                <div className="preview-bar-wrap">
                  <div className="progress-track">
                    <div className="progress-fill" style={{ width: '70%' }} />
                  </div>
                  <div className="preview-bar-meta">
                    <span className="text-mono" style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>₦840k of ₦1.2M</span>
                    <span className="text-mono" style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-primary)' }}>70%</span>
                  </div>
                </div>
                <div className="preview-milestones">
                  {[
                    { name: 'Plot Prep', status: 'done' },
                    { name: 'Seedlings', status: 'done' },
                    { name: 'Fertilizer', status: 'active' },
                    { name: 'Harvest', status: 'pending' },
                  ].map((m, i) => (
                    <div key={m.name} className={`preview-milestone ${m.status}`}>
                      <span className="preview-dot" />
                      <span>{m.name} {m.status === 'done' ? '✓' : ''}</span>
                    </div>
                  ))}
                </div>
                <div className="preview-returns">
                  <span>Target Return</span>
                  <span className="text-mono preview-return-val">+24%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── TRUST STRIP ── */}
      <section className="trust-strip" ref={trustRef}>
        <div className="container">
          <div className="trust-inner">
            <div className="trust-stat">
              <span className="trust-value text-mono">₦0</span>
              <span className="trust-label">No hidden fees</span>
            </div>
            <div className="trust-divider" />
            <div className="trust-stat">
              <span className="trust-value text-mono">100%</span>
              <span className="trust-label">Verified farmers only</span>
            </div>
            <div className="trust-divider" />
            <div className="trust-stat">
              <span className="trust-value text-mono">Cycle</span>
              <span className="trust-label">Harvest-backed returns</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="section" id="how-it-works" ref={stepsRef}>
        <div className="container">
          <h2 className="section-title">How it works</h2>
          <div className="steps-grid">
            {[
              { num: '01', title: 'Farmers create projects', desc: 'Farmers submit their farm plan, budget breakdown, and timeline. Our team verifies every application before it goes live.' },
              { num: '02', title: 'Investors fund milestones', desc: 'Browse verified farms and choose your investment amount. Watch your portfolio grow.' },
              { num: '03', title: 'Returns at harvest', desc: 'Funds are released in stages only after milestone proofs are submitted and verified. At harvest, returns are calculated and disbursed.' },
            ].map((step) => (
              <div key={step.num} className="step-card card">
                <div className="step-num">{step.num}</div>
                <h3 className="step-title">{step.title}</h3>
                <p className="step-desc">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── ACTIVE FARMS ── */}
      <section className="section section-alt">
        <div className="container">
          <div className="section-header">
            <h2 className="section-title">Farms raising now</h2>
            <Link to="/farms" className="btn-link">See all farms →</Link>
          </div>
          <div className="farms-preview-grid">
            {featuredFarms.map(farm => <FarmCard key={farm.id} farm={farm} />)}
          </div>
        </div>
      </section>

      {/* ── WHY TRUST ── */}
      <section className="section">
        <div className="container">
          <div className="trust-section">
            <div className="trust-left">
              <h2 className="section-title" style={{ textAlign: 'left' }}>Why trust AgriFlow?</h2>
              <p className="trust-body">
                Nigerian agri-fintech has a trust problem — payment delays, opaque fund management, and farmers who disappear after receiving capital. AgriFlow was built to fix this, not paper over it.
              </p>
              <p className="trust-body">
                We don't release funds in bulk. Every stage is gated on verified proof. No proof, no naira. It's that simple.
              </p>
            </div>
            <div className="trust-right">
              {[
                'Stage-by-stage fund release — no lump sums before verification.',
                'Proof uploads required before any naira moves to the farmer.',
                'Earn steady cash payouts when the farm completes its cycles.',
                'Every budget variance tracked publicly on the farm page.',
              ].map((point, i) => (
                <div key={i} className="trust-point">{point}</div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <Footer />

      <style>{`
        .landing { display: flex; flex-direction: column; min-height: 100vh; }

        /* Hero */
        .hero { padding: 120px 0 80px; }
        .hero-inner {
          display: grid;
          grid-template-columns: 1.4fr 1fr;
          gap: 64px;
          align-items: center;
        }
        .hero-headline {
          font-size: 60px;
          font-weight: 700;
          line-height: 1.1;
          letter-spacing: -1.5px;
          color: var(--color-text-primary);
          font-family: var(--font-heading);
          margin-bottom: 24px;
        }
        .hero-sub {
          font-size: 18px;
          color: var(--color-text-secondary);
          line-height: 1.65;
          max-width: 480px;
          margin-bottom: 36px;
        }
        .hero-ctas { display: flex; gap: 16px; flex-wrap: wrap; }

        /* Hero card preview */
        .hero-visual { display: flex; justify-content: center; }
        .hero-card-preview {
          background: var(--color-card);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-lg);
          box-shadow: var(--shadow-lg);
          padding: 28px;
          width: 100%;
          max-width: 340px;
          transform: rotate(2deg);
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .preview-name { font-size: 18px; font-weight: 600; }
        .preview-bar-wrap { display: flex; flex-direction: column; gap: 6px; }
        .preview-bar-meta { display: flex; justify-content: space-between; }
        .preview-milestones { display: flex; flex-direction: column; gap: 8px; }
        .preview-milestone {
          display: flex; align-items: center; gap: 10px;
          font-size: 13px; color: var(--color-text-secondary);
        }
        .preview-dot {
          width: 10px; height: 10px; border-radius: 50%;
          border: 2px solid #ccc; flex-shrink: 0;
        }
        .preview-milestone.done .preview-dot { background: var(--color-primary); border-color: var(--color-primary); }
        .preview-milestone.done { color: var(--color-text-primary); font-weight: 500; }
        .preview-milestone.active .preview-dot { border-color: var(--color-accent); background: var(--color-accent-light); }
        .preview-milestone.active { color: var(--color-accent); }
        .preview-returns {
          display: flex; justify-content: space-between; align-items: center;
          padding: 12px; background: var(--color-primary-light);
          border-radius: var(--radius-sm); font-size: 13px;
          color: var(--color-primary); font-weight: 500;
        }
        .preview-return-val { font-size: 18px; font-weight: 700; }

        /* Trust strip */
        .trust-strip { background: var(--color-card-alt); padding: 28px 0; }
        .trust-inner {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 40px;
        }
        .trust-stat { display: flex; flex-direction: column; align-items: center; gap: 4px; }
        .trust-value { font-size: 22px; font-weight: 700; color: var(--color-text-primary); }
        .trust-label { font-size: 13px; color: var(--color-text-secondary); }
        .trust-divider { width: 1px; height: 40px; background: var(--color-border); }

        /* Sections */
        .section { padding: 80px 0; }
        .section-alt { background: var(--color-card-alt); }
        .section-title {
          font-size: 36px; font-weight: 700;
          font-family: var(--font-heading);
          letter-spacing: -0.5px;
          color: var(--color-text-primary);
          text-align: center;
          margin-bottom: 48px;
        }
        .section-header {
          display: flex; align-items: center; justify-content: space-between;
          margin-bottom: 32px;
        }
        .section-header .section-title { margin-bottom: 0; }

        /* Steps */
        .steps-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 24px;
        }
        .step-card { padding: 32px; position: relative; overflow: hidden; }
        .step-num {
          font-size: 64px;
          font-weight: 800;
          color: var(--color-card-alt);
          line-height: 1;
          position: absolute;
          top: 12px; right: 20px;
          font-family: var(--font-heading);
          user-select: none;
        }
        .step-title { font-size: 18px; font-weight: 600; margin-bottom: 12px; color: var(--color-text-primary); }
        .step-desc { font-size: 14px; color: var(--color-text-secondary); line-height: 1.65; }

        /* Farms preview */
        .farms-preview-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 24px;
        }

        /* Why trust */
        .trust-section { display: grid; grid-template-columns: 1fr 1fr; gap: 64px; align-items: start; }
        .trust-body { font-size: 16px; color: var(--color-text-secondary); line-height: 1.7; margin-bottom: 16px; }
        .trust-right { display: flex; flex-direction: column; gap: 0; }
        .trust-point {
          padding: 16px 20px;
          border-left: 3px solid var(--color-accent);
          margin-bottom: 16px;
          font-size: 15px;
          line-height: 1.6;
          color: var(--color-text-primary);
          background: var(--color-accent-light);
          border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
        }

        /* Responsive */
        @media (max-width: 1024px) {
          .hero-headline { font-size: 48px; }
          .farms-preview-grid { grid-template-columns: repeat(2, 1fr); }
          .trust-section { grid-template-columns: 1fr; gap: 40px; }
        }
        @media (max-width: 768px) {
          .hero { padding: 64px 0 48px; }
          .hero-inner { grid-template-columns: 1fr; gap: 48px; }
          .hero-headline { font-size: 38px; }
          .hero-visual { display: none; }
          .steps-grid { grid-template-columns: 1fr; }
          .farms-preview-grid { grid-template-columns: 1fr; }
          .trust-inner { flex-direction: column; gap: 24px; }
          .trust-divider { width: 40px; height: 1px; }
          .section-header { flex-direction: column; align-items: flex-start; gap: 12px; }
        }
      `}</style>
    </div>
  );
}
