import React from 'react';
import { usePullToRefresh } from '@/hooks/use-pull-to-refresh';
import { PullToRefreshIndicator } from '@/components/ui/pull-to-refresh-indicator';

interface PullToRefreshContainerProps {
  onRefresh: () => Promise<void> | void;
  children: React.ReactNode;
  className?: string;
}

export function PullToRefreshContainer({ onRefresh, children, className }: PullToRefreshContainerProps) {
  const { containerRef, pullDistance, isRefreshing, progress } = usePullToRefresh({ onRefresh });

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}
    >
      <PullToRefreshIndicator
        pullDistance={pullDistance}
        isRefreshing={isRefreshing}
        progress={progress}
      />
      {children}
    </div>
  );
}
