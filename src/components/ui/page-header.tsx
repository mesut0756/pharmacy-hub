import { cn } from '@/lib/utils';

interface PageHeaderProps {
  title: string;
  description?: string;
  children?: React.ReactNode;
  className?: string;
}

export const PageHeader = ({ title, description, children, className }: PageHeaderProps) => {
  return (
    <div className={cn(
      "flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8",
      className
    )}>
      <div className="space-y-1">
        <h1 className="text-2xl lg:text-3xl font-bold tracking-tight animate-fade-in">
          {title}
        </h1>
        {description && (
          <p className="text-muted-foreground animate-fade-in" style={{ animationDelay: '0.1s' }}>
            {description}
          </p>
        )}
      </div>
      {children && (
        <div className="flex items-center gap-2 animate-fade-in" style={{ animationDelay: '0.2s' }}>
          {children}
        </div>
      )}
    </div>
  );
};
