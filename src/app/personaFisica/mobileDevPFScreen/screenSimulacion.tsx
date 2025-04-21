'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';

export default function ScreenSimulacion() {
  const [ingresos, setIngresos] = useState('50000');
  const [gastos, setGastos] = useState('20000');
  
  // Simulated tax calculations based on Mexican tax rules
  const iva = Math.round(parseInt(ingresos) * 0.16);
  const ivaAcreditable = Math.round(parseInt(gastos) * 0.16);
  const ivaPagar = Math.max(0, iva - ivaAcreditable);
  
  // Simple ISR calculation (this would be more complex in a real app)
  const base = parseInt(ingresos) - parseInt(gastos);
  const isr = Math.round(base * 0.3); // Simplified rate
  
  const totalImpuestos = ivaPagar + isr;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key="simulacion"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3 }}
        className="h-full"
      >
        <div className="text-center mb-4">
          <h3 className="text-lg font-semibold text-zinc-800">Simulador de Impuestos</h3>
          <p className="text-sm text-zinc-600">Calcula tus próximos pagos</p>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow-sm border border-zinc-100 mb-3">
          <div className="space-y-3 mb-3">
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Ingresos del mes</label>
              <input 
                type="number"
                value={ingresos}
                onChange={(e) => setIngresos(e.target.value)}
                className="w-full h-8 px-3 bg-zinc-50 rounded border border-zinc-200 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Gastos deducibles</label>
              <input 
                type="number"
                value={gastos}
                onChange={(e) => setGastos(e.target.value)}
                className="w-full h-8 px-3 bg-zinc-50 rounded border border-zinc-200 text-sm"
              />
            </div>
          </div>
        </div>

        <motion.div 
          className="bg-white p-4 rounded-lg shadow-sm border border-zinc-100"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <h4 className="text-sm font-medium text-zinc-700 mb-3">Resultado de la simulación</h4>
          
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-zinc-600">IVA trasladado:</span>
              <span className="text-sm font-medium text-zinc-800">${iva.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-zinc-600">IVA acreditable:</span>
              <span className="text-sm font-medium text-zinc-800">-${ivaAcreditable.toLocaleString()}</span>
            </div>
            <div className="flex justify-between border-t pt-1">
              <span className="text-sm text-zinc-600">IVA a pagar:</span>
              <span className="text-sm font-medium text-zinc-800">${ivaPagar.toLocaleString()}</span>
            </div>
            
            <div className="border-t my-2"></div>
            
            <div className="flex justify-between">
              <span className="text-sm text-zinc-600">Base ISR:</span>
              <span className="text-sm font-medium text-zinc-800">${base.toLocaleString()}</span>
            </div>
            <div className="flex justify-between border-t pt-1">
              <span className="text-sm text-zinc-600">ISR provisional:</span>
              <span className="text-sm font-medium text-zinc-800">${isr.toLocaleString()}</span>
            </div>
            
            <div className="border-t border-zinc-200 my-2"></div>
            
            <div className="flex justify-between">
              <span className="text-sm font-medium text-zinc-800">Total a pagar:</span>
              <span className="text-sm font-bold text-purple-600">${totalImpuestos.toLocaleString()}</span>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
