'use client';
import ContactButton from './ContactButton';

export default function Navbar() {
  return (
    <header className="bg-white shadow-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <div className="flex-shrink-0 flex items-center">
            <span className="text-2xl font-bold text-zinc-800">Contis<span className="text-zinc-600">MX</span></span>
          </div>
        
          <div className="flex space-x-4">
            <a
              href="/clientes"
              className="inline-flex items-center px-4 py-2 border border-zinc-300 text-sm font-medium rounded-full text-zinc-700 bg-white hover:bg-zinc-50"
            >
              Área de clientes
            </a>
            
            {/* Make sure this button opens the modal directly without navigation */}
            <ContactButton 
              buttonText="Empieza ahora" 
              origin="navbar"
              modalTitle="Contáctanos para comenzar" 
            />
          </div>
        </div>
      </div>
    </header>
  );
}
