import { useCallback, useEffect, useRef } from 'react';
import BagShare from '../bag-share/model/BagShare';
import GearFilter from '../warehouse/model/GearFilter';

interface UseScrollBasedFilterReturn {
  setCategoryRef: (categoryFilter: string, element: HTMLDivElement | null) => void;
  updateVisibility: (categoryFilter: GearFilter, inView: boolean) => void;
}

export const useScrollBasedFilterForBagShare = (
  bagShare: BagShare,
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

  const updateVisibility = useCallback(
    (categoryFilter: GearFilter, inView: boolean) => {
      visibilityMap.current.set(categoryFilter, inView);

      // 현재 보이는 카테고리들 중 가장 위에 있는 것 찾기
      const visibleCategories = Array.from(visibilityMap.current.entries())
        .filter(([, visible]) => visible)
        .map(([category]) => category);

      if (visibleCategories.length > 0) {
        // 화면에서 가장 위에 있는 카테고리 찾기
        let topCategory = visibleCategories[0];
        let topPosition = Number.MAX_SAFE_INTEGER;

        visibleCategories.forEach((category) => {
          const element = categoryRefs.current.get(category);
          if (element) {
            const rect = element.getBoundingClientRect();
            // 헤더 높이(170px)를 고려하여 실제로 보이는 영역의 상단 위치 계산
            const adjustedTop = Math.abs(rect.top - 170);
            if (adjustedTop < topPosition) {
              topPosition = adjustedTop;
              topCategory = category;
            }
          }
        });

        bagShare.setActiveFilterByCategory(topCategory);
      } else {
        bagShare.clearAllFilters();
      }
    },
    [bagShare]
  );

  useEffect(() => {
    if (initialized) {
      bagShare.setCategoryRefs(categoryRefs.current);
    }
  }, [initialized, bagShare]);

  return {
    setCategoryRef,
    updateVisibility,
  };
};
