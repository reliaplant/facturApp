'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

export default function MobileDevice() {
  const [currentTime, setCurrentTime] = useState('');
  
  const declaraciones = [
    { mes: 'Enero 2026', tipo: 'Ord.', monto: '$12,450', pagada: false },
    { mes: 'Diciembre 2025', tipo: 'Ord.', monto: '$8,320', pagada: true },
    { mes: 'Noviembre 2025', tipo: 'Ord.', monto: '$9,150', pagada: true },
  ];

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('es-MX', { 
        hour: '2-digit', 
        minute: '2-digit' 
      }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative w-[280px] h-[560px]">
      <div className="absolute inset-0 bg-black rounded-[35px] p-3 shadow-2xl">
        <div className="relative bg-zinc-50 w-full h-full rounded-[28px] overflow-hidden">
          {/* Status bar */}
          <div className="absolute top-0 w-full px-4 py-1.5 flex justify-between items-center bg-zinc-100">
            <span className="text-zinc-700 text-xs">{currentTime}</span>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full border border-zinc-400"></div>
              <div className="w-3 h-3 rounded-full border border-zinc-400"></div>
            </div>
          </div>

          <div className="h-full pt-10 pb-4 px-3">
            {/* Header */}
            <div className="text-center mb-3">
              <h3 className="text-lg font-semibold text-zinc-800">Mi Contabilidad</h3>
              <p className="text-xs text-zinc-500">Portal del cliente</p>
            </div>

            {/* Banner de pago pendiente */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-emerald-700 p-3 rounded-xl text-white mb-3"
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="h-7 w-7 bg-emerald-600 rounded-full flex items-center justify-center">
                  <span className="text-xs">💵</span>
                </div>
                <div>
                  <p className="text-[10px] font-semibold">Pago pendiente: Enero 2026</p>
                  <p className="text-[9px] opacity-80">Monto: $12,450.00</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button className="flex-1 text-[10px] bg-emerald-600 py-1.5 rounded-lg">📥 Línea de Captura</button>
                <button className="flex-1 text-[10px] bg-white text-emerald-700 py-1.5 rounded-lg font-medium">¿Ya pagaste?</button>
              </div>
            </motion.div>

            {/* Info fiscal */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="bg-white rounded-xl border border-zinc-100 p-3 mb-3"
            >
              <div className="flex gap-4 text-[10px]">
                <div>
                  <p className="text-zinc-400">RFC</p>
                  <p className="font-bold text-zinc-800">XAXX010101000</p>
                </div>
                <div>
                  <p className="text-zinc-400">Régimen</p>
                  <p className="font-medium text-zinc-800 truncate">Servicios Prof.</p>
                </div>
              </div>
            </motion.div>

            {/* Estado de declaraciones */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white rounded-xl border border-zinc-100 p-3"
            >
              <p className="text-xs font-medium text-zinc-700 mb-2 flex items-center gap-1">
                📅 Estado de Declaraciones
              </p>
              <div className="space-y-2">
                {declaraciones.map((decl, index) => (
                  <div key={index} className="flex items-center justify-between py-1.5 border-b border-zinc-50 last:border-0">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-medium text-zinc-800">{decl.mes}</p>
                        <span className="text-[9px] font-bold text-violet-600">{decl.tipo}</span>
                      </div>
                      <p className="text-[10px] text-zinc-400">
                        {decl.pagada ? 'Pagada' : 'Pendiente de pago'}
                      </p>
                    </div>
                    <p className={`text-xs font-semibold ${decl.pagada ? 'text-emerald-600' : 'text-amber-600'}`}>
                      {decl.monto}
                    </p>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
