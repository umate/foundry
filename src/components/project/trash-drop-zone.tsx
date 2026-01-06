'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash } from '@phosphor-icons/react';
import { useDrag } from './drag-context';

interface TrashDropZoneProps {
  onArchive: (featureId: string) => Promise<void>;
}

export function TrashDropZone({ onArchive }: TrashDropZoneProps) {
  const { isDragging } = useDrag();
  const [isHovering, setIsHovering] = useState(false);
  const [showPoof, setShowPoof] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setIsHovering(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsHovering(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const featureId = e.dataTransfer.getData('featureId');

    if (!featureId) return;

    setShowPoof(true);
    setIsHovering(false);

    // Archive after poof animation
    setTimeout(async () => {
      await onArchive(featureId);
      setShowPoof(false);
    }, 400);
  };

  return (
    <AnimatePresence>
      {(isDragging || showPoof) && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: 20 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          className="fixed bottom-6 right-6 z-50"
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {/* Poof Cloud Effect */}
          <AnimatePresence>
            {showPoof && (
              <>
                {/* Multiple expanding circles for cloud effect */}
                {[0, 1, 2, 3, 4].map((i) => (
                  <motion.div
                    key={i}
                    initial={{
                      scale: 0.3,
                      opacity: 0.8,
                      x: 0,
                      y: 0,
                    }}
                    animate={{
                      scale: [0.3, 1.5 + i * 0.3],
                      opacity: [0.8, 0],
                      x: (i % 2 === 0 ? 1 : -1) * (i * 8),
                      y: (i % 3 === 0 ? -1 : 1) * (i * 6),
                    }}
                    transition={{
                      duration: 0.4,
                      delay: i * 0.03,
                      ease: 'easeOut',
                    }}
                    className="absolute inset-0 rounded-full bg-foreground/20 pointer-events-none"
                    style={{
                      filter: 'blur(8px)',
                    }}
                  />
                ))}
              </>
            )}
          </AnimatePresence>

          {/* Trash Icon */}
          <motion.div
            animate={showPoof ? 'poof' : isHovering ? 'hover' : 'idle'}
            variants={{
              idle: { scale: 1, rotate: 0 },
              hover: {
                scale: 1.3,
                rotate: [0, -5, 5, -5, 0],
                transition: {
                  scale: { type: 'spring', stiffness: 400, damping: 15 },
                  rotate: { repeat: Infinity, duration: 0.5 },
                },
              },
              poof: {
                scale: [1, 1.2, 0.9, 1],
                transition: { duration: 0.3 },
              },
            }}
            className={`
              relative w-16 h-16 rounded-md flex items-center justify-center
              border-2 transition-colors shadow-lg
              ${
                isHovering
                  ? 'bg-destructive/20 border-destructive text-destructive'
                  : 'bg-card border-foreground/20 text-muted-foreground'
              }
            `}
          >
            <Trash weight="bold" className="size-8" />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
