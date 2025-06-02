import { create } from 'zustand';

type ViewsState = {
  views: Record<string, number>; // videoId -> views_count
  setView: (videoId: string, count: number) => void;
};

export const useViewsStore = create<ViewsState>((set) => ({
  views: {},
  setView: (videoId, count) =>
    set((state) => ({
      views: { ...state.views, [videoId]: count }
    })),
})); 