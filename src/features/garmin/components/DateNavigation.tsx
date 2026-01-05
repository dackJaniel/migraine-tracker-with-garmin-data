import { useState } from 'react';
import { format, subDays } from 'date-fns';
import { de } from 'date-fns/locale';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Loader2,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

export interface DateNavigationProps {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  onResync: () => Promise<void>;
  datesWithData?: string[];
  isResyncing?: boolean;
}

export function DateNavigation({
  selectedDate,
  onDateChange,
  onResync,
  datesWithData = [],
  isResyncing = false,
}: DateNavigationProps) {
  const [calendarOpen, setCalendarOpen] = useState(false);

  const goToPreviousDay = () => {
    onDateChange(subDays(selectedDate, 1));
  };

  const goToNextDay = () => {
    const today = new Date();
    if (selectedDate < today) {
      onDateChange(subDays(selectedDate, -1));
    }
  };

  const goToToday = () => {
    onDateChange(new Date());
  };

  const hasDataForDate = (date: Date): boolean => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return datesWithData.includes(dateStr);
  };

  const isToday =
    format(selectedDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      {/* Date Selection */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          onClick={goToPreviousDay}
          aria-label="Vorheriger Tag"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="min-w-[200px] justify-start">
              <Calendar className="h-4 w-4 mr-2" />
              {format(selectedDate, 'EEEE, dd. MMMM yyyy', { locale: de })}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <CalendarComponent
              mode="single"
              selected={selectedDate}
              onSelect={date => {
                if (date) {
                  onDateChange(date);
                  setCalendarOpen(false);
                }
              }}
              disabled={date => date > new Date()}
              modifiers={{
                hasData: (date: Date) => hasDataForDate(date),
              }}
              modifiersClassNames={{
                hasData: 'bg-green-100 text-green-900 font-semibold',
              }}
              locale={de}
            />
          </PopoverContent>
        </Popover>

        <Button
          variant="outline"
          size="icon"
          onClick={goToNextDay}
          disabled={isToday}
          aria-label="Nächster Tag"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2">
        {!isToday && (
          <Button variant="outline" size="sm" onClick={goToToday}>
            Heute
          </Button>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={onResync}
          disabled={isResyncing}
        >
          {isResyncing ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          Neu laden
        </Button>
      </div>
    </div>
  );
}
