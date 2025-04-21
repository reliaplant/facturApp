'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';

export default function ScreenHistorial() {
  const [activeTab, setActiveTab] = useState('declaraciones');
  
  const tabs = [
    { id: 'declaraciones', label: 'Declaraciones' },
    { id: 'facturas', label: 'Facturas' },
    { id: 'pagos', label: 'Pagos' }
  ];
  
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key="historial"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3 }}
        className="h-full"
      >
        <div className="text-center mb-4">
          <h3 className="text-lg font-semibold text-zinc-800">Historial Fiscal</h3>
          <p className="text-sm text-zinc-600">Toda tu información en un solo lugar</p>
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
        
        <div className="space-y-3 overflow-y-auto max-h-[370px] scrollbar-hide">
          {activeTab === 'declaraciones' && (
            <>
              {[
                { periodo: 'Mayo 2023', tipo: 'Mensual', fecha: '17/06/2023', monto: '$3,450' },
                { periodo: 'Abril 2023', tipo: 'Mensual', fecha: '17/05/2023', monto: '$2,980' },
                { periodo: 'Marzo 2023', tipo: 'Mensual', fecha: '17/04/2023', monto: '$3,210' },
                { periodo: 'Febrero 2023', tipo: 'Mensual', fecha: '17/03/2023', monto: '$2,760' },
                { periodo: 'Enero 2023', tipo: 'Mensual', fecha: '17/02/2023', monto: '$2,540' },
                { periodo: '2022', tipo: 'Anual', fecha: '30/04/2023', monto: '$1,230 a favor' },
              ].map((item, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-white p-3 rounded-lg shadow-sm border border-zinc-100"
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm font-medium text-zinc-800">{item.periodo}</p>
                      <p className="text-xs text-zinc-500">Tipo: {item.tipo}</p>
                    </div>
                    <p className="text-sm font-medium text-zinc-700">{item.monto}</p>
                  </div>
                  <p className="text-xs text-zinc-500 mt-1">Presentada: {item.fecha}</p>
                </motion.div>
              ))}
            </>
          )}
          
          {activeTab === 'facturas' && (
            <>
              {[
                { cliente: 'Empresas ABC', fecha: '15/05/2023', monto: '$5,800.00' },
                { cliente: 'Servicios XYZ', fecha: '10/05/2023', monto: '$3,200.00' },
                { cliente: 'Consultoría Legal', fecha: '02/05/2023', monto: '$7,500.00' },
                { cliente: 'Distribuidora Nacional', fecha: '28/04/2023', monto: '$4,150.00' },
                { cliente: 'Servicios Digitales', fecha: '20/04/2023', monto: '$2,800.00' },
                { cliente: 'Comercializadora MX', fecha: '15/04/2023', monto: '$6,340.00' },
              ].map((item, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-white p-3 rounded-lg shadow-sm border border-zinc-100"
                >
                  <div className="flex justify-between items-center">
                    <p className="text-sm font-medium text-zinc-800">{item.cliente}</p>
                    <p className="text-sm font-medium text-zinc-700">{item.monto}</p>
                  </div>
                  <p className="text-xs text-zinc-500 mt-1">Emitida: {item.fecha}</p>
                </motion.div>
              ))}
            </>
          )}
          
          {activeTab === 'pagos' && (
            <>
              {[
                { concepto: 'IVA Mensual', periodo: 'Mayo 2023', fecha: '17/06/2023', monto: '$2,240.00' },
                { concepto: 'ISR Provisional', periodo: 'Mayo 2023', fecha: '17/06/2023', monto: '$1,210.00' },
                { concepto: 'IVA Mensual', periodo: 'Abril 2023', fecha: '17/05/2023', monto: '$1,880.00' },
                { concepto: 'ISR Provisional', periodo: 'Abril 2023', fecha: '17/05/2023', monto: '$1,100.00' },
                { concepto: 'IVA Mensual', periodo: 'Marzo 2023', fecha: '17/04/2023', monto: '$2,050.00' },
                { concepto: 'ISR Provisional', periodo: 'Marzo 2023', fecha: '17/04/2023', monto: '$1,160.00' },
              ].map((item, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-white p-3 rounded-lg shadow-sm border border-zinc-100"
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm font-medium text-zinc-800">{item.concepto}</p>
                      <p className="text-xs text-zinc-500">Periodo: {item.periodo}</p>
                    </div>
                    <p className="text-sm font-medium text-zinc-700">{item.monto}</p>
                  </div>
                  <p className="text-xs text-zinc-500 mt-1">Pagado: {item.fecha}</p>
                </motion.div>
              ))}
            </>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
