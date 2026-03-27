import { useState, useMemo, useCallback, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import FarmCard from '../components/FarmCard';
import SkeletonCard from '../components/SkeletonCard';
import EmptyState from '../components/EmptyState';
import api from '../utils/api';
import SEO from '../components/SEO';
import { mockFarms, cropTypes, nigeriaStates } from '../data/mockData';

let debounceTimer;

export default function FarmListingsPage() {
  const { user } = useAuth();
  const isFarmer = user?.role === 'farmer';

  const [farms, setFarms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('newest');
  const [filters, setFilters] = useState({ crops: [], state: '', status: 'active', returnType: '', fundingMin: 0, fundingMax: 100 });
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [page, setPage] = useState(1);
  const ITEMS_PER_PAGE = 6;

  const fetchFarms = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/farms', {
        params: {
          farm_status: filters.status || 'active',
          state: filters.state || undefined,
          // crop_name: filters.crops.length === 1 ? filters.crops[0] : undefined // Simple one-crop filter for backend
        }
      });
      if (res.data.success) {
        setFarms(res.data.data);
      }
    } catch (err) {
      console.error("Failed to fetch farms:", err);
      // Fallback to empty or mock if debugging
      // setFarms(mockFarms); 
    } finally {
      setLoading(false);
    }
  }, [filters.status, filters.state]);

  useEffect(() => {
    fetchFarms();
  }, [fetchFarms]);

  const handleSearch = useCallback((val) => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => setSearch(val), 300);
  }, []);

  const toggleCrop = (crop) => {
    setFilters(f => ({ ...f, crops: f.crops.includes(crop) ? f.crops.filter(c => c !== crop) : [...f.crops, crop] }));
    setPage(1);
  };

  const clearFilters = () => {
    setFilters({ crops: [], state: '', status: 'active', returnType: '', fundingMin: 0, fundingMax: 100 });
    setSearch('');
  };

  const filtered = useMemo(() => {
    let list = [...farms];
    
    // UI-side search
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(f =>
        f.name.toLowerCase().includes(q) ||
        f.crop_name?.toLowerCase().includes(q) ||
        f.state?.toLowerCase().includes(q) ||
        f.description?.toLowerCase().includes(q)
      );
    }
    
    // UI-side multi-crop filtering
    if (filters.crops.length) {
      list = list.filter(f => filters.crops.includes(f.crop_name || f.crop));
    }

    // Funding range filtering (Backend handles total_budget/amount_raised)
    const getPct = (f) => {
        const raised = f.amount_raised !== undefined ? f.amount_raised : (f.raised || 0);
        const goal = f.total_budget !== undefined ? f.total_budget : (f.goal || 1200000);
        return (raised / goal) * 100;
    };
    list = list.filter(f => getPct(f) >= filters.fundingMin && getPct(f) <= Math.max(filters.fundingMax, 100));

    // Sort
    if (sort === 'funding') list.sort((a, b) => getPct(b) - getPct(a));
    else if (sort === 'newest') list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    else if (sort === 'return') list.sort((a, b) => (b.return_rate || 0) - (a.return_rate || 0));
    else if (sort === 'deadline') list.sort((a, b) => new Date(a.start_date || a.startDate) - new Date(b.start_date || b.startDate));

    return list;
  }, [farms, search, filters, sort]);

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginated = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  return (
    <div className="listings-page">
      <SEO
        title="Explore Farm Investments"
        description="Explore available harvest-backed farm investments on AgriFlow. Filter by crop, location, and funding status to find opportunities that match your goals."
        type="website"
      />
      <Navbar />

      {/* Farmer banner */}
      {isFarmer && (
        <div className="farmer-banner" id="farmer-explore-banner">
          <span>Seeing how other farmers present their projects? Use what you learn when creating your own.</span>
          <a href="/farmer/dashboard?tab=add" className="farmer-banner-link">Create a farm →</a>
        </div>
      )}

      <div className="listings-body container">
        {/* Sidebar */}
        <aside className={`listings-sidebar${sidebarOpen ? ' open' : ''}`}>
          <div className="sidebar-section">
            <p className="sidebar-heading">Crop Type</p>
            {cropTypes.map(crop => (
              <label key={crop} className="sidebar-checkbox">
                <input type="checkbox" checked={filters.crops.includes(crop)} onChange={() => toggleCrop(crop)} />
                <span>{crop}</span>
              </label>
            ))}
          </div>
          <div className="sidebar-section">
            <p className="sidebar-heading">Location</p>
            <select className="form-input form-select" value={filters.state} onChange={e => { setFilters(f => ({ ...f, state: e.target.value })); setPage(1); }}>
              <option value="">All States</option>
              {nigeriaStates.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="sidebar-section">
            <p className="sidebar-heading">Status</p>
            {['active', 'funded', 'completed'].map(s => (
              <label key={s} className="sidebar-checkbox">
                <input type="radio" name="status" checked={filters.status === s} onChange={() => { setFilters(f => ({ ...f, status: s })); setPage(1); }} />
                <span style={{ textTransform: 'capitalize' }}>{s === 'funded' ? 'Fully Funded' : s}</span>
              </label>
            ))}
            {filters.status && <button className="btn-link" style={{ fontSize: '12px', marginTop: '4px' }} onClick={() => setFilters(f => ({ ...f, status: '' }))}>Clear</button>}
          </div>
          <button className="btn-link sidebar-clear" onClick={clearFilters}>Clear all filters</button>
        </aside>

        {/* Main content */}
        <main className="listings-main">
          <div className="listings-toolbar">
            <div className="listings-search-wrap">
              <input
                type="text"
                className="form-input listings-search"
                placeholder="Search farms, crops, states…"
                onChange={e => handleSearch(e.target.value)}
              />
            </div>
            <select className="form-input form-select listings-sort" value={sort} onChange={e => { setSort(e.target.value); setPage(1); }}>
              <option value="newest">Newest</option>
              <option value="funding">Funding %</option>
              <option value="return">Return Rate</option>
              <option value="deadline">Deadline</option>
            </select>
            <button className="btn btn-ghost btn-sm listings-filter-btn" onClick={() => setSidebarOpen(!sidebarOpen)}>
              {sidebarOpen ? 'Hide Filters' : 'Filters'}
            </button>
          </div>

          <p className="listings-count">{filtered.length} {filtered.length === 1 ? 'farm' : 'farms'} {search ? `matching "${search}"` : 'available'}</p>

          {loading ? (
            <div className="listings-grid">
              {[1, 2, 3, 4, 5, 6].map(i => <SkeletonCard key={i} />)}
            </div>
          ) : paginated.length === 0 ? (
            <EmptyState
              title={`No farms match${search ? ` "${search}"` : ''}`}
              description="Try a different crop type, state, or clear your filters."
              action={clearFilters}
              actionLabel="Clear search"
            />
          ) : (
            <div className="listings-grid">
              {paginated.map(farm => <FarmCard key={farm.id} farm={farm} />)}
            </div>
          )}

          {totalPages > 1 && (
            <div className="pagination">
              <button className="btn btn-ghost btn-sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                <button key={p} className={`pagination-num${p === page ? ' active' : ''}`} onClick={() => setPage(p)}>{p}</button>
              ))}
              <button className="btn btn-ghost btn-sm" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>Next →</button>
            </div>
          )}
        </main>
      </div>

      <Footer />

      <style>{`
        .listings-page { display: flex; flex-direction: column; min-height: 100vh; }
        .farmer-banner {
          background: var(--color-card-alt);
          padding: 12px 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 16px;
          font-size: 14px;
          color: var(--color-text-secondary);
          border-bottom: 1px solid var(--color-border);
          flex-wrap: wrap;
          text-align: center;
        }
        .farmer-banner-link { color: var(--color-primary); font-weight: 600; font-size: 14px; }
        .listings-body {
          display: flex;
          gap: 32px;
          padding-top: 40px;
          padding-bottom: 60px;
          flex: 1;
          align-items: flex-start;
        }
        .listings-sidebar {
          width: 240px;
          flex-shrink: 0;
          background: var(--color-card);
          border-radius: var(--radius-lg);
          border: 1px solid var(--color-border);
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 4px;
          position: sticky;
          top: 24px;
        }
        .sidebar-section { padding-bottom: 20px; margin-bottom: 4px; border-bottom: 1px solid var(--color-border); }
        .sidebar-section:last-of-type { border-bottom: none; }
        .sidebar-heading { font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: var(--color-text-secondary); margin-bottom: 12px; }
        .sidebar-checkbox {
          display: flex; align-items: center; gap: 8px;
          font-size: 14px; color: var(--color-text-primary);
          margin-bottom: 8px; cursor: pointer;
        }
        .sidebar-checkbox input { accent-color: var(--color-primary); }
        .sidebar-clear { font-size: 13px; color: var(--color-text-secondary); margin-top: 8px; }
        .listings-main { flex: 1; min-width: 0; }
        .listings-toolbar {
          display: flex;
          gap: 12px;
          align-items: center;
          margin-bottom: 16px;
          flex-wrap: wrap;
        }
        .listings-search-wrap { flex: 1; min-width: 200px; }
        .listings-search { max-width: 360px; }
        .listings-sort { width: 160px; }
        .listings-filter-btn { display: none; }
        .listings-count { font-size: 14px; color: var(--color-text-secondary); margin-bottom: 24px; }
        .listings-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 24px;
          width: 100%;
        }
        .pagination {
          margin-top: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }
        .pagination-num {
          width: 36px; height: 36px;
          border-radius: var(--radius-sm);
          font-size: 14px; font-weight: 500;
          color: var(--color-text-secondary);
          transition: all var(--transition-fast);
        }
        .pagination-num:hover { background: var(--color-card-alt); color: var(--color-text-primary); }
        .pagination-num.active { background: var(--color-primary); color: #fff; }
        @media (max-width: 768px) {
          .listings-body { flex-direction: column; padding-top: 24px; }
          .listings-sidebar { display: none; width: 100%; position: static; }
          .listings-sidebar.open { display: flex; }
          .listings-filter-btn { display: flex; }
          .listings-grid { gap: 16px; }
          .listings-sort { width: 120px; }
          .listings-search { max-width: 100%; }
        }
        @media (max-width: 480px) {
          .listings-body { padding-left: 16px; padding-right: 16px; overflow-x: hidden; }
          .listings-toolbar { flex-direction: column; align-items: stretch; gap: 8px; }
          .listings-search-wrap, .listings-search { width: 100%; max-width: 100%; box-sizing: border-box; }
          .listings-sort { width: 100%; box-sizing: border-box; }
          .listings-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
}
