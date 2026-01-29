import React, { useState } from "react";
import OSCard from "./OSCard";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Draggable } from "@hello-pangea/dnd";

export default function CardStack({ orders, onOpenDetails, onEdit, onDelete, onStatusChange, userPermissions, allStatuses }) {
  const [activeIndex, setActiveIndex] = useState(0);

  const handleNext = (e) => {
    e.stopPropagation();
    setActiveIndex((prev) => (prev < orders.length - 1 ? prev + 1 : prev));
  };

  const handlePrev = (e) => {
    e.stopPropagation();
    setActiveIndex((prev) => (prev > 0 ? prev - 1 : prev));
  };
  
  const displayedOrders = orders.slice(0, 5);

  return (
    <div className="relative">
      {/* Card Stack */}
      <div className="relative h-[380px] w-full flex items-center justify-center mb-4">
        <AnimatePresence>
          {displayedOrders.map((os, index) => {
            const isTop = index === activeIndex;
            const offset = index - activeIndex;

            if (offset < 0 || offset > 3) return null;

            // Only the top card should be draggable
            if (isTop && userPermissions?.canMoveOSCards) {
              return (
                <Draggable key={os.id} draggableId={os.id} index={index}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      {...provided.dragHandleProps}
                      className="absolute w-64"
                      style={{
                        ...provided.draggableProps.style,
                        zIndex: displayedOrders.length - offset + (snapshot.isDragging ? 1000 : 0),
                      }}
                    >
                      <OSCard
                        os={os}
                        onOpenDetails={onOpenDetails}
                        onEdit={onEdit}
                        onDelete={onDelete}
                        onStatusChange={onStatusChange}
                        userPermissions={userPermissions}
                        allStatuses={allStatuses}
                        isTop={isTop}
                        isDragging={snapshot.isDragging}
                      />
                    </div>
                  )}
                </Draggable>
              );
            } else {
              return (
                <motion.div
                  key={os.id}
                  className="absolute w-64"
                  initial={{ 
                      x: offset * 30,
                      scale: 1 - offset * 0.1,
                      opacity: 0,
                  }}
                  animate={{
                    x: offset * 30,
                    scale: 1 - offset * 0.1,
                    zIndex: displayedOrders.length - offset,
                    opacity: 1,
                  }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.2 }}
                >
                  <OSCard
                    os={os}
                    onOpenDetails={onOpenDetails}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    onStatusChange={onStatusChange}
                    userPermissions={userPermissions}
                    allStatuses={allStatuses}
                    isTop={isTop}
                  />
                </motion.div>
              );
            }
          })}
        </AnimatePresence>
      </div>

      {/* Navigation Controls - Outside the cards */}
      {displayedOrders.length > 1 && (
        <div className="flex items-center justify-center gap-4">
          {/* Prev Arrow */}
          <button
            onClick={handlePrev}
            disabled={activeIndex === 0}
            className="w-10 h-10 flex items-center justify-center bg-white/60 backdrop-blur-md border border-white/40 angled-clip text-gray-600 hover:bg-white/80 hover:text-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-md"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          
          <span className="text-sm font-semibold text-gray-700 bg-white/50 backdrop-blur-sm px-3 py-1 angled-clip border border-white/30">
            {activeIndex + 1} de {displayedOrders.length}
          </span>
          
          {/* Next Arrow */}
          <button
            onClick={handleNext}
            disabled={activeIndex === displayedOrders.length - 1}
            className="w-10 h-10 flex items-center justify-center bg-white/60 backdrop-blur-md border border-white/40 angled-clip text-gray-600 hover:bg-white/80 hover:text-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-md"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      )}
    </div>
  );
}