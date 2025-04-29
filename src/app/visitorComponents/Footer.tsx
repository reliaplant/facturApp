import { FaLinkedin, FaTwitter, FaInstagram } from 'react-icons/fa';
import ContactButton from './ContactButton';
import Image from 'next/image';
import Link from 'next/link';

export default function Footer() {
  const links = {
    personaFisica: [
      { title: "Declaraciones mensuales", href: "#" },
      { title: "Declaración anual", href: "#" },
      { title: "Facturación electrónica", href: "#" },
      { title: "Cálculo de impuestos", href: "#" },
      { title: "Asesoría personal", href: "#" }
    ],
    personaMoral: [
      { title: "Contabilidad empresarial", href: "#" },
      { title: "Estados financieros", href: "#" },
      { title: "Nómina y prestaciones", href: "#" },
      { title: "Auditoría fiscal", href: "#" },
      { title: "Planeación fiscal", href: "#" }
    ],
    empresa: [
      { title: "Sobre nosotros", href: "#" },
      { title: "Contacto", href: "#contact" },
      { title: "Blog", href: "#" },
      { title: "Preguntas frecuentes", href: "#" }
    ],
    legal: [
      { title: "Términos y condiciones", href: "#" },
      { title: "Política de privacidad", href: "#" },
      { title: "Aviso de privacidad", href: "#" }
    ]
  };

  return (
    <footer className="bg-gray-50 text-gray-600">
      {/* Hero Footer Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
        <div className="max-w-3xl mx-auto text-center mb-20">
          <h2 className="text-4xl font-bold text-gray-900 mb-6">¿Listo para empezar?</h2>
          <p className="text-xl text-gray-600 mb-8">Únete al club del éxito</p>
          <ContactButton 
            buttonText="Comenzar ahora"
            origin="footer"
            modalTitle="Contáctanos"
          />
        </div>

        {/* Links Grid - Asymmetric Layout */}
        <div className="grid grid-cols-1 md:grid-cols-6 gap-x-8 gap-y-16 border-t border-gray-200 pt-16">
          {/* Larger column for main services */}
          <div className="md:col-span-2">
            <Link href="/" className="block mb-6">
              <Image 
                src="/assets/logoKontia.png" 
                alt="Kontia Logo" 
                width={140} 
                height={50} 
                priority
              />
            </Link>
            <p className="text-gray-600 mb-6">
              Simplificamos tus finanzas para que te enfoques en lo que más importa: hacer crecer tu negocio.
            </p>
            <div className="flex space-x-5">
              <a href="#" className="text-gray-400 hover:text-violet-500">
                <FaLinkedin className="h-6 w-6" />
              </a>
              <a href="#" className="text-gray-400 hover:text-violet-500">
                <FaTwitter className="h-6 w-6" />
              </a>
              <a href="#" className="text-gray-400 hover:text-violet-500">
                <FaInstagram className="h-6 w-6" />
              </a>
            </div>
          </div>

          {/* Service Links */}
          <div className="md:col-span-1">
            <h3 className="text-base font-semibold text-gray-900 mb-6">
              Persona Física
            </h3>
            <ul className="space-y-4">
              {links.personaFisica.map((link) => (
                <li key={link.title}>
                  <a href={link.href} className="text-sm hover:text-violet-500 transition-colors">
                    {link.title}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div className="md:col-span-1">
            <h3 className="text-base font-semibold text-gray-900 mb-6">
              Persona Moral
            </h3>
            <ul className="space-y-4">
              {links.personaMoral.map((link) => (
                <li key={link.title}>
                  <a href={link.href} className="text-sm hover:text-violet-500 transition-colors">
                    {link.title}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div className="md:col-span-1">
            <h3 className="text-base font-semibold text-gray-900 mb-6">
              Empresa
            </h3>
            <ul className="space-y-4">
              {links.empresa.map((link) => (
                <li key={link.title}>
                  <a href={link.href} className="text-sm hover:text-violet-500 transition-colors">
                    {link.title}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div className="md:col-span-1">
            <h3 className="text-base font-semibold text-gray-900 mb-6">
              Legal
            </h3>
            <ul className="space-y-4">
              {links.legal.map((link) => (
                <li key={link.title}>
                  <a href={link.href} className="text-sm hover:text-violet-500 transition-colors">
                    {link.title}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Footer Bottom */}
        <div className="mt-16 pt-8 border-t border-gray-200">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <p className="text-sm text-gray-500">
              © {new Date().getFullYear()} Kontia. Todos los derechos reservados.
            </p>
            <div className="flex space-x-6">
              <a href="#" className="text-gray-400 hover:text-violet-500 transition-colors">
                Términos
              </a>
              <a href="#" className="text-gray-400 hover:text-violet-500 transition-colors">
                Privacidad
              </a>
              <a href="#" className="text-gray-400 hover:text-violet-500 transition-colors">
                Cookies
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
