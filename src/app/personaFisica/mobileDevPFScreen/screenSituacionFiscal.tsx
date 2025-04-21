'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { IoCheckmark, IoDownloadOutline, IoDocumentTextOutline } from 'react-icons/io5';

export default function ScreenSituacionFiscal() {
  const items = [
    { 
      titulo: "Constancia fiscal", 
      estatus: "Disponible", 
      statusColor: "bg-emerald-100 text-emerald-800", 
      fecha: "Actualizada" 
    },
    { 
      titulo: "Opinión de cumplimiento", 
      estatus: "Positiva", 
      statusColor: "bg-emerald-100 text-emerald-800", 
      fecha: "30/10/2023" 
    },
    { 
      titulo: "Régimen fiscal", 
      estatus: "Activo", 
      statusColor: "bg-blue-100 text-blue-800", 
      fecha: "RESICO" 
    }
  ];

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key="situacion-fiscal"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3 }}
        className="h-full"
      >
        <div className="text-center mb-4">
          <h3 className="text-lg font-semibold text-zinc-800">Situación Fiscal</h3>
          <p className="text-sm text-zinc-600">Estado actualizado</p>
        </div>
        
        {/* Status summary */}
        <motion.div className="text-center mb-6">
          <div className="flex items-center justify-center">
            <span className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-500 mb-2 shadow-md">
              <IoCheckmark className="text-white text-xl" />
            </span>
          </div>
          <h2 className="text-xl font-bold text-zinc-800">Al día</h2>
          <p className="text-emerald-600 text-xs">Cumplimiento 100%</p>
        </motion.div>
        
        {/* Action buttons */}
        <div className="flex justify-center space-x-3 mb-5">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="bg-zinc-100 border border-zinc-200 shadow-sm rounded-lg p-2 text-zinc-700 text-xs flex items-center gap-1.5 hover:bg-violet-50 hover:border-violet-200 transition-colors"
          >
            <IoDownloadOutline className="text-base text-violet-600" />
            Descargar
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="bg-zinc-100 border border-zinc-200 shadow-sm rounded-lg p-2 text-zinc-700 text-xs flex items-center gap-1.5 hover:bg-violet-50 hover:border-violet-200 transition-colors"
          >
            <IoDocumentTextOutline className="text-base text-violet-600" />
            Constancia
          </motion.button>
        </div>
        
        <div className="space-y-2 overflow-y-auto max-h-[220px] scrollbar-hide">
          {items.map((item, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white p-3 rounded-lg shadow-sm border border-zinc-100"
            >
              <div className="flex justify-between items-center mb-1">
                <span className="text-zinc-700 text-xs font-medium">{item.titulo}</span>
                <span className={`px-2 py-1 ${item.statusColor} text-xs rounded-full`}>
                  {item.estatus}
                </span>
              </div>
              <div className="text-zinc-500 text-xs">
                {item.fecha}
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
