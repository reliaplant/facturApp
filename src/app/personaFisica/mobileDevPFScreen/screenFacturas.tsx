'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';

export default function ScreenFacturas() {
  const [activeTab, setActiveTab] = useState('emitidas');
  
  const tabs = [
    { id: 'emitidas', label: 'Emitidas' },
    { id: 'recibidas', label: 'Recibidas' }
  ];

  const emitidas = [
    { cliente: 'Empresas ABC S.A.', fecha: '15/01/2026', monto: '$25,800.00', categoria: 'SERVICIOS' },
    { cliente: 'Consultoría MX', fecha: '10/01/2026', monto: '$18,500.00', categoria: 'HONORARIOS' },
    { cliente: 'Servicios Tech', fecha: '05/01/2026', monto: '$32,000.00', categoria: 'SERVICIOS' },
  ];

  const recibidas = [
    { emisor: 'Renta de Oficina SA', fecha: '01/01/2026', monto: '$12,000.00', deducible: true, categoria: 'RENTA' },
    { emisor: 'CFE Suministrador', fecha: '05/01/2026', monto: '$1,850.00', deducible: true, categoria: 'SERVICIOS' },
    { emisor: 'Telmex', fecha: '10/01/2026', monto: '$899.00', deducible: true, categoria: 'TELEFONÍA' },
  ];
  
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key="facturas"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3 }}
        className="h-full"
      >
        <div className="text-center mb-3">
          <h3 className="text-lg font-semibold text-zinc-800">Facturas</h3>
          <p className="text-xs text-zinc-500">Emitidas y recibidas 2026</p>
        </div>
        
        <div className="flex mb-3 bg-zinc-100 rounded-lg p-1">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${
                activeTab === tab.id 
                  ? 'bg-white text-zinc-800 shadow-sm' 
                  : 'text-zinc-500 hover:text-zinc-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        
        <div className="space-y-2 overflow-y-auto max-h-[350px] scrollbar-hide">
          {activeTab === 'emitidas' && (
            <>
              {emitidas.map((item, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-white p-3 rounded-lg shadow-sm border border-zinc-100"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-zinc-800 truncate">{item.cliente}</p>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-[10px] text-zinc-400">{item.fecha}</p>
                        <span className="text-[9px] font-bold text-violet-600">{item.categoria}</span>
                      </div>
                    </div>
                    <p className="text-sm font-semibold text-violet-600">+{item.monto}</p>
                  </div>
                </motion.div>
              ))}
              <p className="text-[10px] text-violet-600 text-center pt-2">Ver las 12 existentes</p>
            </>
          )}
          
          {activeTab === 'recibidas' && (
            <>
              {recibidas.map((item, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-white p-3 rounded-lg shadow-sm border border-zinc-100"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium text-zinc-800 truncate">{item.emisor}</p>
                        {item.deducible && (
                          <span className="text-[9px] px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded font-medium">
                            Deducible
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-[10px] text-zinc-400">{item.fecha}</p>
                        <span className="text-[9px] font-bold text-violet-600">{item.categoria}</span>
                      </div>
                    </div>
                    <p className="text-sm font-semibold text-zinc-600">-{item.monto}</p>
                  </div>
                </motion.div>
              ))}
              <p className="text-[10px] text-violet-600 text-center pt-2">Ver las 28 existentes</p>
            </>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
