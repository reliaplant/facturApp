'use client';

import { motion, AnimatePresence } from 'framer-motion';

export default function ScreenEmision() {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key="emision"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3 }}
        className="h-full"
      >
        <div className="text-center mb-4">
          <h3 className="text-lg font-semibold text-zinc-800">Emisión de Facturas</h3>
          <p className="text-sm text-zinc-600">CFDI 4.0</p>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border border-zinc-100 p-4 mb-4">
          <h4 className="text-sm font-medium text-zinc-700 mb-2">Nueva Factura</h4>
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Cliente</label>
              <div className="h-8 bg-zinc-50 rounded border border-zinc-200"></div>
            </div>
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Concepto</label>
              <div className="h-8 bg-zinc-50 rounded border border-zinc-200"></div>
            </div>
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Monto</label>
              <div className="h-8 bg-zinc-50 rounded border border-zinc-200"></div>
            </div>
          </div>
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="w-full mt-4 bg-gradient-to-r from-sky-500 to-purple-500 text-white py-2 rounded-md text-sm font-medium"
          >
            Emitir factura
          </motion.button>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-zinc-100 p-4">
          <h4 className="text-sm font-medium text-zinc-700 mb-2">Últimas facturas emitidas</h4>
          <div className="space-y-3">
            {['FAC-2023-145', 'FAC-2023-144', 'FAC-2023-143'].map((folio, index) => (
              <motion.div 
                key={index}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex justify-between items-center border-b border-zinc-100 pb-2"
              >
                <div>
                  <p className="text-sm font-medium text-zinc-800">{folio}</p>
                  <p className="text-xs text-zinc-500">Emitida: {new Date().toLocaleDateString()}</p>
                </div>
                <span className="text-sm font-medium text-emerald-600">$1,{index + 2}00.00</span>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
