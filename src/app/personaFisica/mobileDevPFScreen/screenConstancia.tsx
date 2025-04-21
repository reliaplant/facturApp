'use client';

import { motion, AnimatePresence } from 'framer-motion';

export default function ScreenConstancia() {
  const constanciaData = {
    rfc: 'XAXX010101000',
    nombre: 'JUAN PÉREZ RODRÍGUEZ',
    regimen: 'Régimen de Actividades Empresariales y Profesionales',
    fechaAlta: '15/03/2015',
    domicilio: 'AV. REFORMA 123, COL. JUÁREZ, CDMX',
    actualizada: '10/04/2023'
  };

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key="constancia"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3 }}
        className="h-full"
      >
        <div className="text-center mb-4">
          <h3 className="text-lg font-semibold text-zinc-800">Constancia Fiscal</h3>
          <p className="text-sm text-zinc-600">Situación fiscal actualizada</p>
        </div>
        
        <div className="mb-4">
          <div className="bg-white rounded-lg shadow-sm border border-zinc-100 overflow-hidden">
            <div className="bg-gradient-to-r from-sky-500 to-purple-500 p-3 text-center">
              <h4 className="text-white font-medium">Constancia de Situación Fiscal</h4>
              <p className="text-white text-xs opacity-80">Servicio de Administración Tributaria</p>
            </div>
            
            <div className="p-4 space-y-3">
              <div>
                <p className="text-xs text-zinc-500">RFC:</p>
                <p className="text-sm font-medium text-zinc-800">{constanciaData.rfc}</p>
              </div>
              <div>
                <p className="text-xs text-zinc-500">Nombre:</p>
                <p className="text-sm font-medium text-zinc-800">{constanciaData.nombre}</p>
              </div>
              <div>
                <p className="text-xs text-zinc-500">Régimen fiscal:</p>
                <p className="text-sm font-medium text-zinc-800">{constanciaData.regimen}</p>
              </div>
              <div>
                <p className="text-xs text-zinc-500">Fecha de alta:</p>
                <p className="text-sm font-medium text-zinc-800">{constanciaData.fechaAlta}</p>
              </div>
              <div>
                <p className="text-xs text-zinc-500">Domicilio fiscal:</p>
                <p className="text-sm font-medium text-zinc-800">{constanciaData.domicilio}</p>
              </div>
              <div className="pt-2 border-t border-zinc-100">
                <p className="text-xs text-zinc-500">Última actualización:</p>
                <p className="text-sm font-medium text-zinc-800">{constanciaData.actualizada}</p>
              </div>
            </div>
          </div>
        </div>
        
        <motion.div
          className="flex justify-center"
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
        >
          <button className="bg-gradient-to-r from-sky-500 to-purple-500 text-white py-2 px-6 rounded-md text-sm font-medium">
            Descargar PDF
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
