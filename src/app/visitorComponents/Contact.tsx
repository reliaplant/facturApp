import Image from 'next/image';
import { FaLinkedin, FaTwitter, FaInstagram } from 'react-icons/fa';

export default function Contact() {
  return (
    <div className="relative overflow-hidden">
      <div className="grid lg:grid-cols-2">
        {/* Left Column: Content */}
        <div className="relative">
          {/* Upper Section - Emotional Message */}
          <div className="bg-gradient-to-r from-sky-200 via-sky-400 to-purple-500 px-10 py-24 lg:min-h-[400px] flex items-center">
            <div className="max-w-xl mx-auto lg:mx-0">
              <h2 className="text-4xl lg:text-6xl font-bold text-white leading-tight">
                Transforma tus finanzas en historias de éxito
                <span className="text-black">.</span>
              </h2>
            </div>
          </div>

          {/* Lower Section - Contact Info */}
          <div className="bg-zinc-800 px-10 py-20">
            <div className="max-w-xl mx-auto lg:mx-0">
              <h3 className="text-2xl text-white font-medium mb-10 flex items-center">
                Estamos aquí para tu tranquilidad
              </h3>
              
              {/* Social Icons */}
              <div className="flex space-x-8 mb-10">
                {[
                  { icon: FaLinkedin, href: '#' },
                  { icon: FaTwitter, href: '#' },
                  { icon: FaInstagram, href: '#' }
                ].map((social, index) => (
                  <a
                    key={index}
                    href={social.href}
                    className="text-white hover:text-purple-300 transition-colors"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <social.icon className="w-6 h-6" />
                  </a>
                ))}
              </div>

              {/* Contact Email */}
              <a 
                href="mailto:contacto@kontia.mx"
                className="text-white text-lg hover:text-purple-300 transition-colors"
              >
                info@kontia.mx
              </a>
            </div>
          </div>
        </div>

        {/* Right Column: Image */}
        <div className="relative min-h-[400px] lg:h-full">
          <div className="absolute inset-0">
            <Image
              src="/assets/usuarioContis.jpg"
              alt="Asesor financiero Contis"
              fill
              className="object-cover"
              priority
            />
            {/* Updated overlay with gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 to-black/30"></div>
          </div>
        </div>
      </div>
    </div>
  );
}
