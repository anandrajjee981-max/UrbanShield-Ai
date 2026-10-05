import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Bot,
  Briefcase,
  ClipboardCheck,
  CloudSun,
  Eye,
  FileText,
  Map,
  MapPin,
  Moon,
  ShieldCheck,
  Siren,
  Sun,
  Umbrella,
  Users,
} from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { toggleTheme } from '../store/slices/uiSlice';
import { homeForRole } from '../utils/roleHome';
import { useGsapEntrance } from '../hooks/useGsapEntrance';
import { useWeather } from '../hooks/useWeather';
import WeatherIcon from '../components/weather/WeatherIcon';
import { assessWeatherRisk, type RiskLevel } from '../components/weather/weatherRiskConfig';

// ---------------------------------------------------------------------------
// Small shared pieces (all styling reuses the existing UrbanShieldAI tokens:
// bg-canvas / bg-cream / bg-card / border-line / text-ink / text-soft /
// text-mute / bg-brand — so light + dark themes keep working).
// ---------------------------------------------------------------------------

const riskBadge: Record<RiskLevel, string> = {
  Low: 'bg-civic-green/10 text-civic-green border-civic-green/30',
  Moderate: 'bg-civic-amber/15 text-civic-amber-dark border-civic-amber/40',
  High: 'bg-brand/10 text-brand border-brand/30',
};

function SectionHeading({
  eyebrow,
  title,
  desc,
}: {
  eyebrow: string;
  title: string;
  desc?: string;
}) {
  return (
    <div className="gs-in max-w-2xl">
      <p className="text-xs font-extrabold uppercase tracking-widest text-brand">{eyebrow}</p>
      <h2 className="text-2xl md:text-3xl font-extrabold mt-2 leading-tight">{title}</h2>
      {desc && <p className="text-sm md:text-base text-soft mt-3 leading-relaxed">{desc}</p>}
    </div>
  );
}

function FeatureCard({
  icon: Icon,
  color,
  title,
  desc,
  action,
  onClick,
}: {
  icon: typeof Map;
  color: string;
  title: string;
  desc: string;
  action: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={action}
      className="gs-in group bg-card border border-line rounded-2xl p-5 shadow-sm text-left transition-all duration-200 hover:-translate-y-1 hover:shadow-lg hover:border-brand focus-visible:ring-2 focus-visible:ring-brand/40"
    >
      <div
        className="w-11 h-11 rounded-xl flex items-center justify-center text-white"
        style={{ background: color }}
      >
        <Icon size={20} />
      </div>
      <p className="font-bold mt-3 flex items-center justify-between gap-2">
        {title}
        <ArrowRight
          size={16}
          className="text-mute transition-transform duration-200 group-hover:translate-x-1 group-hover:text-brand"
        />
      </p>
      <p className="text-sm text-soft mt-1 leading-relaxed">{desc}</p>
      <p className="text-xs font-bold text-brand mt-3">{action}</p>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Page data
// ---------------------------------------------------------------------------

const whyCards = [
  {
    icon: CloudSun,
    color: '#4482ea',
    title: 'Weather Risk',
    desc: 'Heavy rain, extreme heat and changing weather conditions can turn local vulnerabilities into emergencies.',
  },
  {
    icon: MapPin,
    color: '#51933a',
    title: 'Citizen Signals',
    desc: 'People on the ground see problems first. Capture incidents with photos, locations and real-world reports.',
  },
  {
    icon: Siren,
    color: '#f84424',
    title: 'Response Gaps',
    desc: 'When information is scattered, important problems can be missed or addressed too late.',
  },
];

const platformCards = [
  {
    icon: Map,
    color: '#4482ea',
    to: '/map',
    title: 'See Your City',
    desc: 'Visualize incidents, vulnerable areas, weather conditions and emerging risks on one interactive city map.',
  },
  {
    icon: Users,
    color: '#51933a',
    to: '/reports',
    title: 'Hear From Citizens',
    desc: 'Citizens can report potholes, flooding, broken infrastructure and other hazards with photos and location.',
  },
  {
    icon: Bot,
    color: '#965d13',
    to: '/ai',
    title: 'Predict the Risk',
    desc: 'AI combines environmental and city signals to identify patterns, prioritize risks and support faster decisions.',
  },
];

const flowSteps = [
  { icon: CloudSun, title: 'Weather Data', desc: 'Live forecasts flag heat, rain and wind risks.' },
  { icon: Map, title: 'Location Intelligence', desc: 'Every signal is pinned to an exact place.' },
  { icon: FileText, title: 'Citizen Reports', desc: 'Ground truth arrives with photos and GPS.' },
  { icon: Bot, title: 'AI Risk Analysis', desc: 'Patterns become prioritized risk levels.' },
  { icon: Briefcase, title: 'Authority Response', desc: 'The right team gets a clear, ranked alert.' },
  { icon: ShieldCheck, title: 'Safer City', desc: 'Help reaches the right place, faster.' },
];

const storyTimeline = [
  { time: '08:15 AM', text: 'Heavy rainfall detected' },
  { time: '08:27 AM', text: 'Multiple citizen reports appear in the same area' },
  { time: '08:31 AM', text: 'AI identifies a potential flood-risk zone' },
  { time: '08:36 AM', text: 'Authority receives a prioritized alert' },
  { time: '08:50 AM', text: 'Response team is dispatched' },
];

const reportTopics = [
  'Potholes',
  'Waterlogging',
  'Broken streetlights',
  'Garbage',
  'Water leakage',
  'Infrastructure damage',
  'Public safety issues',
];

const citizenFlow = [
  { icon: Eye, title: 'Take a Photo', desc: 'Capture what you see.' },
  { icon: MapPin, title: 'Share Location', desc: 'Pin it on the city map.' },
  { icon: FileText, title: 'Submit Report', desc: 'Describe the problem.' },
  { icon: ClipboardCheck, title: 'Track Response', desc: 'Follow it to resolution.' },
];

// Illustrative preview — static mock rows, clearly labelled as such (the real
// dashboard data comes from the backend APIs once logged in).
const authorityRisks = [
  { label: 'Flood Risk', level: 'HIGH' as RiskLevel },
  { label: 'Heat Risk', level: 'MODERATE' as RiskLevel },
  { label: 'Infrastructure', level: 'HIGH' as RiskLevel },
  { label: 'Air Quality', level: 'LOW' as RiskLevel },
];

const authorityIncidents = [
  { title: 'Waterlogging near Market Rd', location: 'Ward 7 · 0.8 km', risk: 'High' as RiskLevel, status: 'Assigned' },
  { title: 'Fallen power line', location: 'Lake View Jn · 2.1 km', risk: 'High' as RiskLevel, status: 'In progress' },
  { title: 'Overflowing drain', location: 'Old Fort Ln · 3.4 km', risk: 'Moderate' as RiskLevel, status: 'Verified' },
];

// ---------------------------------------------------------------------------
// Home
// ---------------------------------------------------------------------------

export default function Home() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const isAuthenticated = useAppSelector((s) => s.auth.isAuthenticated);
  const role = useAppSelector((s) => s.auth.user?.role ?? 'CITIZEN');
  const theme = useAppSelector((s) => s.ui.theme);
  useGsapEntrance('.gs-in', []);

  // Single shared weather subscription (Redux-cached — no repeated API calls).
  const { location, forecast, loading: weatherLoading, error: weatherError } = useWeather();
  const today = forecast.length > 0 ? forecast[forecast.length - 1]! : null;
  const todayRisks = today ? assessWeatherRisk(today) : null;

  const goDashboard = () => {
    if (isAuthenticated) navigate(homeForRole(role));
    else navigate('/login', { state: { from: homeForRole(role) } });
  };

  const goReport = () => {
    if (isAuthenticated) navigate('/reports');
    else navigate('/login', { state: { from: '/reports' } });
  };

  const openFeature = (to: string, isPublic = false) => {
    if (isPublic || isAuthenticated) navigate(to);
    else navigate('/login', { state: { from: to } });
  };

  return (
    <div className="min-h-screen bg-canvas text-ink">
      {/* ── Navbar (existing structure, clearer links) ── */}
      <header className="flex items-center justify-between gap-2 px-3 sm:px-5 md:px-10 h-16 border-b border-line bg-cream sticky top-0 z-10">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="flex items-center gap-2 min-w-0"
          title="UrbanShieldAI home"
        >
          <ShieldCheck size={26} className="text-brand shrink-0" />
          <span className="min-w-0 text-left">
            <span className="block font-extrabold leading-none truncate">UrbanShieldAI</span>
            <span className="block text-[11px] text-mute">City Resilience</span>
          </span>
        </button>
        <nav aria-label="Primary" className="flex items-center gap-1 sm:gap-2 shrink-0">
          <a
            href="#about"
            className="hidden md:inline-block text-sm font-bold px-3 py-2.5 rounded-xl hover:text-brand"
          >
            About
          </a>
          <button
            type="button"
            onClick={() => navigate('/weather')}
            className="hidden sm:inline-block text-sm font-bold px-3 py-2.5 rounded-xl hover:text-brand"
          >
            Weather
          </button>
          <button
            type="button"
            onClick={goDashboard}
            className="hidden sm:inline-block text-sm font-bold px-3 py-2.5 rounded-xl hover:text-brand"
          >
            Dashboard
          </button>
          <button
            type="button"
            onClick={() => dispatch(toggleTheme())}
            title={theme === 'light' ? 'Switch to dark theme' : 'Switch to light theme'}
            aria-label={theme === 'light' ? 'Switch to dark theme' : 'Switch to light theme'}
            className="p-2.5 rounded-xl border border-line bg-card hover:border-brand"
          >
            {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
          </button>
          {isAuthenticated ? (
            <button
              type="button"
              onClick={goDashboard}
              className="text-sm font-bold px-4 py-2.5 rounded-xl bg-brand text-white hover:bg-brand-warm"
            >
              Open Dashboard
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="text-sm font-bold px-4 py-2.5 rounded-xl border border-line bg-card hover:border-brand"
              >
                Login
              </button>
              <button
                type="button"
                onClick={() => navigate('/register')}
                className="text-sm font-bold px-4 py-2.5 rounded-xl bg-brand text-white hover:bg-brand-warm"
              >
                Register
              </button>
            </>
          )}
        </nav>
      </header>

      <main>
        {/* ── 1. HERO ── */}
        <section className="px-5 md:px-10 pt-10 md:pt-16 pb-8 max-w-6xl mx-auto grid lg:grid-cols-2 gap-8 items-center">
          <div className="gs-in">
            <span className="inline-flex items-center gap-1.5 text-xs font-extrabold px-3 py-1.5 rounded-full bg-brand-soft text-brand border border-brand/20">
              <ShieldCheck size={14} /> AI-POWERED CITY RESILIENCE
            </span>
            <h1 className="text-4xl md:text-5xl font-extrabold mt-4 leading-[1.1] tracking-tight">
              See the risk.
              <br />
              <span className="text-brand">Act before it becomes a crisis.</span>
            </h1>
            <p className="text-sm md:text-base text-soft mt-4 leading-relaxed max-w-xl">
              UrbanShieldAI connects weather intelligence, citizen reports, location data and
              AI-powered risk analysis to help cities detect problems earlier and respond faster.
            </p>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mt-6">
              <button
                type="button"
                onClick={goDashboard}
                className="inline-flex items-center justify-center gap-2 font-bold text-sm px-6 py-3.5 rounded-xl bg-brand text-white hover:bg-brand-warm transition-all duration-150 hover:-translate-y-0.5"
              >
                Explore City Dashboard <ArrowRight size={16} />
              </button>
              <button
                type="button"
                onClick={goReport}
                className="inline-flex items-center justify-center gap-2 font-bold text-sm px-6 py-3.5 rounded-xl border border-line bg-card hover:border-brand transition-all duration-150 hover:-translate-y-0.5"
              >
                Report an Issue
              </button>
            </div>
            <p className="text-xs text-mute mt-4 font-semibold">
              One platform. One clearer picture. A safer city.
            </p>
          </div>

          {/* Hero side panel — live weather + risk snapshot (real API data). */}
          <div className="gs-in bg-card border border-line rounded-3xl p-5 md:p-6 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-extrabold uppercase tracking-widest text-mute">
                City pulse · Live
              </p>
              <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-civic-green">
                <span className="w-2 h-2 rounded-full bg-civic-green animate-pulse" /> Live
              </span>
            </div>
            <div className="flex items-center gap-4 mt-4">
              {today ? (
                <WeatherIcon icon={today.icon} condition={today.condition} size={72} />
              ) : (
                <div className="h-[72px] w-[72px] rounded-full bg-canvas border border-line animate-pulse shrink-0" />
              )}
              <div className="min-w-0">
                {weatherLoading && !today ? (
                  <div className="h-8 w-28 rounded bg-line animate-pulse" />
                ) : today ? (
                  <>
                    <p className="text-4xl font-extrabold leading-none">
                      {Math.round(today.temperature)}°C
                    </p>
                    <p className="text-xs font-semibold text-soft mt-1.5">
                      {today.condition} · Rain {today.rainChance}%
                    </p>
                  </>
                ) : (
                  <p className="text-sm font-bold text-soft">{weatherError ?? 'Weather unavailable'}</p>
                )}
                <p className="text-[11px] font-bold text-mute mt-1 flex items-center gap-1">
                  <MapPin size={12} />
                  {location
                    ? `${location.city}${location.country ? `, ${location.country}` : ''}`
                    : 'Locating…'}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 mt-5">
              {[
                { label: 'Heat', value: todayRisks?.heat ?? '–' },
                { label: 'Rain', value: todayRisks?.rain ?? '–' },
                { label: 'Wind', value: todayRisks?.wind ?? '–' },
              ].map((r) => (
                <div
                  key={r.label}
                  className="bg-canvas border border-line rounded-xl px-3 py-2.5 text-center"
                >
                  <p className="text-[11px] font-extrabold text-mute uppercase tracking-wide">
                    {r.label}
                  </p>
                  <p className="text-sm font-extrabold mt-1">{r.value}</p>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => navigate('/weather')}
              className="mt-4 w-full inline-flex items-center justify-center gap-1.5 text-sm font-bold px-4 py-3 rounded-xl bg-brand-soft text-brand border border-brand/20 hover:bg-brand hover:text-white transition-colors"
            >
              View live weather signals <ArrowRight size={15} />
            </button>
            <p className="text-[11px] text-mute mt-3 text-center">
              Live readings from OpenWeatherMap · Risk view is illustrative
            </p>
          </div>
        </section>

        {/* ── 3. WHY THIS MATTERS ── */}
        <section className="px-5 md:px-10 py-10 md:py-14 max-w-6xl mx-auto">
          <SectionHeading
            eyebrow="Why this matters"
            title="A city gives warning signs. The challenge is seeing them early enough."
            desc="Flooding, extreme heat, damaged infrastructure and citizen complaints are often connected. UrbanShieldAI brings these signals together so potential risks can be identified before they become larger emergencies."
          />
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
            {whyCards.map((c) => (
              <article
                key={c.title}
                className="gs-in bg-card border border-line rounded-2xl p-5 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg"
              >
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center text-white"
                  style={{ background: c.color }}
                >
                  <c.icon size={20} />
                </div>
                <h3 className="font-bold mt-3">{c.title}</h3>
                <p className="text-sm text-soft mt-1 leading-relaxed">{c.desc}</p>
              </article>
            ))}
          </div>
        </section>

        {/* ── 4. PLATFORM ── */}
        <section className="px-5 md:px-10 py-10 md:py-14 max-w-6xl mx-auto border-t border-line">
          <SectionHeading
            eyebrow="The platform"
            title="From scattered signals to one clear picture."
          />
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
            {platformCards.map((f) => (
              <FeatureCard
                key={f.title}
                icon={f.icon}
                color={f.color}
                title={f.title}
                desc={f.desc}
                action={isAuthenticated ? 'Open now →' : 'Login to open →'}
                onClick={() => openFeature(f.to)}
              />
            ))}
          </div>
        </section>

        {/* ── 5. HOW IT WORKS ── */}
        <section className="px-5 md:px-10 py-10 md:py-14 max-w-6xl mx-auto border-t border-line">
          <SectionHeading
            eyebrow="How it works"
            title="From signal to action."
            desc="UrbanShieldAI doesn't just collect city data. It connects the dots."
          />
          <ol className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-6 list-none p-0 m-0">
            {flowSteps.map((s, i) => (
              <li
                key={s.title}
                className="gs-in relative bg-card border border-line rounded-2xl p-5 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg"
              >
                <span className="absolute top-4 right-4 text-[11px] font-extrabold text-mute">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-brand-soft text-brand">
                  <s.icon size={18} />
                </div>
                <h3 className="font-bold text-sm mt-3">{s.title}</h3>
                <p className="text-xs text-soft mt-1 leading-relaxed">{s.desc}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* ── 6. REAL-WORLD STORY ── */}
        <section className="px-5 md:px-10 py-10 md:py-14 max-w-6xl mx-auto border-t border-line">
          <SectionHeading
            eyebrow="See it in action"
            title="Imagine heavy rain hits the city."
          />
          <div className="gs-in mt-6 bg-panel text-white rounded-3xl p-6 md:p-10">
            <ol className="relative ml-2 border-l-2 border-white/20 space-y-6 list-none pl-0">
              {storyTimeline.map((t) => (
                <li key={t.time} className="relative pl-8">
                  <span className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-tag border-2 border-white/60" />
                  <p className="text-xs font-extrabold tracking-widest text-tag">{t.time}</p>
                  <p className="text-sm md:text-base font-semibold mt-1 text-white/90">{t.text}</p>
                </li>
              ))}
              <li className="relative pl-8">
                <span className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-civic-green border-2 border-white/60" />
                <div className="bg-white/10 border border-white/20 rounded-2xl p-4">
                  <p className="text-sm md:text-base font-extrabold leading-relaxed">
                    A warning became an action before it became a bigger emergency.
                  </p>
                </div>
              </li>
            </ol>
          </div>
        </section>

        {/* ── 7. CITIZEN EXPERIENCE ── */}
        <section className="px-5 md:px-10 py-10 md:py-14 max-w-6xl mx-auto border-t border-line">
          <SectionHeading
            eyebrow="For citizens"
            title="Your city. Your voice."
            desc="See something unsafe? Don't just walk past it. Report potholes, waterlogging, broken streetlights, garbage, water leakage, infrastructure damage and public safety issues — with a photo and a location."
          />
          <div className="flex flex-wrap gap-2 mt-5">
            {reportTopics.map((t) => (
              <span
                key={t}
                className="gs-in text-xs font-bold px-3 py-1.5 rounded-full bg-card border border-line text-soft"
              >
                {t}
              </span>
            ))}
          </div>
          <ol className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-6 list-none p-0 m-0">
            {citizenFlow.map((s, i) => (
              <li
                key={s.title}
                className="gs-in bg-card border border-line rounded-2xl p-4 text-center"
              >
                <div className="w-10 h-10 mx-auto rounded-xl flex items-center justify-center bg-brand-soft text-brand">
                  <s.icon size={18} />
                </div>
                <p className="text-[11px] font-extrabold text-mute mt-2">STEP {i + 1}</p>
                <h3 className="font-bold text-sm">{s.title}</h3>
                <p className="text-xs text-soft mt-0.5">{s.desc}</p>
              </li>
            ))}
          </ol>
          <button
            type="button"
            onClick={goReport}
            className="gs-in mt-6 inline-flex items-center justify-center gap-2 font-bold text-sm px-6 py-3.5 rounded-xl bg-brand text-white hover:bg-brand-warm transition-all duration-150 hover:-translate-y-0.5"
          >
            Report an Issue <ArrowRight size={16} />
          </button>
        </section>

        {/* ── 8. AUTHORITY EXPERIENCE ── */}
        <section className="px-5 md:px-10 py-10 md:py-14 max-w-6xl mx-auto border-t border-line grid lg:grid-cols-2 gap-8 items-center">
          <div>
            <SectionHeading
              eyebrow="For authorities"
              title="From hundreds of reports to the problems that matter most."
              desc="Instead of searching through scattered reports, authorities get prioritized incidents, risk levels and location-based insights."
            />
            <button
              type="button"
              onClick={() => {
                if (isAuthenticated) navigate(homeForRole(role));
                else navigate('/login', { state: { from: '/authority' } });
              }}
              className="gs-in mt-6 inline-flex items-center justify-center gap-2 font-bold text-sm px-6 py-3.5 rounded-xl bg-brand text-white hover:bg-brand-warm transition-all duration-150 hover:-translate-y-0.5"
            >
              Open Authority Dashboard <ArrowRight size={16} />
            </button>
            <p className="text-[11px] text-mute mt-3">Sign-in required — role-based access.</p>
          </div>
          <div
            className="gs-in bg-card border border-line rounded-3xl p-5 shadow-sm"
            role="img"
            aria-label="Illustrative preview of the authority dashboard showing risk levels and priority incidents"
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-extrabold uppercase tracking-widest text-mute">
                Command preview
              </p>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-canvas border border-line text-mute uppercase tracking-wide">
                Illustrative UI
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-4">
              {authorityRisks.map((r) => (
                <div
                  key={r.label}
                  className="flex items-center justify-between gap-2 bg-canvas border border-line rounded-xl px-3 py-2.5"
                >
                  <span className="text-xs font-bold truncate">{r.label}</span>
                  <span
                    className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border shrink-0 ${riskBadge[r.level]}`}
                  >
                    {r.level}
                  </span>
                </div>
              ))}
            </div>
            <div className="space-y-2 mt-3">
              {authorityIncidents.map((inc) => (
                <div
                  key={inc.title}
                  className="flex items-center gap-3 bg-canvas border border-line rounded-xl px-3 py-2.5"
                >
                  <AlertTriangle size={16} className="text-brand shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold truncate">{inc.title}</p>
                    <p className="text-[11px] text-mute flex items-center gap-1">
                      <MapPin size={11} /> {inc.location} · {inc.status}
                    </p>
                  </div>
                  <span
                    className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border shrink-0 ${riskBadge[inc.risk]}`}
                  >
                    {inc.risk}
                  </span>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2 mt-4 text-[11px] font-semibold text-mute">
              <BarChart3 size={14} /> Live ranks, trends and maps inside the real dashboard.
            </div>
          </div>
        </section>

        {/* ── 9. WEATHER INTELLIGENCE (real OpenWeatherMap data via backend) ── */}
        <section className="px-5 md:px-10 py-10 md:py-14 max-w-6xl mx-auto border-t border-line">
          <SectionHeading
            eyebrow="Weather intelligence"
            title="Know what's coming."
            desc="Weather isn't just a forecast. For a resilient city, it's an early warning signal."
          />
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
            {weatherLoading && forecast.length === 0 ? (
              [0, 1, 2].map((i) => (
                <div key={i} className="bg-card border border-line rounded-2xl p-5 shadow-sm">
                  <div className="h-4 w-20 rounded bg-line animate-pulse" />
                  <div className="h-9 w-24 rounded bg-line animate-pulse mt-3" />
                  <div className="h-3 w-32 rounded bg-line animate-pulse mt-2" />
                </div>
              ))
            ) : forecast.length > 0 ? (
              forecast.map((d) => {
                const overall = (() => {
                  const r = assessWeatherRisk(d);
                  const levels = [r.heat, r.rain, r.wind, r.humidity];
                  if (levels.includes('High')) return 'High' as RiskLevel;
                  if (levels.includes('Moderate')) return 'Moderate' as RiskLevel;
                  return 'Low' as RiskLevel;
                })();
                return (
                  <article
                    key={`${d.label}-${d.date}`}
                    className="gs-in bg-card border border-line rounded-2xl p-5 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-extrabold text-sm uppercase tracking-wide">{d.label}</h3>
                        <p className="text-[11px] font-semibold text-mute">
                          {d.weekday} · {d.date}
                        </p>
                      </div>
                      <WeatherIcon icon={d.icon} condition={d.condition} size={48} />
                    </div>
                    <p className="text-3xl font-extrabold mt-2">{Math.round(d.temperature)}°C</p>
                    <p className="text-xs font-semibold text-soft">{d.condition}</p>
                    <div className="flex items-center justify-between gap-2 mt-3 text-xs font-semibold text-soft">
                      <span className="inline-flex items-center gap-1">
                        <Umbrella size={13} /> {d.rainChance}% rain
                      </span>
                      <span
                        className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${riskBadge[overall]}`}
                      >
                        {overall} risk
                      </span>
                    </div>
                  </article>
                );
              })
            ) : (
              <p className="text-sm text-soft border border-dashed border-line rounded-xl p-6 text-center sm:col-span-2 lg:col-span-3">
                {weatherError ?? 'Weather unavailable right now.'} Open the full forecast to retry.
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => navigate('/weather')}
            className="gs-in mt-6 inline-flex items-center justify-center gap-2 font-bold text-sm px-6 py-3.5 rounded-xl border border-line bg-card hover:border-brand transition-all duration-150 hover:-translate-y-0.5"
          >
            View 3-Day Forecast <ArrowRight size={16} />
          </button>
        </section>

        {/* ── 10. FINAL CTA ── */}
        <section className="px-5 md:px-10 pb-10 md:pb-14 max-w-6xl mx-auto">
          <div className="gs-in bg-panel text-white rounded-3xl p-6 md:p-10 text-center">
            <h2 className="text-2xl md:text-3xl font-extrabold leading-tight">
              A safer city starts with better information.
            </h2>
            <p className="text-sm md:text-base text-white/80 mt-3 max-w-xl mx-auto leading-relaxed">
              Whether you&apos;re reporting a problem or responding to one, UrbanShieldAI helps
              turn information into action.
            </p>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 mt-6">
              <button
                type="button"
                onClick={goDashboard}
                className="inline-flex items-center justify-center gap-2 font-bold text-sm px-6 py-3.5 rounded-xl bg-brand text-white hover:bg-brand-warm"
              >
                Explore the Dashboard <ArrowRight size={16} />
              </button>
              <button
                type="button"
                onClick={goReport}
                className="inline-flex items-center justify-center gap-2 font-bold text-sm px-6 py-3.5 rounded-xl border border-white/30 hover:border-white"
              >
                Report an Issue <ArrowRight size={16} />
              </button>
            </div>
            <p className="text-xs text-white/60 mt-5 font-semibold">
              See the risk. Understand the impact. Act earlier.
            </p>
          </div>
        </section>

        {/* ── ABOUT + FOOTER ── */}
        <section id="about" className="px-5 md:px-10 pb-6 max-w-6xl mx-auto scroll-mt-20">
          <div className="gs-in bg-card border border-line rounded-3xl p-6 md:p-10 shadow-sm">
            <span className="inline-flex text-xs font-bold px-3 py-1.5 rounded-full bg-brand-soft text-brand">
              ABOUT THE PROJECT
            </span>
            <h2 className="text-2xl md:text-3xl font-extrabold mt-3">What is UrbanShieldAI?</h2>
            <p className="text-sm md:text-base text-soft mt-3 leading-relaxed">
              UrbanShieldAI brings incidents, flood and heat risks, citizen reports and emergency
              response together on one live map. Citizens report issues from the ground, authorities
              verify and prioritize them, and AI turns scattered signals into clear risk guidance —
              so help reaches the right place faster.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
              {[
                { value: '24', label: 'Active incidents tracked' },
                { value: '276', label: 'Citizen reports filed' },
                { value: '7', label: 'High-risk zones watched' },
                { value: '58', label: 'Cases resolved in 24h' },
              ].map((s) => (
                <div key={s.label} className="bg-canvas border border-line rounded-2xl p-4 text-center">
                  <p className="text-2xl md:text-3xl font-extrabold text-brand">{s.value}</p>
                  <p className="text-[11px] md:text-xs font-semibold text-soft mt-1">{s.label}</p>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-mute mt-6">
              Project note: demo build connected to a live backend (cookie-session auth, OpenWeatherMap
              via server proxy). Sample counts above are illustrative.
            </p>
          </div>
        </section>
      </main>

      <footer className="border-t border-line px-5 md:px-10 py-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="flex items-center gap-2 text-xs font-bold text-soft">
            <ShieldCheck size={16} className="text-brand" /> UrbanShieldAI · City Resilience
          </p>
          <div className="flex items-center gap-4 text-xs font-semibold text-mute">
            <a href="#about" className="hover:text-brand">
              About
            </a>
            <button type="button" onClick={() => navigate('/weather')} className="hover:text-brand">
              Weather
            </button>
            <button type="button" onClick={goDashboard} className="hover:text-brand">
              Dashboard
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
