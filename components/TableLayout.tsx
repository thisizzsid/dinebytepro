"use client";

import { motion } from "framer-motion";
import { Table } from "@/types/models";
import { Users, AlertCircle, CheckCircle2, Activity } from "lucide-react";
import { updateTable } from "@/lib/firebase/tables";
import { useParams } from "next/navigation";
import { useRef } from "react";

interface TableLayoutProps {
  tables: Table[];
}

export default function TableLayout({ tables }: TableLayoutProps) {
  const { slug } = useParams<{ slug: string }>();
  const containerRef = useRef<HTMLDivElement>(null);

  const handleDragEnd = async (table: Table, info: any) => {
    if (!containerRef.current) return;
    
    const containerRect = containerRef.current.getBoundingClientRect();
    
    // Use the absolute pointer position relative to the container
    const relativeX = info.point.x - containerRect.left;
    const relativeY = info.point.y - containerRect.top;

    // Convert to percentage
    let newX = (relativeX / containerRect.width) * 100;
    let newY = (relativeY / containerRect.height) * 100;

    // Offset by half the table size (approx 5-8% depending on viewport) 
    // to center the drop point
    newX = newX - 5; 
    newY = newY - 5;

    // Clamp values between 0 and 85 to keep tables within view
    const clampedX = Math.max(0, Math.min(85, newX));
    const clampedY = Math.max(0, Math.min(85, newY));

    if (table.id) {
      await updateTable(slug, table.id, { x: clampedX, y: clampedY });
    }
  };

  return (
    <div 
      ref={containerRef}
      className="relative w-full aspect-video bg-gray-50/50 rounded-[3rem] border-2 border-dashed border-gray-100 overflow-hidden group/floor"
    >
      {/* Floor Pattern Decoration */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[radial-gradient(#000_1px,transparent_1px)] [background-size:40px_40px]" />
      
      {tables.length === 0 ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-300">
          <AlertCircle size={48} className="mb-4 opacity-20" />
          <p className="font-black text-xs uppercase tracking-widest">No tables mapped yet</p>
        </div>
      ) : (
        tables.map((table) => (
          <motion.div
            key={table.id}
            drag
            dragMomentum={false}
            dragElastic={0.1}
            onDragEnd={(_, info) => handleDragEnd(table, info)}
            initial={{ 
              left: `${table.x || Math.random() * 80}%`, 
              top: `${table.y || Math.random() * 70}%` 
            }}
            animate={{ 
              left: `${table.x ?? Math.random() * 80}%`, 
              top: `${table.y ?? Math.random() * 70}%` 
            }}
            whileHover={{ scale: 1.05, zIndex: 10 }}
            whileDrag={{ scale: 1.1, zIndex: 50, cursor: 'grabbing' }}
            className={`absolute w-32 h-32 md:w-40 md:h-40 rounded-[2.5rem] shadow-2xl flex flex-col items-center justify-center cursor-grab transition-shadow ${
              !table.isAvailable 
                ? 'bg-red-600 text-white shadow-red-600/30' 
                : table.reserved 
                ? 'bg-amber-500 text-white shadow-amber-500/30' 
                : 'bg-white text-gray-900 shadow-gray-200/50 border border-gray-100'
            }`}
          >
            <div className={`w-12 h-12 md:w-14 md:h-14 rounded-2xl flex items-center justify-center mb-3 font-black text-xl md:text-2xl ${
              !table.isAvailable || table.reserved ? 'bg-white/20' : 'bg-gray-100'
            }`}>
              {table.tableNumber}
            </div>
            
            <div className="flex items-center gap-1.5">
              <Users size={12} className={!table.isAvailable || table.reserved ? 'opacity-60' : 'text-gray-400'} />
              <span className="text-[10px] font-black tracking-widest uppercase">{table.capacity} SEATS</span>
            </div>

            <div className={`mt-2 flex items-center gap-1.5 px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest ${
              !table.isAvailable ? 'bg-white/10 text-white' : table.reserved ? 'bg-white/10 text-white' : 'bg-green-50 text-green-600'
            }`}>
              {!table.isAvailable ? 'OCCUPIED' : table.reserved ? 'RESERVED' : 'READY'}
            </div>

            {/* Drag Handle Decoration */}
            <div className="absolute top-2 left-1/2 -translate-x-1/2 w-8 h-1 bg-current opacity-10 rounded-full" />
          </motion.div>
        ))
      )}

      {/* Grid Overlay Legend */}
      <div className="absolute bottom-6 right-6 flex items-center gap-6 bg-white/80 backdrop-blur-md px-6 py-3 rounded-2xl border border-gray-100 shadow-xl">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
          <span className="text-[9px] font-black text-gray-400 uppercase">Available</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-red-600" />
          <span className="text-[9px] font-black text-gray-400 uppercase">Occupied</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
          <span className="text-[9px] font-black text-gray-400 uppercase">Reserved</span>
        </div>
      </div>
      
      <div className="absolute top-6 left-6 flex items-center gap-3 bg-gray-900 text-white px-5 py-2.5 rounded-2xl shadow-2xl opacity-0 group-hover/floor:opacity-100 transition-opacity duration-500">
        <Activity size={14} className="text-orange-500" />
        <span className="text-[9px] font-black uppercase tracking-widest">DRAG TABLES TO ORGANIZE FLOOR</span>
      </div>
    </div>
  );
}
