'use client';

import { motion, AnimatePresence } from 'framer-motion';

export default function ScreenExtranjeras() {
  const facturas = [
    { 
      emisor: 'Adobe Inc.', 
      pais: '🇺🇸',
      concepto: 'Creative Cloud',
      fecha: '01/01/2026',
      mxn: '$1,099.80',
      deducible: true
    },
    { 
      emisor: 'OpenAI', 
      pais: '🇺🇸',
      concepto: 'ChatGPT Plus',
      fecha: '12/12/2025',
      mxn: '$400.00',
      deducible: true
    },
    { 
      emisor: 'Figma Inc.', 
      pais: '🇺🇸',
      concepto: 'Professional',
      fecha: '01/12/2025',
      mxn: '$300.00',
      deducible: true
    },
    { 
      emisor: 'Notion Labs', 
      pais: '🇺🇸',
      concepto: 'Plan Plus',
      fecha: '15/11/2025',
      mxn: '$200.00',
      deducible: true
    },
  ];

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key="extranjeras"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3 }}
        className="h-full"
      >
        <div className="text-center mb-3">
          <h3 className="text-lg font-semibold text-zinc-800">Facturas Extranjeras</h3>
          <p className="text-xs text-zinc-500">Pagos a proveedores del exterior</p>
        </div>

        <p className="text-[10px] text-zinc-500 mb-2">4 facturas registradas</p>

        <div className="space-y-2 overflow-y-auto max-h-[380px] scrollbar-hide">
          {facturas.map((factura, index) => (
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
                    <p className="text-sm font-medium text-zinc-800">{factura.emisor}</p>
                    <span className="text-[9px] px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded font-medium">
                      {factura.pais} Extranjera
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <p className="text-[10px] text-zinc-400">{factura.fecha}</p>
                    <span className="text-[9px] font-bold text-violet-600">{factura.concepto}</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-zinc-600">-{factura.mxn}</p>
                  {factura.deducible && (
                    <span className="text-[9px] px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded font-medium">
                      Deducible
                    </span>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
