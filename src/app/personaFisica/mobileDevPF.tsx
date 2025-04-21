'use client';

import { useState, useEffect, ReactNode } from 'react';

interface MobileDevicePFProps {
  children: ReactNode;
}

export default function MobileDevicePF({ children }: MobileDevicePFProps) {
  const [currentTime, setCurrentTime] = useState('');

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
          

          <div className="h-full pt-5 pb-4 px-3">
            {/* Content will be injected as children */}
            {children}

          </div>
        </div>
      </div>
    </div>
  );
}
