import { createContext, lazy, Suspense, useCallback, useContext, useEffect, useState } from 'react';
import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from 'framer-motion';
import { Link, NavLink, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowRight, Backpack, BarChart3, Check, CheckCircle2, Droplets, Headphones,
  ChevronDown, Clock3, Compass, FileSearch, Filter, HeartHandshake, ImagePlus,
  KeyRound, LayoutDashboard, MapPin, Menu, PackageCheck, Plus, Search, ShieldCheck, Smartphone,
  Sparkles, TrendingUp, UploadCloud, X,
} from 'lucide-react';
import { analyticsApi, getErrorMessage, reportApi } from './api.js';

const AnalyticsCharts = lazy(() => import('./AnalyticsCharts.jsx'));
const ToastContext = createContext(() => {});
const useToast = () => useContext(ToastContext);
const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/reports', label: 'Browse reports', icon: FileSearch },
  { to: '/analytics', label: 'Analytics', icon: BarChart3 },
];

const today = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

const asRows = (value, names = []) => {
  if (Array.isArray(value)) return value;
  for (const name of names) {
    if (Array.isArray(value?.[name])) return value[name];
  }
  return [];
};

const reportId = (report) => report?._id ?? report?.id;
const displayDate = (date, time) => {
  if (!date) return 'Date not provided';
  const parsed = new Date(`${date}T${time || '12:00'}`);
  return Number.isNaN(parsed.getTime())
    ? `${date}${time ? ` · ${time}` : ''}`
    : new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(parsed)
      + (time ? ` · ${time}` : '');
};

function Layout({ children }) {
  const [toast, setToast] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  useEffect(() => setMenuOpen(false), [location.pathname]);
  const notify = useCallback((message, tone = 'success') => {
    setToast({ message, tone, key: Date.now() });
    window.setTimeout(() => setToast(null), 4200);
  }, []);

  return (
    <ToastContext.Provider value={notify}>
      <div className="app-shell">
        <header className="topbar">
          <Link className="brand" to="/" aria-label="LOFO home">
            <span className="brand-mark">L</span><span>LOFO</span><span className="brand-divider" /><span className="brand-subtitle">Campus community</span>
          </Link>
          <button className="icon-button mobile-menu" aria-label="Toggle navigation" onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <nav className={`main-nav ${menuOpen ? 'is-open' : ''}`} aria-label="Main navigation">
            {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
              <NavLink key={to} to={to} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                <Icon size={17} strokeWidth={1.9} /><span>{label}</span>
              </NavLink>
            ))}
          </nav>
          <div className="topbar-actions">
            <span className="campus-pill"><span className="online-dot" /> Campus-wide</span>
            <Link to="/report/lost" className="button button-primary button-small"><Plus size={16} /> Report an item</Link>
          </div>
        </header>
        <main className="main-content">
          {children}
        </main>
        <footer className="footer">
          <Link className="footer-brand" to="/"><span className="brand-mark small">L</span> LOFO</Link>
          <span>Good things find their way back.</span>
          <Link to="/reports">Explore campus reports <ArrowRight size={14} /></Link>
        </footer>
        {toast && (
          <div key={toast.key} className={`toast toast-${toast.tone}`} role="status">
            {toast.tone === 'error' ? <X size={18} /> : <CheckCircle2 size={18} />}
            <span>{toast.message}</span>
            <button aria-label="Dismiss notification" onClick={() => setToast(null)}><X size={16} /></button>
          </div>
        )}
      </div>
    </ToastContext.Provider>
  );
}

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/report/:type" element={<ReportFormPage />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/reports/:id" element={<MatchesPage />} />
        <Route path="/matches/:id" element={<MatchesPage />} />
        <Route path="/analytics" element={<AnalyticsPage />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Layout>
  );
}

function PageHeading({ eyebrow, title, description, action }) {
  return (
    <div className="page-heading">
      <div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1>{description && <p className="page-description">{description}</p>}</div>
      {action}
    </div>
  );
}

function ErrorState({ message, onRetry }) {
  return (
    <div className="state-card error-state">
      <div className="state-icon"><ShieldCheck size={23} /></div>
      <h3>We couldn’t load this just now</h3>
      <p>{message}</p>
      {onRetry && <button className="button button-outline" onClick={onRetry}>Try again</button>}
    </div>
  );
}

function LoadingState({ label = 'Loading campus updates…' }) {
  return <div className="loading-state"><span className="spinner" /><span>{label}</span></div>;
}

function EmptyState({ title, description, action }) {
  return (
    <div className="state-card empty-state">
      <div className="state-icon"><PackageCheck size={23} /></div>
      <h3>{title}</h3><p>{description}</p>{action}
    </div>
  );
}

function LandingPage() {
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { setOverview(await analyticsApi.overview()); }
    catch (err) { setError(getErrorMessage(err)); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);
  const stats = overviewMetrics(overview);

  return (
    <div className="landing-page">
      <section className="hero">
        <div className="hero-copy">
          <div className="hero-kicker"><Sparkles size={15} /> A little help goes a long way</div>
          <h1>Lost Something?<br /><span>Find It with LOFO.</span></h1>
          <p>A smarter way to reconnect people with their lost belongings.</p>
          <div className="hero-actions">
            <Link to="/report/lost" className="button button-primary button-large">Report Lost Item <ArrowRight size={17} /></Link>
            <Link to="/report/found" className="button button-white button-large"><Plus size={17} /> Report Found Item</Link>
          </div>
          <div className="hero-trust"><span className="hero-trust-icon"><ShieldCheck size={15} /></span><span>Built for your campus community</span></div>
        </div>
        <HeroScene />
      </section>

      <section className="stats-strip">
        {error ? <div className="stats-error"><span>{error}</span><button onClick={load}>Retry</button></div> : loading ? <div className="stats-loading"><span className="spinner" /> Gathering campus stats…</div> : (
          <>
            <Stat number={stats.reunited} label="Items reunited" detail="Little wins, every day" icon={HeartHandshake} tone="green" />
            <Stat number={stats.active} label="Active reports" detail="The community is on it" icon={Compass} tone="blue" />
            <Stat number={stats.found} label="Items found" detail="Ready to find their person" icon={PackageCheck} tone="purple" />
            <div className="stats-note"><span className="note-icon"><Sparkles size={17} /></span><span>Every report makes our campus a little more connected.</span></div>
          </>
        )}
      </section>

      <section className="how-section">
        <div className="section-title"><div><p className="eyebrow">Simple by design</p><h2>Three steps. One happy ending.</h2></div><Link to="/reports" className="text-link">Browse all reports <ArrowRight size={15} /></Link></div>
        <div className="steps-grid">
          <Step number="01" icon={FileSearch} title="Share the details" text="Post what you’ve lost or found. A few clues are all it takes to get started." />
          <Step number="02" icon={Sparkles} title="Find your match" text="LOFO compares reports and surfaces the closest matches from around campus." />
          <Step number="03" icon={HeartHandshake} title="Make the reunion" text="Connect with your campus community and mark the item safely reunited." />
        </div>
      </section>
      <section className="cta-banner"><div><p className="eyebrow">Your community is here</p><h2>Found something on campus?</h2><p>A quick report could make someone’s whole week.</p></div><Link to="/report/found" className="button button-white">Report a found item <ArrowRight size={16} /></Link></section>
    </div>
  );
}

function overviewMetrics(input) {
  const data = input?.overview ?? input?.metrics ?? input?.totals ?? input?.stats ?? input ?? {};
  const types = data.byType ?? data.typeCounts ?? input?.byType ?? input?.typeCounts ?? {};
  const statuses = data.byStatus ?? data.statusCounts ?? input?.byStatus ?? input?.statusCounts ?? {};
  const get = (...keys) => {
    for (const key of keys) if (Number.isFinite(Number(data?.[key]))) return Number(data[key]);
    return null;
  };
  const countFrom = (object, ...keys) => {
    for (const key of keys) if (Number.isFinite(Number(object?.[key]))) return Number(object[key]);
    return null;
  };
  const total = get('totalReports', 'total', 'reportsCount');
  const lost = get('lostItems', 'lostReports', 'totalLost', 'lost', 'lostCount')
    ?? countFrom(types, 'LOST', 'lost');
  const found = get('foundItems', 'foundReports', 'totalFound', 'found', 'foundCount')
    ?? countFrom(types, 'FOUND', 'found');
  const reunited = get('reunitedItems', 'reunitedReports', 'totalReunited', 'reunited', 'reunitedCount')
    ?? countFrom(statuses, 'REUNITED', 'reunited');
  return {
    total: total ?? 0,
    lost: lost ?? 0,
    found: found ?? 0,
    reunited: reunited ?? 0,
    active: get('activeReports', 'active', 'activeCount')
      ?? countFrom(statuses, 'ACTIVE', 'active')
      ?? Math.max(0, (total ?? 0) - (reunited ?? 0)),
  };
}

function hasOverviewCounts(input) {
  const data = input?.overview ?? input?.metrics ?? input?.totals ?? input?.stats ?? input ?? {};
  const keys = ['totalReports', 'total', 'reportsCount', 'lostItems', 'lostReports', 'totalLost', 'lost', 'lostCount', 'foundItems', 'foundReports', 'totalFound', 'found', 'foundCount', 'reunitedItems', 'reunitedReports', 'totalReunited', 'reunited', 'reunitedCount', 'activeReports', 'active', 'activeCount'];
  return keys.some((key) => data[key] !== undefined)
    || Boolean(data.byType ?? data.typeCounts ?? data.byStatus ?? data.statusCounts);
}

function Stat({ number, label, detail, icon: Icon, tone = 'blue', compact = false }) {
  const reduceMotion = useReducedMotion();
  return <motion.div className={`stat-card ${compact ? 'compact' : ''}`} whileHover={reduceMotion ? undefined : { y: -4, rotateX: 2, rotateY: -2, scale: 1.015 }} transition={{ type: 'spring', stiffness: 260, damping: 20 }} style={{ transformPerspective: 900 }}><span className={`stat-icon ${tone}`}><Icon size={18} /></span><div className="stat-copy"><AnimatedNumber value={number} /><span>{label}</span>{!compact && <small>{detail}</small>}</div></motion.div>;
}

function AnimatedNumber({ value }) {
  const reduceMotion = useReducedMotion();
  const source = useMotionValue(0);
  const spring = useSpring(source, { stiffness: 90, damping: 22, restDelta: 0.5 });
  const rounded = useTransform(spring, (current) => Math.round(current).toLocaleString());

  useEffect(() => {
    if (typeof value !== 'number') return;
    if (reduceMotion) spring.jump(value);
    else source.set(value);
  }, [value, reduceMotion, source, spring]);

  if (typeof value !== 'number') return <strong>{value}</strong>;
  return <motion.strong>{rounded}</motion.strong>;
}

function HeroScene() {
  const reduceMotion = useReducedMotion();
  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);
  const rotateY = useSpring(useTransform(pointerX, [-0.5, 0.5], [-8, 8]), { stiffness: 90, damping: 24 });
  const rotateX = useSpring(useTransform(pointerY, [-0.5, 0.5], [6, -6]), { stiffness: 90, damping: 24 });

  const handlePointerMove = (event) => {
    if (reduceMotion) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    pointerX.set((event.clientX - bounds.left) / bounds.width - 0.5);
    pointerY.set((event.clientY - bounds.top) / bounds.height - 0.5);
  };
  const resetPointer = () => {
    pointerX.set(0);
    pointerY.set(0);
  };
  const float = (distance) => reduceMotion
    ? undefined
    : { y: [0, -distance, 0], rotateZ: [0, 2, 0] };
  const floatTransition = (duration, delay = 0) => ({
    duration, delay, repeat: Infinity, ease: 'easeInOut',
  });

  return (
    <motion.div
      className="hero-art"
      aria-hidden="true"
      onPointerMove={handlePointerMove}
      onPointerLeave={resetPointer}
      style={{ rotateX, rotateY, transformPerspective: 900, transformStyle: 'preserve-3d' }}
    >
      <div className="hero-orbit orbit-one" /><div className="hero-orbit orbit-two" />
      <div className="scene-glow" />
      <motion.div className="hero-object object-backpack" animate={float(10)} transition={floatTransition(5.4)}>
        <Backpack size={57} strokeWidth={1.35} /><span>BACKPACK</span>
      </motion.div>
      <motion.div className="hero-object object-bottle" animate={float(12)} transition={floatTransition(4.8, 0.4)}>
        <div className="bottle-visual"><span className="bottle-cap" /><span className="bottle-shine" /><Droplets size={19} /></div><span>WATER BOTTLE</span>
      </motion.div>
      <motion.div className="hero-object object-headphones" animate={float(9)} transition={floatTransition(5.7, 0.8)}>
        <Headphones size={54} strokeWidth={1.4} /><span>HEADPHONES</span>
      </motion.div>
      <motion.div className="hero-object object-keys" animate={float(8)} transition={floatTransition(4.9, 0.2)}>
        <KeyRound size={39} strokeWidth={1.45} /><span>KEYS</span>
      </motion.div>
      <motion.div className="hero-object object-phone" animate={float(11)} transition={floatTransition(5.2, 0.6)}>
        <Smartphone size={47} strokeWidth={1.4} /><span>PHONE</span>
      </motion.div>
      <div className="hero-center-card">
        <span className="hero-center-mark"><span className="brand-mark">L</span></span>
        <span className="hero-center-title">One campus.<br />Things find their way.</span>
        <span className="hero-center-rule"><i /></span>
        <span className="hero-center-caption"><span className="online-dot" /> LOST &amp; FOUND, RECONNECTED</span>
      </div>
      <div className="scene-coordinate coordinate-top">LOFO / CAMPUS NETWORK</div>
      <div className="scene-coordinate coordinate-bottom"><span>01</span> COMMUNITY FIRST</div>
    </motion.div>
  );
}

function Step({ number, icon: Icon, title, text }) {
  return <article className="step-card"><div className="step-top"><span className="step-number">{number}</span><span className="step-icon"><Icon size={20} /></span></div><h3>{title}</h3><p>{text}</p></article>;
}

function DashboardPage() {
  const [reports, setReports] = useState([]);
  const [overview, setOverview] = useState(null);
  const [hotspots, setHotspots] = useState([]);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [reportResult, metrics, hotspotData] = await Promise.all([
        reportApi.list({ limit: 100 }),
        analyticsApi.overview(),
        analyticsApi.hotspots(),
      ]);
      const recent = reportResult.reports;
      setReports(recent);
      setOverview(metrics);
      setHotspots(normalizeRanked(asRows(hotspotData, ['hotspots', 'locations', 'topLocations', 'data']), ['location', 'name', 'place', '_id'], ['count', 'total', 'reports', 'reportCount', 'totalReports']));
      const candidates = recent.filter((report) => report.type === 'LOST' && report.status === 'ACTIVE').slice(0, 3);
      const foundMatches = (await Promise.all(candidates.map(async (report) => {
        try { return (await reportApi.matches(reportId(report))).slice(0, 1).map((match) => ({ ...match, source: report })); }
        catch { return []; }
      }))).flat();
      setMatches(foundMatches);
    } catch (err) { setError(getErrorMessage(err)); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);
  const totals = overviewMetrics(overview);
  const fallbackStats = {
    total: reports.length,
    lost: reports.filter((report) => report.type === 'LOST').length,
    found: reports.filter((report) => report.type === 'FOUND').length,
    reunited: reports.filter((report) => report.status === 'REUNITED').length,
    active: reports.filter((report) => report.status === 'ACTIVE').length,
  };
  const display = hasOverviewCounts(overview) ? totals : fallbackStats;
  const topLocations = hotspots.slice(0, 3);

  return (
    <div className="page-wrap">
      <PageHeading eyebrow="Your campus at a glance" title="Good morning, campus." description="Here’s what’s happening in your community today." action={<button className="button button-outline" onClick={load}><TrendingUp size={16} /> Refresh data</button>} />
      {error ? <ErrorState message={error} onRetry={load} /> : loading ? <LoadingState label="Loading your campus dashboard…" /> : (
        <>
          <div className="stats-grid">
            <Stat number={display.total} label="Total reports" icon={FileSearch} tone="blue" compact />
            <Stat number={display.lost} label="Lost items" icon={Search} tone="orange" compact />
            <Stat number={display.found} label="Found items" icon={PackageCheck} tone="purple" compact />
            <Stat number={display.reunited} label="Reunited" icon={HeartHandshake} tone="green" compact />
          </div>
          <div className="dashboard-grid">
            <section className="panel recent-panel"><PanelHeading title="Recent reports" subtitle="Fresh updates from around campus" action={<Link to="/reports" className="text-link">View all <ArrowRight size={14} /></Link>} />
              {reports.length ? <div className="report-list">{reports.slice(0, 5).map((report) => <ReportRow key={reportId(report)} report={report} onClick={() => navigate(`/reports/${reportId(report)}`)} />)}</div> : <EmptyState title="A fresh start" description="No reports yet. Be the first to help out." action={<Link to="/report/lost" className="text-link">Create a report <ArrowRight size={14} /></Link>} />}
            </section>
            <div className="dashboard-side">
              <section className="panel match-panel"><PanelHeading title="Potential matches" subtitle="The closest connections right now" action={<Link to="/reports" className="subtle-icon-link" aria-label="Browse reports"><ArrowRight size={16} /></Link>} />
                {matches.length ? <div className="potential-list">{matches.map((match, index) => <PotentialMatch key={`${reportId(match.source)}-${reportId(match.report)}-${index}`} match={match} onClick={() => navigate(`/matches/${reportId(match.source)}`)} />)}</div> : <div className="quiet-empty"><span className="quiet-empty-icon"><Sparkles size={17} /></span><div><strong>No matches just yet</strong><p>New reports are checked for a possible connection.</p></div></div>}
              </section>
              <section className="panel hotspot-panel"><PanelHeading title="Campus hotspots" subtitle="Most active locations" action={<Link to="/analytics" className="text-link">Analytics <ArrowRight size={13} /></Link>} />
                {topLocations.length ? <ol className="hotspot-list">{topLocations.map((entry, index) => <li key={entry.name}><span className="hotspot-rank">0{index + 1}</span><span className="hotspot-name"><MapPin size={14} />{entry.name}</span><strong>{entry.count}</strong></li>)}</ol> : <p className="muted-copy compact-copy">Location trends will appear as reports come in.</p>}
              </section>
            </div>
          </div>
          <section className="dashboard-cta"><div className="cta-symbol"><HeartHandshake size={19} /></div><div><strong>Someone on campus might be looking for this.</strong><span>Share a found item and help it find its way back.</span></div><Link to="/report/found" className="button button-white button-small">Report found <ArrowRight size={15} /></Link></section>
        </>
      )}
    </div>
  );
}

function PanelHeading({ title, subtitle, action }) {
  return <div className="panel-heading"><div><h2>{title}</h2><p>{subtitle}</p></div>{action}</div>;
}

function ReportRow({ report, onClick }) {
  const isLost = report.type === 'LOST';
  return <button className="report-row" onClick={onClick}><span className={`report-avatar ${isLost ? 'avatar-lost' : 'avatar-found'}`}>{isLost ? <Search size={17} /> : <PackageCheck size={17} />}</span><span className="report-row-main"><strong>{report.itemName}</strong><span>{report.category || 'Other'} <i /> <MapPin size={12} /> {report.location}</span></span><span className={`type-badge ${isLost ? 'badge-lost' : 'badge-found'}`}>{isLost ? 'Lost' : 'Found'}</span><span className={`status-label ${report.status === 'REUNITED' ? 'status-reunited' : ''}`}><span className="status-dot" />{report.status === 'REUNITED' ? 'Reunited' : 'Active'}</span><ArrowRight className="row-arrow" size={16} /></button>;
}

function PotentialMatch({ match, onClick }) {
  const reduceMotion = useReducedMotion();
  const candidate = match.report ?? match;
  const score = Math.round(Number(match.score ?? 0) * 100);
  return <motion.button className="potential-match" onClick={onClick} whileHover={reduceMotion ? undefined : { y: -3, rotateY: -1 }} transition={{ type: 'spring', stiffness: 280, damping: 22 }}><span className="match-thumb"><HeartHandshake size={17} /></span><span className="potential-copy"><strong>{candidate.itemName}</strong><small><MapPin size={12} /> {candidate.location || 'Campus'} <i /> {candidate.category || 'Item'}</small></span><span className="score-pill">{score}%</span></motion.button>;
}

const categoryOptions = ['Accessories', 'Bags', 'Books', 'Clothing', 'Electronics', 'Keys', 'Other', 'Wallets'];
const locationOptions = ['Library', 'Student Center', 'Cafeteria', 'Main Hall', 'Gymnasium', 'Parking Lot', 'Computer Lab'];

function ReportFormPage() {
  const { type = 'lost' } = useParams();
  const isFound = type.toLowerCase() === 'found';
  const notify = useToast();
  const navigate = useNavigate();
  const [form, setForm] = useState({ itemName: '', category: '', color: '', brand: '', location: '', date: today(), time: '', description: '' });
  const [customLocation, setCustomLocation] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [imageName, setImageName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const update = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  const onImage = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { setError('Choose an image file to preview.'); return; }
    if (file.size > 5 * 1024 * 1024) { setError('Choose an image under 5 MB.'); return; }
    setError('');
    if (imageUrl) URL.revokeObjectURL(imageUrl);
    setImageUrl(URL.createObjectURL(file));
    setImageName(file.name);
  };
  useEffect(() => () => { if (imageUrl) URL.revokeObjectURL(imageUrl); }, [imageUrl]);

  const submit = async (event) => {
    event.preventDefault();
    const location = form.location === 'Other' ? customLocation.trim() : form.location;
    if (!form.itemName.trim() || !form.category || !form.color.trim() || !location || !form.date || !form.time || !form.description.trim()) {
      setError('Please complete all required fields before continuing.');
      return;
    }
    setSubmitting(true); setError('');
    try {
      const created = await reportApi.create(isFound ? 'FOUND' : 'LOST', {
        ...form, itemName: form.itemName.trim(), color: form.color.trim(), brand: form.brand.trim(),
        location, description: form.description.trim(),
      });
      notify(`${form.itemName.trim()} was ${isFound ? 'reported found' : 'reported lost'}. Checking for matches…`);
      if (created?._id || created?.id) navigate(`/matches/${reportId(created)}`);
      else navigate('/dashboard');
    } catch (err) { setError(getErrorMessage(err)); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="page-wrap form-page">
      <div className="form-back"><Link to="/dashboard"><ArrowRight size={14} /> Back to dashboard</Link><span className="form-step"><span>01</span> / 01</span></div>
      <div className="form-intro"><span className={`form-icon ${isFound ? 'found-icon' : ''}`}>{isFound ? <PackageCheck size={22} /> : <Search size={22} />}</span><p className="eyebrow">{isFound ? 'A kind thing to do' : 'Let’s get it back to you'}</p><h1>{isFound ? 'Report a found item' : 'Report a lost item'}</h1><p>{isFound ? 'A few details can help this find its way home.' : 'Tell us a little about it. We’ll look for a possible match.'}</p></div>
      <form className="form-card" onSubmit={submit} noValidate>
        <div className="form-section-title"><span>01</span><div><h2>About the item</h2><p>Start with the details someone would recognize.</p></div></div>
        <div className="form-grid">
          <label className="field field-wide"><span>Item name <b>*</b></span><input name="itemName" value={form.itemName} onChange={update} placeholder="e.g. Grey hoodie" maxLength="100" required /><small>Be specific — “Grey hoodie” works better than “Clothing”.</small></label>
          <label className="field"><span>Category <b>*</b></span><select name="category" value={form.category} onChange={update} required><option value="">Choose a category</option>{categoryOptions.map((option) => <option key={option}>{option}</option>)}</select></label>
          <label className="field"><span>Color <b>*</b></span><input name="color" value={form.color} onChange={update} placeholder="e.g. Charcoal grey" maxLength="60" required /></label>
          <label className="field field-wide"><span>Brand <em>Optional</em></span><input name="brand" value={form.brand} onChange={update} placeholder="e.g. Nike, Apple, or not sure" maxLength="80" /></label>
        </div>
        <div className="form-divider" />
        <div className="form-section-title"><span>02</span><div><h2>{isFound ? 'Where you found it' : 'Last seen on campus'}</h2><p>A place and time help narrow down the search.</p></div></div>
        <div className="form-grid">
          <label className="field"><span>Location <b>*</b></span><select name="location" value={form.location} onChange={update} required><option value="">Select a location</option>{locationOptions.map((option) => <option key={option}>{option}</option>)}<option>Other</option></select></label>
          {form.location === 'Other' && <label className="field"><span>Enter location <b>*</b></span><input value={customLocation} onChange={(event) => setCustomLocation(event.target.value)} placeholder="Building or campus spot" maxLength="100" required /></label>}
          <label className="field"><span>Date <b>*</b></span><input type="date" name="date" value={form.date} onChange={update} required /></label>
          <label className="field"><span>Approximate time <b>*</b></span><input type="time" name="time" value={form.time} onChange={update} required /></label>
          <label className="field field-wide"><span>Description <b>*</b></span><textarea name="description" value={form.description} onChange={update} placeholder="Any details that might help identify it? Stickers, wear, what was inside…" rows="4" maxLength="1000" required /><small>{form.description.length}/1000 characters</small></label>
        </div>
        <div className="form-divider" />
        <div className="form-section-title"><span>03</span><div><h2>Add a photo</h2><p>A picture can make an item easier to recognize.</p></div></div>
        <label className={`image-upload ${imageUrl ? 'has-image' : ''}`} htmlFor="item-photo">
          {imageUrl ? <><img src={imageUrl} alt="Preview of selected item" /><span className="image-overlay"><UploadCloud size={18} /> Choose a different photo</span></> : <><span className="upload-icon"><ImagePlus size={21} /></span><strong>Choose a photo to preview</strong><small>PNG or JPG · max 5 MB</small></>}
          <input id="item-photo" type="file" accept="image/*" onChange={onImage} />
        </label>
        <p className="image-note">{imageName ? `${imageName} · Preview only; photos are not uploaded by the current API.` : 'Photo preview only. The current API does not store image uploads.'}</p>
        {error && <div className="inline-error" role="alert"><X size={16} />{error}</div>}
        <div className="form-submit"><span><ShieldCheck size={16} /> Your report is shared with the campus community.</span><button disabled={submitting} className="button button-primary button-large" type="submit">{submitting ? <><span className="button-spinner" /> Submitting…</> : <>{isFound ? 'Submit found report' : 'Submit lost report'} <ArrowRight size={17} /></>}</button></div>
      </form>
    </div>
  );
}

function ReportsPage() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({ q: '', type: '', status: '', category: '', location: '' });
  const [showFilters, setShowFilters] = useState(true);
  const navigate = useNavigate();
  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const params = { limit: 100 };
      ['q', 'type', 'status', 'category'].forEach((key) => { if (filters[key]) params[key] = filters[key]; });
      const result = await reportApi.list(params);
      setReports(result.reports);
    } catch (err) { setError(getErrorMessage(err)); }
    finally { setLoading(false); }
  }, [filters.q, filters.type, filters.status, filters.category]);
  useEffect(() => { const timer = window.setTimeout(load, 250); return () => window.clearTimeout(timer); }, [load]);
  const filtered = reports.filter((report) => !filters.location || report.location === filters.location);
  const availableLocations = [...new Set(reports.map((report) => report.location).filter(Boolean))].sort();
  const setFilter = (key, value) => setFilters((current) => ({ ...current, [key]: value }));
  const clearFilters = () => setFilters({ q: '', type: '', status: '', category: '', location: '' });

  return (
    <div className="page-wrap">
      <PageHeading eyebrow="Community board" title="Browse reports" description="Search what’s been lost or found around campus." action={<Link to="/report/lost" className="button button-primary"><Plus size={16} /> Create a report</Link>} />
      <div className="search-bar"><Search size={19} /><input value={filters.q} onChange={(event) => setFilter('q', event.target.value)} placeholder="Search an item, color, or detail…" aria-label="Search reports" />{filters.q && <button onClick={() => setFilter('q', '')} aria-label="Clear search"><X size={16} /></button>}<span className="search-shortcut">↵</span></div>
      <section className="filters-panel">
        <div className="filter-toolbar"><div><Filter size={16} /><strong>Filter reports</strong><span className="filter-count">{Object.values(filters).filter(Boolean).length || 'All'}</span></div><button className="text-button" onClick={() => setShowFilters(!showFilters)}>{showFilters ? 'Hide filters' : 'Show filters'} <ChevronDown className={showFilters ? 'rotated' : ''} size={15} /></button></div>
        {showFilters && <div className="filter-controls">
          <label className="filter-field"><span>Type</span><select value={filters.type} onChange={(event) => setFilter('type', event.target.value)}><option value="">Lost &amp; found</option><option value="LOST">Lost</option><option value="FOUND">Found</option></select></label>
          <label className="filter-field"><span>Category</span><select value={filters.category} onChange={(event) => setFilter('category', event.target.value)}><option value="">All categories</option>{categoryOptions.map((item) => <option key={item}>{item}</option>)}</select></label>
          <label className="filter-field"><span>Location</span><select value={filters.location} onChange={(event) => setFilter('location', event.target.value)}><option value="">All locations</option>{availableLocations.map((item) => <option key={item}>{item}</option>)}</select></label>
          <label className="filter-field"><span>Status</span><select value={filters.status} onChange={(event) => setFilter('status', event.target.value)}><option value="">Any status</option><option value="ACTIVE">Active</option><option value="REUNITED">Reunited</option></select></label>
          <button className="clear-filters" onClick={clearFilters}>Clear all</button>
        </div>}
      </section>
      <div className="results-toolbar"><span>{loading ? 'Updating reports…' : <><strong>{filtered.length}</strong> {filtered.length === 1 ? 'report' : 'reports'}{Object.values(filters).some(Boolean) ? ' found' : ' on campus'}</>}</span><button onClick={load} className="icon-button" aria-label="Refresh reports"><TrendingUp size={17} /></button></div>
      {error ? <ErrorState message={error} onRetry={load} /> : loading ? <LoadingState label="Finding campus reports…" /> : filtered.length ? <div className="reports-grid">{filtered.map((report) => <ReportCard key={reportId(report)} report={report} onClick={() => navigate(`/reports/${reportId(report)}`)} />)}</div> : <EmptyState title="No reports match those filters" description="Try a different search or clear some filters." action={<button onClick={clearFilters} className="button button-outline">Clear filters</button>} />}
    </div>
  );
}

function ReportCard({ report, onClick }) {
  const reduceMotion = useReducedMotion();
  const isLost = report.type === 'LOST';
  return <motion.article className="report-card" initial={reduceMotion ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} whileHover={reduceMotion ? undefined : { y: -4, rotateX: 1.5 }} transition={{ type: 'spring', stiffness: 240, damping: 22 }} style={{ transformPerspective: 900 }}><div className={`card-art ${isLost ? 'card-art-lost' : 'card-art-found'}`}><span className={`type-badge ${isLost ? 'badge-lost' : 'badge-found'}`}>{isLost ? 'Lost item' : 'Found item'}</span><span className="card-art-icon">{isLost ? <Search size={25} /> : <PackageCheck size={25} />}</span><span className={`card-status ${report.status === 'REUNITED' ? 'status-reunited' : ''}`}><span className="status-dot" />{report.status === 'REUNITED' ? 'Reunited' : 'Active'}</span></div><div className="report-card-content"><span className="card-category">{report.category || 'Other'}{report.color ? ` · ${report.color}` : ''}</span><h3>{report.itemName}</h3><p className="card-description">{report.description || 'No description provided.'}</p><div className="card-meta"><span><MapPin size={14} />{report.location}</span><span><Clock3 size={14} />{displayDate(report.date, report.time)}</span></div><button className="card-link" onClick={onClick}>View details <ArrowRight size={15} /></button></div></motion.article>;
}

function MatchesPage() {
  const { id } = useParams();
  const notify = useToast();
  const reduceMotion = useReducedMotion();
  const [source, setSource] = useState(null);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updating, setUpdating] = useState('');
  const [loaded, setLoaded] = useState(false);
  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const item = await reportApi.get(id);
      setSource(item);
      setMatches(item?.status === 'ACTIVE' ? await reportApi.matches(id) : []);
      setLoaded(true);
    } catch (err) { setError(getErrorMessage(err)); }
    finally { setLoading(false); }
  }, [id]);
  useEffect(() => { load(); }, [load]);
  const markReunited = async (match) => {
    const candidate = match.report ?? match;
    const sourceId = reportId(source);
    const candidateId = reportId(candidate);
    if (!sourceId || !candidateId) { notify('This report does not include the IDs needed to update its status.', 'error'); return; }
    setUpdating(candidateId);
    try {
      await Promise.all([reportApi.setStatus(sourceId, 'REUNITED'), reportApi.setStatus(candidateId, 'REUNITED')]);
      notify('Wonderful — both reports are marked reunited.');
      await load();
    } catch (err) { notify(getErrorMessage(err), 'error'); }
    finally { setUpdating(''); }
  };
  const reasons = (candidate) => {
    const same = (left, right) => left && right && String(left).trim().toLowerCase() === String(right).trim().toLowerCase();
    const result = [];
    if (same(source?.itemName, candidate?.itemName)) result.push(`Same item name: ${source.itemName}`);
    if (same(source?.category, candidate?.category)) result.push(`Same category: ${source.category}`);
    if (same(source?.color, candidate?.color)) result.push(`Same color: ${source.color}`);
    if (same(source?.location, candidate?.location)) result.push(`Same location: ${source.location}`);
    return result;
  };
  const sourceIsLost = source?.type === 'LOST';

  return <div className="page-wrap">
    <div className="form-back"><Link to="/reports"><ArrowRight size={14} /> Back to reports</Link><Link to="/dashboard">Dashboard</Link></div>
    {error ? <ErrorState message={error} onRetry={load} /> : loading ? <LoadingState label="Looking for a possible match…" /> : source ? <>
      <div className="matches-heading"><span className={`form-icon ${sourceIsLost ? '' : 'found-icon'}`}>{sourceIsLost ? <Search size={22} /> : <PackageCheck size={22} />}</span><p className="eyebrow">{source.status === 'REUNITED' ? 'A lovely ending' : 'A little bit of hope'}</p><h1>{source.status === 'REUNITED' ? 'This item was reunited' : 'Here’s what we found'}</h1><p>{source.status === 'REUNITED' ? 'Thanks for helping make this reunion happen.' : <>We checked the community reports for a possible match to <strong>{source.itemName}</strong>.</>}</p></div>
      <div className="match-source-card"><div className="source-icon"><PackageCheck size={20} /></div><div><span className="card-category">Your {source.type.toLowerCase()} report</span><h2>{source.itemName}</h2><p><MapPin size={14} /> {source.location} <i /> {displayDate(source.date, source.time)}</p></div><span className={`type-badge ${sourceIsLost ? 'badge-lost' : 'badge-found'}`}>{sourceIsLost ? 'Lost' : 'Found'}</span></div>
      {source.status === 'REUNITED' ? <EmptyState title="The story has a happy ending" description="This report is marked as reunited and won’t appear in active matches." action={<Link to="/dashboard" className="text-link">Back to dashboard <ArrowRight size={14} /></Link>} /> : matches.length ? <section className="matches-results"><div className="matches-section-heading"><div><h2>Possible matches <span>{matches.length}</span></h2><p>Ranked by the matching service, closest first.</p></div><span className="live-indicator"><span className="online-dot" /> Live results</span></div>
        <div className="match-cards">{matches.map((match, index) => {
          const candidate = match.report ?? match;
          const score = Math.round(Number(match.score ?? 0) * 100);
          const imageUrl = candidate.imageUrl ?? candidate.image ?? candidate.photoUrl ?? candidate.photo;
          const why = reasons(candidate);
          return <motion.article className="match-result-card" key={reportId(candidate) || index} initial={reduceMotion ? false : { opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} whileHover={reduceMotion ? undefined : { y: -5, rotateX: 1.5 }} transition={{ type: 'spring', stiffness: 220, damping: 22, delay: index * 0.05 }} style={{ transformPerspective: 900 }}>
            <div className="match-result-top"><span className="match-item-symbol">{imageUrl ? <img src={imageUrl} alt={`${candidate.itemName} item`} /> : <HeartHandshake size={21} />}</span><span className="match-confidence"><strong>{score}%</strong><small>match</small><span className="score-meter"><motion.i initial={reduceMotion ? false : { scaleX: 0 }} animate={{ scaleX: Math.max(0, Math.min(100, score)) / 100 }} transition={{ duration: reduceMotion ? 0 : 0.7, delay: reduceMotion ? 0 : index * 0.06, ease: 'easeOut' }} /></span></span></div>
            <span className="card-category">{candidate.type === 'FOUND' ? 'Found item' : 'Lost item'}{candidate.category ? ` · ${candidate.category}` : ''}</span><h3>{candidate.itemName}</h3><p className="match-description">{candidate.description || 'No additional description.'}</p>
            <div className="match-details"><span><MapPin size={14} />{candidate.location || 'Location not listed'}</span><span><Clock3 size={14} />{displayDate(candidate.date, candidate.time)}</span>{candidate.color && <span><span className="color-dot" />{candidate.color}</span>}</div>
            <div className="reasons-block"><strong><Sparkles size={14} /> Why it might match</strong>{why.length ? <div className="reason-tags">{why.map((reason) => <span key={reason}><Check size={12} />{reason}</span>)}</div> : <p>The matching service identified this as a possible match based on the report details.</p>}</div>
            <button className="button button-primary reunion-button" onClick={() => markReunited(match)} disabled={Boolean(updating)}>{updating === reportId(candidate) ? <><span className="button-spinner" /> Updating…</> : <><HeartHandshake size={16} /> Mark reunited</>}</button>
          </motion.article>;
        })}</div>
      </section> : loaded ? <EmptyState title="No matches yet" description="We couldn’t find an active report that matches. We’ll keep your report on the board so the community can help." action={<Link to="/reports" className="button button-outline">Browse all reports</Link>} /> : null}
    </> : null}
  </div>;
}

function AnalyticsPage() {
  const reduceMotion = useReducedMotion();
  const [overview, setOverview] = useState(null);
  const [hotspots, setHotspots] = useState([]);
  const [itemData, setItemData] = useState([]);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [metrics, places, items, list] = await Promise.all([
        analyticsApi.overview(), analyticsApi.hotspots(), analyticsApi.items(), reportApi.list({ limit: 1000 }),
      ]);
      setOverview(metrics);
      setHotspots(asRows(places, ['hotspots', 'locations', 'topLocations', 'data']));
      setItemData(asRows(items, ['items', 'topItems', 'topLostItems', 'mostLostItems', 'categories', 'data']));
      setReports(list.reports);
    } catch (err) { setError(getErrorMessage(err)); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);
  const totals = overviewMetrics(overview);
  const chartData = [
    { name: 'Lost', count: totals.lost, fill: '#f29b55' },
    { name: 'Found', count: totals.found, fill: '#4b84f5' },
    { name: 'Reunited', count: totals.reunited, fill: '#41b98a' },
  ];
  const topItems = normalizeRanked(itemData, ['itemName', 'name', 'category', 'item', '_id'], ['count', 'total', 'reports', 'lostCount', 'totalReports']).slice(0, 3);
  const topSpots = normalizeRanked(hotspots, ['location', 'name', 'place', '_id'], ['count', 'total', 'reports', 'reportCount', 'totalReports']).slice(0, 3);
  const reunitedRate = totals.total ? Math.round((totals.reunited / totals.total) * 100) : 0;
  const missingMetrics = overview == null;

  return <div className="page-wrap">
    <PageHeading eyebrow="Campus pulse" title="The bigger picture." description="Real-time insights from reports shared by your community." action={<button className="button button-outline" onClick={load}><TrendingUp size={16} /> Refresh analytics</button>} />
    {error ? <ErrorState message={error} onRetry={load} /> : loading ? <LoadingState label="Gathering campus insights…" /> : <>
      <div className="analytics-stats">
        <Stat number={totals.total} label="Total reports" icon={FileSearch} tone="blue" compact />
        <Stat number={totals.active} label="Active reports" icon={Compass} tone="purple" compact />
        <Stat number={`${reunitedRate}%`} label="Reunion rate" icon={HeartHandshake} tone="green" compact />
        <div className="analytics-period"><span className="period-icon"><TrendingUp size={17} /></span><span><strong>Community powered</strong><small>Based on live campus reports</small></span></div>
      </div>
      <div className="analytics-grid">
        <section className="panel chart-panel"><PanelHeading title="Lost vs. found" subtitle="Report totals from the campus community" />{missingMetrics ? <EmptyState title="Analytics are warming up" description="Overview data will appear when the API returns report totals." /> : <><div className="chart-area"><Suspense fallback={<LoadingState label="Loading chart…" />}><AnalyticsCharts variant="trend" chartData={chartData} reduceMotion={reduceMotion} /></Suspense></div><div className="chart-legend">{chartData.map((item) => <span key={item.name}><i style={{ backgroundColor: item.fill }} />{item.name}<strong>{item.count}</strong></span>)}</div></>}</section>
        <section className="panel reunited-panel"><PanelHeading title="Reunited with care" subtitle="Every reunion starts with a report" /><div className="reunited-content"><div className="reunited-chart"><Suspense fallback={<span className="chart-loading" />}><AnalyticsCharts variant="reunited" totals={totals} reduceMotion={reduceMotion} /></Suspense><div className="chart-center"><strong>{reunitedRate}%</strong><small>reunited</small></div></div><div className="reunited-total"><strong>{totals.reunited.toLocaleString()}</strong><span>items found their way home</span><div className="reunited-trend"><HeartHandshake size={14} /> Campus-wide impact</div></div></div></section>
      </div>
      <div className="ranking-grid">
        <section className="panel ranking-panel"><PanelHeading title="Most reported items" subtitle="Top 3 from item analytics" action={<span className="ranking-icon item-rank-icon"><PackageCheck size={16} /></span>} />{topItems.length ? <ol className="rank-list">{topItems.map((item, index) => <li key={`${item.name}-${index}`}><span className={`rank-number rank-${index + 1}`}>0{index + 1}</span><span className="rank-label">{item.name}</span><span className="rank-track"><i style={{ width: `${Math.max(14, (item.count / Math.max(topItems[0].count, 1)) * 100)}%` }} /></span><strong>{item.count}</strong></li>)}</ol> : <p className="muted-copy compact-copy">Item trends will appear when analytics data is available.</p>}</section>
        <section className="panel ranking-panel"><PanelHeading title="Campus hotspots" subtitle="Locations with the most activity" action={<span className="ranking-icon map-rank-icon"><MapPin size={16} /></span>} />{topSpots.length ? <ol className="rank-list">{topSpots.map((item, index) => <li key={`${item.name}-${index}`}><span className={`rank-number rank-${index + 1}`}>0{index + 1}</span><span className="rank-label">{item.name}</span><span className="rank-track"><i style={{ width: `${Math.max(14, (item.count / Math.max(topSpots[0].count, 1)) * 100)}%` }} /></span><strong>{item.count}</strong></li>)}</ol> : <p className="muted-copy compact-copy">Location trends will appear when analytics data is available.</p>}</section>
      </div>
      <p className="analytics-footnote"><ShieldCheck size={15} /> Analytics are calculated from reports in the LOFO service. {reports.length ? `Currently showing ${reports.length} loaded report records.` : ''}</p>
    </>}
  </div>;
}

function normalizeRanked(rows, names, countKeys) {
  return rows.map((row) => {
    const name = names.map((key) => row?.[key]).find((value) => typeof value === 'string' && value.trim());
    const count = countKeys.map((key) => Number(row?.[key])).find(Number.isFinite);
    return name ? { name, count: count ?? 0 } : null;
  }).filter(Boolean).sort((a, b) => b.count - a.count);
}

function NotFound() {
  return <div className="not-found"><span className="not-found-icon"><Compass size={26} /></span><p className="eyebrow">A wrong turn</p><h1>This page isn’t here.</h1><p>Let’s get you back to the community board.</p><Link className="button button-primary" to="/dashboard">Go to dashboard <ArrowRight size={15} /></Link></div>;
}

export default App;
