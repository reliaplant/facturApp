'use client';

import { motion, AnimatePresence } from 'framer-motion';

export default function ScreenOpinion() {
  const estatus = 'Positiva';
  const fecha = '15/05/2023';
  
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key="opinion"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3 }}
        className="h-full"
      >
        <div className="text-center mb-4">
          <h3 className="text-lg font-semibold text-zinc-800">Opinión de Cumplimiento</h3>
          <p className="text-sm text-zinc-600">Estatus ante el SAT</p>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border border-zinc-100 p-4 mb-4">
          <div className="flex flex-col items-center justify-center">
            <div className="w-28 h-28 rounded-full flex items-center justify-center bg-emerald-100 mb-3">
              <svg 
                className="h-16 w-16 text-emerald-600" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            
            <h4 className="text-lg font-medium text-zinc-800">Opinión {estatus}</h4>
            <p className="text-sm text-zinc-500 mt-1">Fecha de consulta: {fecha}</p>
            
            <div className="w-full mt-4 py-3 rounded-md bg-emerald-50 border border-emerald-200 text-center">
              <p className="text-sm font-medium text-emerald-800">
                Estás al corriente con tus obligaciones fiscales
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border border-zinc-100 p-4">
          <h4 className="text-sm font-medium text-zinc-700 mb-2">Verificaciones recientes</h4>
          <div className="space-y-3">
            {[
              { fecha: '15/05/2023', estatus: 'Positiva' },
              { fecha: '15/04/2023', estatus: 'Positiva' },
              { fecha: '15/03/2023', estatus: 'Positiva' }
            ].map((item, index) => (
              <motion.div 
                key={index}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex justify-between items-center border-b border-zinc-100 pb-2"
              >
                <p className="text-sm text-zinc-500">{item.fecha}</p>
                <span className="px-2 py-1 bg-emerald-100 text-emerald-800 text-xs rounded-full">
                  {item.estatus}
                </span>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
