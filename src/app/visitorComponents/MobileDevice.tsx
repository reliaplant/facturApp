'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { IoCheckmark } from 'react-icons/io5';
import { IoDocumentText } from 'react-icons/io5';
import { IoReceiptOutline } from 'react-icons/io5';
import { IoDocumentTextOutline } from 'react-icons/io5';

interface AccountingItem {
  type: string;
  status: string;
  date: string;
  icon: string;
}

export default function MobileDevice() {
  const [currentTime, setCurrentTime] = useState('');
  const [accountingItems] = useState<AccountingItem[]>([
    { 
      type: "Declaración mensual", 
      status: "Presentada", 
      date: "Mayo 2023", 
      icon: "check" 
    },
    { 
      type: "Opinión de cumplimiento", 
      status: "Positiva", 
      date: "Actualizada", 
      icon: "check" 
    },
    { 
      type: "Constancia fiscal", 
      status: "Disponible", 
      date: "Marzo 2025", 
      icon: "document" 
    },
  ]);

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
    <div className="relative w-[280px] h-[560px]"> {/* Reduced device size */}
      <div className="absolute inset-0 bg-black rounded-[35px] p-3 shadow-2xl"> {/* Adjusted border radius */}
        <div className="relative bg-zinc-50 w-full h-full rounded-[28px] overflow-hidden">
          {/* Status bar */}
          <div className="absolute top-0 w-full px-4 py-1.5 flex justify-between items-center bg-zinc-100/80 backdrop-blur-sm">
            <span className="text-zinc-700 text-xs">{currentTime}</span>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full border border-zinc-400"></div>
              <div className="w-3 h-3 rounded-full border border-zinc-400"></div>
            </div>
          </div>
          

          <div className="h-full pt-10 pb-4 px-3"> {/* Reduced padding */}
            {/* Status section - changed check color to green */}
            <motion.div className="text-center mb-4"> {/* Reduced margin */}
              <p className="text-zinc-600 text-xs mb-2">Estado fiscal</p>
              <div className="flex items-center justify-center">
                <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-emerald-500 mb-2 shadow-md">
                  <IoCheckmark className="text-white text-lg" />
                </span>
              </div>
              <h2 className="text-xl font-bold text-zinc-800">Al día</h2>
              <p className="text-emerald-600 text-xs">Cumplimiento 100%</p>
            </motion.div>

            {/* Quick actions */}
            <div className="flex justify-center space-x-3 mb-4"> {/* Reduced spacing */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="bg-zinc-100 border border-zinc-200 shadow-sm rounded-lg p-2 text-zinc-700 text-xs flex items-center gap-1.5 hover:bg-violet-50 hover:border-violet-200 transition-colors"
              >
                <IoReceiptOutline className="text-base text-violet-600" />
                Ver facturas
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="bg-zinc-100 border border-zinc-200 shadow-sm rounded-lg p-2 text-zinc-700 text-xs flex items-center gap-1.5 hover:bg-violet-50 hover:border-violet-200 transition-colors"
              >
                <IoDocumentTextOutline className="text-base text-violet-600" />
                Declaraciones
              </motion.button>
            </div>

            {/* Accounting items - changed check colors to green */}
            <div className="space-y-2"> {/* Reduced spacing */}
              <h3 className="text-zinc-600 text-xs mb-3">Situación fiscal</h3>
              {accountingItems.map((item, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-zinc-100 shadow-sm rounded-lg p-3 border border-zinc-200"
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-zinc-700 text-xs font-medium">{item.type}</span>
                    <span className="text-emerald-600 text-xs font-bold flex items-center">
                      {item.status} {item.icon === "check" && 
                        <span className="ml-1 bg-emerald-500 text-white rounded-full w-4 h-4 flex items-center justify-center">
                          <IoCheckmark className="text-xs" />
                        </span>
                      }
                      {item.icon === "document" && 
                        <IoDocumentText className="ml-1 text-base text-violet-600" />
                      }
                    </span>
                  </div>
                  <div className="text-zinc-500 text-xs">
                    {item.date}
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Navigation dots */}
            <div className="absolute bottom-4 left-0 right-0 flex justify-center space-x-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-violet-500"></div>
              <div className="w-1.5 h-1.5 rounded-full bg-zinc-300"></div>
              <div className="w-1.5 h-1.5 rounded-full bg-zinc-300"></div>
            </div>
          </div>
        </div>
      </div>
      {/* Removed floating card section */}
    </div>
  );
}
