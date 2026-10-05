import { useNavigate } from 'react-router-dom';
import { ArrowRight, Briefcase, ClipboardCheck, FilePlus2, ShieldCheck } from 'lucide-react';

/**
 * Role entry point for the main citizen → admin → authority workflow,
 * rendered at the top of the Dashboard:
 * - CITIZEN reports an issue (description + photo + GPS/manual location).
 * - ADMIN reviews the REPORTED queue and assigns VERIFIED issues.
 * - AUTHORITY works their assigned tasks to RESOLVED.
 */
export default function WorkflowBanner({ role }: { role: 'CITIZEN' | 'AUTHORITY' | 'ADMIN' }) {
  const navigate = useNavigate();

  const config = {
    CITIZEN: {
      icon: FilePlus2,
      title: 'Report a civic issue',
      desc: 'Describe it, add a photo, pin GPS or type the address — then track REPORTED → RESOLVED live.',
      cta: 'Report an Issue',
      to: '/reports',
    },
    ADMIN: {
      icon: ClipboardCheck,
      title: 'Review citizen reports',
      desc: 'Verify REPORTED issues, run AI analysis, score the workforce and assign the best member.',
      cta: 'Open Admin Review',
      to: '/admin',
    },
    AUTHORITY: {
      icon: Briefcase,
      title: 'Your field tasks',
      desc: 'Start ASSIGNED work and mark it RESOLVED with a field note when done.',
      cta: 'Open My Tasks',
      to: '/tasks',
    },
  }[role];

  const isCitizen = role === 'CITIZEN';

  return (
    <div className="gs-in bg-panel text-white rounded-2xl p-5 md:p-6 flex flex-col md:flex-row md:items-center gap-4">
      {isCitizen ? (
        /* UrbanShieldAI brand logo for the citizen "Report a civic issue" banner */
        <div className="w-12 h-12 rounded-2xl bg-brand flex items-center justify-center shadow-lg shrink-0">
          <ShieldCheck size={26} className="text-white" />
        </div>
      ) : (
        <div className="w-11 h-11 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
          <config.icon size={20} />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="font-extrabold">{config.title}</p>
        <p className="text-sm text-[#e8d9b5] mt-0.5">{config.desc}</p>
      </div>
      <button
        onClick={() => navigate(config.to)}
        className="flex items-center justify-center gap-1.5 font-bold text-sm px-5 py-3 rounded-xl bg-brand text-white hover:bg-brand-warm shrink-0"
      >
        {config.cta} <ArrowRight size={16} />
      </button>
    </div>
  );
}
