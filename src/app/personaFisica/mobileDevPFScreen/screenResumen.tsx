'use client';

import { motion, AnimatePresence } from 'framer-motion';

export default function ScreenResumen() {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key="resumen"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3 }}
        className="h-full"
      >
        <div className="text-center mb-3">
          <h3 className="text-lg font-semibold text-zinc-800">Resumen Fiscal 2026</h3>
          <p className="text-xs text-zinc-500">Vista general de tu situación</p>
        </div>

        {/* Cards 2x2 como en mi-contabilidad */}
        <div className="grid grid-cols-2 gap-2 mb-3">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="bg-white p-3 rounded-xl border border-zinc-100 shadow-sm"
          >
            <p className="text-[10px] text-zinc-500">Ingresos</p>
            <p className="text-lg font-bold text-zinc-900">$185,400</p>
            <p className="text-[9px] text-zinc-400">Total facturado</p>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.15 }}
            className="bg-white p-3 rounded-xl border border-zinc-100 shadow-sm"
          >
            <p className="text-[10px] text-zinc-500">Gastos</p>
            <p className="text-lg font-bold text-zinc-900">$62,350</p>
            <p className="text-[9px] text-zinc-400">Total deducible</p>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="bg-white p-3 rounded-xl border border-zinc-100 shadow-sm"
          >
            <p className="text-[10px] text-zinc-500">Utilidad</p>
            <p className="text-lg font-bold text-zinc-900">$123,050</p>
            <p className="text-[9px] text-zinc-400">Ingresos - Gastos</p>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.25 }}
            className="bg-white p-3 rounded-xl border border-zinc-100 shadow-sm"
          >
            <p className="text-[10px] text-zinc-500">Declaraciones</p>
            <p className="text-lg font-bold text-zinc-900">1</p>
            <p className="text-[9px] text-zinc-400">Presentadas</p>
          </motion.div>
        </div>

        {/* Impuestos como en mi-contabilidad */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-violet-50 rounded-xl p-3 mb-2"
        >
          <p className="text-[10px] text-zinc-600 font-medium mb-2">ISR (Impuesto sobre la Renta)</p>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="text-[9px] text-zinc-500">Pagado</p>
              <p className="text-sm font-bold text-zinc-800">$8,450</p>
            </div>
            <div>
              <p className="text-[9px] text-zinc-500">A Favor</p>
              <p className="text-sm font-bold text-emerald-600">$0</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="bg-violet-50 rounded-xl p-3"
        >
          <p className="text-[10px] text-zinc-600 font-medium mb-2">IVA (Impuesto al Valor Agregado)</p>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="text-[9px] text-zinc-500">Pagado</p>
              <p className="text-sm font-bold text-zinc-800">$19,688</p>
            </div>
            <div>
              <p className="text-[9px] text-zinc-500">A Favor</p>
              <p className="text-sm font-bold text-emerald-600">$2,340</p>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
