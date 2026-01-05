/**
 * MetricCard Component - Reusable Garmin Metric Display
 * Extracted from GarminDataView.tsx for reuse across components
 */

import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export interface MetricCardProps {
  icon: React.ElementType;
  label: string;
  value: string | number | null | undefined;
  unit?: string;
  subValue?: string;
  color?: string;
}

export function MetricCard({
  icon: Icon,
  label,
  value,
  unit,
  subValue,
  color = 'text-slate-600',
}: MetricCardProps) {
  const hasValue = value !== null && value !== undefined && value !== '';

  return (
    <Card className={cn(!hasValue && 'opacity-60')}>
      <CardContent className="pt-4">
        <div className="flex items-start gap-3">
          <div className={cn('p-2 rounded-lg bg-slate-100', color)}>
            <Icon className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <p className="text-sm text-slate-600">{label}</p>
            {hasValue ? (
              <>
                <p className="text-2xl font-bold">
                  {value}
                  {unit && (
                    <span className="text-sm font-normal ml-1">{unit}</span>
                  )}
                </p>
                {subValue && (
                  <p className="text-xs text-slate-500 mt-0.5">{subValue}</p>
                )}
              </>
            ) : (
              <p className="text-lg text-slate-400">Keine Daten</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
