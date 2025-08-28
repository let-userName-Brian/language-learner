import { useCallback, useRef, useState } from "react";
import {
    Platform,
    RefreshControl,
    ScrollView,
    ScrollViewProps
} from "react-native";

interface PullToRefreshProps extends ScrollViewProps {
  onRefresh: () => Promise<void> | void;
  refreshing?: boolean;
  children: React.ReactNode;
}

export const PullToRefresh = ({ 
  onRefresh, 
  refreshing: externalRefreshing = false,
  children, 
  ...scrollViewProps 
}: PullToRefreshProps) => {
  const [internalRefreshing, setInternalRefreshing] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  
  // Use external refreshing state if provided, otherwise use internal
  const isRefreshing = externalRefreshing || internalRefreshing;

  const handleRefresh = useCallback(async () => {
    if (isRefreshing) return;
    
    setInternalRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setInternalRefreshing(false);
    }
  }, [onRefresh, isRefreshing]);

  if (Platform.OS === 'web') {
    // Clean web implementation
    const [pullDistance, setPullDistance] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const startY = useRef(0);

    const handleTouchStart = (e: any) => {
      startY.current = e.touches[0].clientY;
      setIsDragging(true);
    };

    const handleTouchMove = (e: any) => {
      if (!isDragging) return;
      
      const currentY = e.touches[0].clientY;
      const diff = currentY - startY.current;
      const scrollElement = scrollViewRef.current as any;
      const scrollTop = scrollElement?.scrollTop || 0;
      
      // Only allow pull when at the top of the scroll
      if (scrollTop === 0 && diff > 0) {
        setPullDistance(Math.min(diff, 100));
      }
    };

    const handleTouchEnd = () => {
      setIsDragging(false);
      
      if (pullDistance > 60) {
        handleRefresh();
      }
      
      setPullDistance(0);
    };

    // Extract padding values from contentContainerStyle to avoid conflicts
    const contentStyle = scrollViewProps.contentContainerStyle as any || {};
    const {
      padding,
      paddingTop,
      paddingBottom,
      paddingLeft,
      paddingRight,
      paddingHorizontal,
      paddingVertical,
      ...restContentStyle
    } = contentStyle;

    // Calculate refresh area height
    const refreshHeight = Math.max(pullDistance, isRefreshing ? 60 : 0);
    
    return (
      <div
        style={{ 
          position: 'relative', 
          height: '100%', 
          overflow: 'hidden',
          ...scrollViewProps.style as any
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Clean refresh area */}
        <div
          style={{
            height: refreshHeight,
            background: `linear-gradient(180deg, 
              rgba(248, 249, 250, 1) 0%, 
              rgba(33, 150, 243, 0.02) 100%)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            transition: isRefreshing ? 'height 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)' : 'none',
            borderBottom: refreshHeight > 0 ? '1px solid rgba(33, 150, 243, 0.08)' : 'none',
          }}
        >
          {/* Simple loading indicator */}
          {isRefreshing && (
            <div
              style={{
                width: 24,
                height: 24,
                border: '2px solid rgba(33, 150, 243, 0.2)',
                borderRadius: '50%',
                borderTopColor: '#2196F3',
                animationName: 'spin',
                animationDuration: '1s',
                animationIterationCount: 'infinite',
                animationTimingFunction: 'linear',
              }}
            />
          )}

          {/* Progress indicator */}
          {!isRefreshing && pullDistance > 0 && (
            <div
              style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                height: 2,
                background: 'rgba(33, 150, 243, 0.1)',
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${Math.min((pullDistance / 60) * 100, 100)}%`,
                  background: pullDistance > 60 
                    ? 'linear-gradient(90deg, #2196F3, #21CBF3)' 
                    : 'linear-gradient(90deg, #e5e7eb, #2196F3)',
                  transition: 'all 0.2s ease',
                }}
              />
            </div>
          )}
        </div>
        
        {/* Content area */}
        <div
          ref={scrollViewRef as any}
          style={{
            height: `calc(100% - ${refreshHeight}px)`,
            overflow: 'auto',
            transition: 'height 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
            ...restContentStyle
          }}
        >
          {children}
        </div>

        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  // Native mobile implementation using RefreshControl
  return (
    <ScrollView
      ref={scrollViewRef}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={handleRefresh}
          colors={['#2196F3']}
          tintColor="#2196F3"
          title=""
          titleColor="#6c757d"
        />
      }
      {...scrollViewProps}
    >
      {children}
    </ScrollView>
  );
};
