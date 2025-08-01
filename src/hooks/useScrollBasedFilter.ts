import { useCallback, useEffect, useRef } from 'react';
import BagDetail from '../bag-detail/model/BagDetail';
import GearFilter from '../warehouse/model/GearFilter';

interface UseScrollBasedFilterReturn {
  setCategoryRef: (categoryFilter: string, element: HTMLDivElement | null) => void;
  updateVisibility: (categoryFilter: GearFilter, inView: boolean) => void;
}

export const useScrollBasedFilter = (
  bagDetail: BagDetail,
  initialized: boolean
): UseScrollBasedFilterReturn => {
  const categoryRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const visibilityMap = useRef<Map<GearFilter, boolean>>(new Map());

  const setCategoryRef = useCallback((categoryFilter: string, element: HTMLDivElement | null) => {
    if (element) {
      categoryRefs.current.set(categoryFilter, element);
    } else {
      categoryRefs.current.delete(categoryFilter);
    }
  }, []);

  const updateVisibility = useCallback((categoryFilter: GearFilter, inView: boolean) => {
    visibilityMap.current.set(categoryFilter, inView);
    
    // 현재 보이는 카테고리들 중 가장 위에 있는 것 찾기
    const visibleCategories = Array.from(visibilityMap.current.entries())
      .filter(([, visible]) => visible)
      .map(([category]) => category);

    if (visibleCategories.length > 0) {
      // 화면에서 가장 위에 있는 카테고리 찾기
      const topCategory = visibleCategories.reduce((top, current) => {
        const topElement = categoryRefs.current.get(top);
        const currentElement = categoryRefs.current.get(current);
        
        if (topElement && currentElement) {
          return topElement.getBoundingClientRect().top < currentElement.getBoundingClientRect().top ? top : current;
        }
        return top;
      });
      
      bagDetail.setActiveFilterByCategory(topCategory);
    } else {
      bagDetail.clearAllFilters();
    }
  }, [bagDetail]);

  useEffect(() => {
    if (initialized) {
      bagDetail.setCategoryRefs(categoryRefs.current);
    }
  }, [initialized, bagDetail]);

  return {
    setCategoryRef,
    updateVisibility
  };
}; 