'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

interface DragContextValue {
  isDragging: boolean;
  setIsDragging: (dragging: boolean) => void;
  draggedFeatureId: string | null;
  setDraggedFeatureId: (id: string | null) => void;
}

const DragContext = createContext<DragContextValue | null>(null);

export function DragProvider({ children }: { children: ReactNode }) {
  const [isDragging, setIsDragging] = useState(false);
  const [draggedFeatureId, setDraggedFeatureId] = useState<string | null>(null);

  return (
    <DragContext.Provider
      value={{
        isDragging,
        setIsDragging,
        draggedFeatureId,
        setDraggedFeatureId,
      }}
    >
      {children}
    </DragContext.Provider>
  );
}

export function useDrag() {
  const context = useContext(DragContext);
  if (!context) {
    throw new Error('useDrag must be used within DragProvider');
  }
  return context;
}
