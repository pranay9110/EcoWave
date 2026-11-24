import {AlertCircle, CheckCircle2, Clock, PauseCircle, Wrench} from 'lucide-react';

interface StatusTextProps {
  status: string;
}

export function StatusText({status}: StatusTextProps) {
  const normalized = status.toLowerCase();

  if (
    ['in stock', 'available', 'running', 'completed', 'approved', 'delivered', 'shipped'].includes(
      normalized,
    )
  ) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 whitespace-nowrap">
        <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
        <span>{status}</span>
      </span>
    );
  }

  if (
    ['low stock', 'under maintenance', 'conditional rework', 'processing', 'in progress', 'idle', 'scheduled'].includes(
      normalized,
    )
  ) {
    const Icon = normalized === 'under maintenance' ? Wrench : Clock;
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700 whitespace-nowrap">
        <Icon className="h-3.5 w-3.5 shrink-0" />
        <span>{status}</span>
      </span>
    );
  }

  if (['out of stock', 'breakdown', 'rejected'].includes(normalized)) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-red-700 whitespace-nowrap">
        <AlertCircle className="h-3.5 w-3.5 shrink-0" />
        <span>{status}</span>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 whitespace-nowrap">
      <PauseCircle className="h-3.5 w-3.5 shrink-0" />
      <span>{status}</span>
    </span>
  );
}

export function OriginLabel({isSample}: {isSample: boolean}) {
  return (
    <span
      className={`text-xs font-medium whitespace-nowrap ${
        isSample ? 'text-slate-400' : 'text-emerald-700'
      }`}
    >
      {isSample ? 'Sample' : 'Live'}
    </span>
  );
}
