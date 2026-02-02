import ContactButton from './ContactButton';
import Image from 'next/image';
import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-gray-50 text-gray-600">
      {/* Hero Footer Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
        <div className="max-w-3xl mx-auto text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-6">¿Listo para empezar?</h2>
          <p className="text-xl text-gray-600 mb-8">Únete al club del éxito</p>
          <ContactButton 
            buttonText="Comenzar ahora"
            origin="footer"
            modalTitle="Contáctanos"
          />
        </div>

        {/* Logo y copyright */}
        <div className="border-t border-gray-200 pt-8">
          <div className="flex flex-col items-center space-y-4">
            <Link href="/">
              <Image 
                src="/assets/logoKontia.png" 
                alt="Kontia Logo" 
                width={100} 
                height={35} 
                priority
              />
            </Link>
            <p className="text-sm text-gray-500">
              © 2026 Kontia. Todos los derechos reservados.
            </p>
            <div className="flex space-x-6">
              <Link href="/terminos" className="text-gray-400 hover:text-violet-500 transition-colors text-sm">
                Términos
              </Link>
              <Link href="/privacidad" className="text-gray-400 hover:text-violet-500 transition-colors text-sm">
                Privacidad
              </Link>
              <Link href="/cookies" className="text-gray-400 hover:text-violet-500 transition-colors text-sm">
                Cookies
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
