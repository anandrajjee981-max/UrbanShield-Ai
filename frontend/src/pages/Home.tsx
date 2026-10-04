import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Map, FileText, Bot, ArrowRight, Target, Eye, Users, Siren, Sun, Moon, CloudSun } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { toggleTheme } from '../store/slices/uiSlice';
import { useGsapEntrance } from '../hooks/useGsapEntrance';
import WeatherPreviewCard from '../components/weather/WeatherPreviewCard';

const features = [
  { icon: Map, title: 'Live City Map', desc: 'Real OpenStreetMap tiles with incident markers, risk layers and location search.', color: '#4482ea', to: '/map' },
  { icon: FileText, title: 'Citizen Reports', desc: 'Submit geo-tagged issues with photos. Verified reports get a civic-green badge.', color: '#51933a', to: '/reports' },
  { icon: Bot, title: 'AI Risk Insights', desc: 'Flood, heat and air-quality advisories to pre-deploy response teams.', color: '#965d13', to: '/ai' },
  { icon: CloudSun, title: '3-Day Weather', desc: 'Live temperature, rain risk and heat advisories for your city.', color: '#0e9594', to: '/weather', public: true },
];

export default function Home() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const isAuthenticated = useAppSelector((s) => s.auth.isAuthenticated);
  const theme = useAppSelector((s) => s.ui.theme);
  useGsapEntrance('.gs-in', []);

  // Click on a box → if logged in go straight to the page,
  // else go to Login first and Login sends the user to that page after success.
  // Public features (like Weather) open directly without login.
  const openFeature = (to: string, isPublic = false) => {
    if (isPublic || isAuthenticated) navigate(to);
    else navigate('/login', { state: { from: to } });
  };

  return (
    <div className="min-h-screen bg-canvas text-ink">
      <header className="flex items-center justify-between px-3 sm:px-5 md:px-10 h-16 border-b border-line bg-cream sticky top-0 z-10">
        <div className="flex items-center gap-2 min-w-0">
          <ShieldCheck size={26} className="text-brand shrink-0" />
          <div className="min-w-0">
            <p className="font-extrabold leading-none truncate">UrbanShieldAI</p>
            <p className="text-[11px] text-mute">City Resilience</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <a href="#about" className="hidden sm:inline-block text-sm font-bold px-3 py-2.5 rounded-xl hover:text-brand">
            About
          </a>
          <button onClick={() => dispatch(toggleTheme())} title={theme === 'light' ? 'Switch to dark theme' : 'Switch to light theme'}
            className="p-2.5 rounded-xl border border-line bg-card hover:border-brand">
            {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
          </button>
          {isAuthenticated ? (
            <button onClick={() => navigate('/dashboard')}
              className="text-sm font-bold px-4 py-2.5 rounded-xl bg-brand text-white hover:bg-brand-warm">
              Open Dashboard
            </button>
          ) : (
            <>
              <button onClick={() => navigate('/login')}
                className="text-sm font-bold px-4 py-2.5 rounded-xl border border-line bg-card hover:border-brand">
                Login
              </button>
              <button onClick={() => navigate('/register')}
                className="text-sm font-bold px-4 py-2.5 rounded-xl bg-brand text-white hover:bg-brand-warm">
                Register
              </button>
            </>
          )}
        </div>
      </header>

      <main className="px-5 md:px-10 py-10 md:py-16 max-w-5xl mx-auto">
        <div className="gs-in text-center">
          {/* <span className="inline-flex text-xs font-bold px-3 py-1.5 rounded-full bg-brand-soft text-brand">
            ● FRONTEND DEMO · MOCK AUTH · NO BACKEND
          </span> */}
          <h1 className="text-3xl md:text-5xl font-extrabold mt-4 leading-tight">
            One dashboard for a <span className="text-brand">safer city</span>
          </h1>
          <p className="text-sm md:text-base text-soft mt-3 max-w-2xl mx-auto">
            Track incidents, flood and heat risks, citizen reports and emergency response —
            live on a real city map.
          </p>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 mt-6">
            <button onClick={() => navigate('/dashboard')}
              className="flex items-center justify-center gap-2 font-bold text-sm px-6 py-3.5 rounded-xl bg-brand text-white hover:bg-brand-warm">
              Open Dashboard <ArrowRight size={16} />
            </button>
            {!isAuthenticated && (
              <button onClick={() => navigate('/register')}
                className="font-bold text-sm px-6 py-3.5 rounded-xl border border-line bg-card hover:border-brand">
                Create account
              </button>
            )}
          </div>
          <p className="text-[11px] text-mute mt-3">
            {isAuthenticated ? 'You are signed in — Dashboard opens directly.' : 'You will be asked to login first — then taken straight to the Dashboard.'}
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-10">
          {features.map((f) => (
            <button
              key={f.title}
              type="button"
              onClick={() => openFeature(f.to, 'public' in f && f.public)}
              title={'public' in f && f.public ? `Open ${f.title}` : isAuthenticated ? `Open ${f.title}` : `Login to open ${f.title}`}
              className="gs-in group bg-card border border-line rounded-2xl p-5 shadow-sm text-left cursor-pointer transition-all duration-200 hover:-translate-y-1 hover:shadow-lg hover:border-brand focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
            >
              <div className="w-11 h-11 rounded-xl flex items-center justify-center text-white" style={{ background: f.color }}>
                <f.icon size={20} />
              </div>
              <p className="font-bold mt-3 flex items-center justify-between gap-2">
                {f.title}
                <ArrowRight size={16} className="text-mute transition-transform duration-200 group-hover:translate-x-1 group-hover:text-brand" />
              </p>
              <p className="text-sm text-soft mt-1">{f.desc}</p>
              <p className="text-xs font-bold text-brand mt-3">
                {'public' in f && f.public ? 'Open now →' : isAuthenticated ? 'Open now →' : 'Login to open →'}
              </p>
            </button>
          ))}
        </div>

        {/* ── Live weather preview (public, links to /weather) ── */}
        <WeatherPreviewCard />

        {/* ── About section (visible inside Home) ── */}
        <section id="about" className="gs-in mt-12 scroll-mt-20">
          <div className="bg-card border border-line rounded-3xl p-6 md:p-10 shadow-sm overflow-hidden">
            <span className="inline-flex text-xs font-bold px-3 py-1.5 rounded-full bg-brand-soft text-brand">
              ABOUT THE PROJECT
            </span>
            <h2 className="text-2xl md:text-3xl font-extrabold mt-3">What is UrbanShieldAI?</h2>
            <p className="text-sm md:text-base text-soft mt-3 leading-relaxed">
              UrbanShieldAI is a <span className="font-bold text-ink">frontend-only city resilience dashboard</span> that
              brings incidents, flood and heat risks, citizen reports and emergency response together on one
              live map. Citizens report issues from the ground, ward officers verify them, and the dashboard
              turns everything into clear risk signals — so help reaches the right place faster.
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

            <h3 className="font-extrabold text-lg mt-8">How it works</h3>
            <div className="grid md:grid-cols-3 gap-3 mt-3">
              {[
                { icon: FileText, step: '1 · Report', desc: 'Citizens submit geo-tagged issues with photos. New reports enter a pending-review queue.', color: '#f84424' },
                { icon: Eye, step: '2 · Verify', desc: 'Ward officers verify reports on the live map and mark risk zones by severity.', color: '#4482ea' },
                { icon: Siren, step: '3 · Respond', desc: 'Response teams are dispatched from the Emergency panel with one-tap helplines.', color: '#51933a' },
              ].map((s) => (
                <div key={s.step} className="bg-canvas border border-line rounded-2xl p-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white" style={{ background: s.color }}>
                    <s.icon size={18} />
                  </div>
                  <p className="font-bold text-sm mt-2.5">{s.step}</p>
                  <p className="text-xs text-soft mt-1 leading-relaxed">{s.desc}</p>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2 mt-8">
              <span className="flex items-center gap-1.5 text-xs font-bold text-soft mr-1"><Target size={14} /> Built frontend-only with:</span>
              {['React + TypeScript', 'Real Map API (OSM)', 'Redux Toolkit', 'Recharts', 'GSAP'].map((t) => (
                <span key={t} className="text-[11px] font-bold px-2.5 py-1.5 rounded-full bg-cream border border-line text-civic-amber-dark">
                  {t}
                </span>
              ))}
            </div>

            <div className="flex items-center gap-2 mt-6 text-xs text-mute">
              <Users size={14} />
              <p>Made for citizens, ward officers and city command centers — demo data only, API-ready for a real backend.</p>
            </div>
          </div>
        </section>

        <div className="gs-in mt-8 bg-panel text-white rounded-2xl p-6 md:p-8 flex flex-col md:flex-row md:items-center gap-4">
          <div className="flex-1">
            <p className="font-extrabold text-lg">Try the demo in one click</p>
            <p className="text-sm text-[#e8d9b5] mt-1">Login accepts any demo email with a 4+ character password. No real credentials, nothing leaves your browser.</p>
          </div>
          <button onClick={() => navigate('/login')}
            className="font-bold text-sm px-6 py-3 rounded-xl bg-brand text-white hover:bg-brand-warm shrink-0">
            Go to Login
          </button>
        </div>
      </main>
    </div>
  );
}
