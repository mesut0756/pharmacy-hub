import { cn } from '@/lib/utils';

interface ExpiringMedicineItemProps {
  name: string;
  subtitle?: string;
  daysLeft: number;
  badgeOnly?: boolean;
}

const getLevelColor = (daysLeft: number) => {
  if (daysLeft <= 7) return { bg: 'bg-red-500', text: 'text-red-700 dark:text-red-400', label: 'Critical' };
  if (daysLeft <= 15) return { bg: 'bg-yellow-500', text: 'text-yellow-700 dark:text-yellow-400', label: 'Warning' };
  return { bg: 'bg-green-500', text: 'text-green-700 dark:text-green-400', label: 'Monitor' };
};

export const ExpiringMedicineItem = ({ name, subtitle, daysLeft, badgeOnly }: ExpiringMedicineItemProps) => {
  const level = getLevelColor(daysLeft);
  const fillPercent = Math.max(5, Math.min(100, (daysLeft / 30) * 100));

  if (badgeOnly) {
    return (
      <div className="flex items-center gap-2 justify-end">
        {/* Mini level tube */}
        <div className="w-16 h-2.5 rounded-full bg-muted overflow-hidden">
          <div
            className={cn('h-full rounded-full transition-all duration-500', level.bg)}
            style={{ width: `${fillPercent}%` }}
          />
        </div>
        <span className={cn('text-xs font-bold tabular-nums min-w-[3ch] text-right', level.text)}>
          {daysLeft}d
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between p-3 rounded-lg bg-white/60 dark:bg-white/5 border border-yellow-200/50 dark:border-yellow-800/30">
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate">{name}</p>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-3 ml-3">
        {/* Level tube */}
        <div className="w-20 h-3 rounded-full bg-muted overflow-hidden" title={`${daysLeft} days remaining`}>
          <div
            className={cn('h-full rounded-full transition-all duration-500', level.bg)}
            style={{ width: `${fillPercent}%` }}
          />
        </div>
        <span className={cn('text-xs font-bold tabular-nums min-w-[4ch] text-right', level.text)}>
          {daysLeft}d
        </span>
      </div>
    </div>
  );
};
