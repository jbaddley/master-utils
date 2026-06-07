"use client";

import { useMemo } from "react";
import { CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  formatMeetDateTime,
  parseDatetimeLocalValue,
  toDatetimeLocalValue,
} from "@/lib/swim/datetime";

const MINUTES = Array.from({ length: 60 }, (_, i) => i);

const HOURS = Array.from({ length: 24 }, (_, hour24) => {
  const period = hour24 < 12 ? "AM" : "PM";
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  return { value: String(hour24), label: `${hour12}:00 ${period}` };
});

type Props = {
  value: string;
  onChange: (value: string) => void;
  id?: string;
  className?: string;
  required?: boolean;
};

export function DateTimePicker({ value, onChange, id, className, required }: Props) {
  const selected = useMemo(() => parseDatetimeLocalValue(value), [value]);
  const hour24 = selected?.getHours() ?? 9;
  const minute = selected?.getMinutes() ?? 0;

  function mergeDateTime(date: Date, hours: number, minutes: number) {
    const next = new Date(date);
    next.setHours(hours, minutes, 0, 0);
    onChange(toDatetimeLocalValue(next));
  }

  function updateDate(date: Date | undefined) {
    if (!date) return;
    mergeDateTime(date, hour24, minute);
  }

  function updateHour(nextHour: string) {
    const base = selected ?? new Date();
    mergeDateTime(base, Number(nextHour), minute);
  }

  function updateMinute(nextMinute: string) {
    const base = selected ?? new Date();
    mergeDateTime(base, hour24, Number(nextMinute));
  }

  const displayLabel = selected ? formatMeetDateTime(selected) : "Pick date & time";
  const hourLabel = HOURS.find((h) => h.value === String(hour24))?.label ?? "Hour";
  const minuteLabel = `:${String(minute).padStart(2, "0")}`;

  return (
    <Popover>
      <PopoverTrigger
        id={id}
        render={
          <Button
            type="button"
            variant="outline"
            className={cn(
              "w-full justify-start text-left font-normal",
              !selected && "text-muted-foreground",
              className,
            )}
            aria-required={required}
          >
            <CalendarIcon data-icon="inline-start" />
            {displayLabel}
          </Button>
        }
      />
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          captionLayout="dropdown"
          selected={selected ?? undefined}
          onSelect={updateDate}
          defaultMonth={selected ?? undefined}
        />
        <div className="flex items-center gap-2 border-t border-border p-3">
          <Select value={String(hour24)} onValueChange={(v) => v != null && updateHour(v)}>
            <SelectTrigger className="min-w-0 flex-1" aria-label="Hour">
              <SelectValue placeholder="Hour">{hourLabel}</SelectValue>
            </SelectTrigger>
            <SelectContent align="start">
              {HOURS.map((hour) => (
                <SelectItem key={hour.value} value={hour.value}>
                  {hour.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={String(minute)} onValueChange={(v) => v != null && updateMinute(v)}>
            <SelectTrigger className="w-[88px] shrink-0" aria-label="Minute">
              <SelectValue placeholder="Min">{minuteLabel}</SelectValue>
            </SelectTrigger>
            <SelectContent align="start">
              {MINUTES.map((m) => (
                <SelectItem key={m} value={String(m)}>
                  :{String(m).padStart(2, "0")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </PopoverContent>
    </Popover>
  );
}
