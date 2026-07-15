import React, { useState } from 'react';
import OptimizedImage from '@/components/OptimizedImage';
import {
  ArrowRightLeft,
  BarChart3,
  CalendarCheck,
  CreditCard,
  MapPinned,
  QrCode,
  ReceiptText,
  Users,
  Wallet,
  Activity,
  Sparkles,
  Globe,
  Gauge,
  Zap,
  LineChart,
} from 'lucide-react';

const payrollWidgets = [
  { label: 'Employees', value: '128', icon: Users },
  { label: 'QR Attendance', value: 'Live', icon: QrCode },
  { label: 'Payslips', value: 'PDF', icon: ReceiptText },
];

const travelWidgets = [
  { label: 'Destinations', value: 'Bali', icon: MapPinned },
  { label: 'Bookings', value: 'Flow', icon: CalendarCheck },
  { label: 'Invoices', value: 'HTML', icon: CreditCard },
];

const cashflowWidgets = [
  { label: 'Balance', value: 'IDR 12.4M', icon: Wallet },
  { label: 'Scan Receipt', value: 'AI', icon: ReceiptText },
  { label: 'Transactions', value: 'Auto', icon: ArrowRightLeft },
];

const agentStatusWidgets = [
  { label: 'Providers', value: '6 Online', icon: Activity },
  { label: 'Latency', value: '124ms', icon: Gauge },
  { label: 'Tokens', value: '24.5K', icon: Zap },
];

const aurexWidgets = [
  { label: 'Style Score', value: '92/100', icon: Sparkles },
  { label: 'Selfies', value: 'Analyzed', icon: BarChart3 },
  { label: 'AI Model', value: 'FastAPI', icon: Zap },
];

const superfoodWidgets = [
  { label: 'Platforms', value: '3 Active', icon: Globe },
  { label: 'Restaurants', value: '1,247', icon: LineChart },
  { label: 'Menus', value: '8.3K', icon: BarChart3 },
];

function GeneratedThumbnail({ project }) {
  const isTravel = project.visual === 'travel-booking';
  const isCashflow = project.visual === 'cashflow';
  const isAgentStatus = project.visual === 'agent-status';
  const isAurex = project.visual === 'aurex';
  const isSuperfood = project.visual === 'superfood';
  const widgets = isTravel ? travelWidgets
    : isCashflow ? cashflowWidgets
    : isAgentStatus ? agentStatusWidgets
    : isAurex ? aurexWidgets
    : isSuperfood ? superfoodWidgets
    : payrollWidgets;
  const Icon = project.icon;

  return (
    <div className={`relative w-full h-full overflow-hidden bg-zinc-950 ${isTravel ? 'project-visual-travel' : isCashflow ? 'project-visual-cashflow' : 'project-visual-payroll'}`}>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(59,130,246,0.22),transparent_34%),radial-gradient(circle_at_78%_18%,rgba(16,185,129,0.16),transparent_30%),linear-gradient(145deg,rgba(24,24,27,0.98),rgba(9,9,11,1))]" />
      <div className="absolute inset-x-8 top-10 h-28 rounded-[2rem] border border-white/10 bg-white/[0.04] backdrop-blur-sm" />
      <div className="absolute left-8 right-8 top-10 flex items-center justify-between px-6 py-5">
        <div>
          <div className="h-2 w-16 rounded-full bg-white/20" />
          <div className="mt-4 h-3 w-28 rounded-full bg-white/35" />
        </div>
        <div className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${project.color} shadow-2xl shadow-black/30`}>
          <Icon className="h-7 w-7 text-white" />
        </div>
      </div>

      <div className="absolute left-8 right-8 bottom-8 grid grid-cols-3 gap-3">
        {widgets.map((item) => {
          const WidgetIcon = item.icon;
          return (
            <div key={item.label} className="rounded-2xl border border-white/10 bg-zinc-900/80 p-4 backdrop-blur-md">
              <WidgetIcon className={`mb-4 h-5 w-5 ${isCashflow ? 'text-emerald-400' : 'text-blue-400'}`} />
              <div className="text-sm font-black text-white">{item.value}</div>
              <div className="mt-1 text-[9px] font-bold uppercase tracking-[0.12em] text-zinc-400">{item.label}</div>
            </div>
          );
        })}
      </div>

      <div className="absolute left-12 top-32 h-16 w-32 rounded-2xl border border-white/10 bg-zinc-900/70" />
      <div className="absolute right-12 top-36 h-20 w-40 rounded-2xl border border-white/10 bg-zinc-900/60">
        <BarChart3 className="absolute bottom-4 right-4 h-8 w-8 text-white/20" aria-hidden="true" />
      </div>
    </div>
  );
}

export default function ProjectVisual({ project, className = '', loading = 'eager' }) {
  const [imageFailed, setImageFailed] = useState(false);

  if (project.imageUrl && !imageFailed) {
    return (
      <OptimizedImage
        src={project.imageUrl}
        alt={project.title}
        loading={loading}
        decoding="async"
        className={`${className} object-top`}
        onError={() => setImageFailed(true)}
      />
    );
  }

  return <GeneratedThumbnail project={project} />;
}
