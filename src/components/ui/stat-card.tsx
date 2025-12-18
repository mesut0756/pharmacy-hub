import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  description?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'destructive' | 'info';
  className?: string;
}

const variantStyles = {
  default: {
    icon: 'bg-muted text-muted-foreground',
    trend: 'text-muted-foreground',
  },
  primary: {
    icon: 'bg-primary/10 text-primary',
    trend: 'text-primary',
  },
  success: {
    icon: 'bg-success/10 text-success',
    trend: 'text-success',
  },
  warning: {
    icon: 'bg-warning/10 text-warning',
    trend: 'text-warning',
  },
  destructive: {
    icon: 'bg-destructive/10 text-destructive',
    trend: 'text-destructive',
  },
  info: {
    icon: 'bg-info/10 text-info',
    trend: 'text-info',
  },
};

export const StatCard = ({
  title,
  value,
  icon: Icon,
  description,
  trend,
  variant = 'default',
  className,
}: StatCardProps) => {
  const styles = variantStyles[variant];

  return (
    <div className={cn(
      "stat-card animate-scale-in",
      className
    )}>
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-3xl font-bold tracking-tight">{value}</p>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
          {trend && (
            <p className={cn(
              "text-sm font-medium",
              trend.isPositive ? "text-success" : "text-destructive"
            )}>
              {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
            </p>
          )}
        </div>
        <div className={cn(
          "p-3 rounded-xl",
          styles.icon
        )}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
};
