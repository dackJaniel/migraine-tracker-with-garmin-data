/**
 * SleepStages Component - Sleep Phase Visualization
 * Extracted from GarminDataView.tsx for reuse across components
 */

import { cn } from '@/lib/utils';

export interface SleepStagesProps {
  stages?: {
    deep: number;
    light: number;
    rem: number;
    awake: number;
  };
}

export function SleepStages({ stages }: SleepStagesProps) {
  if (!stages) return null;

  const total = stages.deep + stages.light + stages.rem + stages.awake;
  if (total === 0) return null;

  const formatMinutes = (min: number) => {
    const hours = Math.floor(min / 60);
    const mins = min % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const segments = [
    { label: 'Tiefschlaf', value: stages.deep, color: 'bg-indigo-600' },
    { label: 'Leichtschlaf', value: stages.light, color: 'bg-blue-400' },
    { label: 'REM', value: stages.rem, color: 'bg-purple-500' },
    { label: 'Wach', value: stages.awake, color: 'bg-amber-400' },
  ];

  return (
    <div className="space-y-3">
      <div className="flex h-4 rounded-full overflow-hidden">
        {segments.map(seg => (
          <div
            key={seg.label}
            className={cn(seg.color)}
            style={{ width: `${(seg.value / total) * 100}%` }}
          />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2">
        {segments.map(seg => (
          <div key={seg.label} className="flex items-center gap-2 text-sm">
            <div className={cn('w-3 h-3 rounded', seg.color)} />
            <span className="text-slate-600">{seg.label}:</span>
            <span className="font-medium">{formatMinutes(seg.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
