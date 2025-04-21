import Image from "next/image";

export default function Services() {
  const steps = [
    {
      icon: "📋",
      title: "Registra tus datos",
      description: "Completa un formulario simple con tu información básica"
    },
    {
      icon: "✓",
      title: "Comienza a facturar",
      description: "Accede a todas las herramientas contables que necesitas"
    }
  ];

  return (
    <section id="services" className="">
      {/* Sección Original de Contabilidad */}
      <div className="py-20 px-8">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="order-2 md:order-1">
              <h3 className="text-2xl font-bold mb-4 !bg-gradient-to-r !from-zinc-700 !to-zinc-900 !text-transparent !bg-clip-text">
                ¿Por que debes usar contis?
              </h3>
              <p className="text-gray-600 mb-6">
                Ya seas un profesional independiente, un emprendedor o una empresa establecida, nuestros servicios se adaptan a tus necesidades específicas para ayudarte a mantener el control de tus finanzas y cumplir con tus obligaciones fiscales.
              </p>
              <ul className="space-y-2">
                {[
                  "Declaraciones mensuales y anuales",
                  "Facturación electrónica",
                  "Cálculo para pago de impuestos",
                  "Consultas a tu contador",
                  "Toda tu info en tu app",
                ].map((item, i) => (
                  <li key={i} className="flex items-center">
                    <span className="text-zinc-600 mr-2 flex-shrink-0">✓</span> {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="order-1 md:order-2">
              <div className="relative rounded-xl overflow-hidden shadow-xl">
                <Image
                  src="/assets/asesorContis.jpg"
                  alt="Usuario utilizando nuestra plataforma contable"
                  width={500}
                  height={400}
                  className="w-full h-auto"
                  objectFit="cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent"></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Nueva Sección de Cuadrícula */}
      <div className="py-20 px-8">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-4 h-[300px]">
            {/* Cuadro superior izquierdo */}
            <div className="bg-sky-100 rounded-3xl p-10 flex items-center justify-center">
              <h2 className="text-4xl font-bold text-zinc-800 leading-tight">
                Tu info contable, <br/>siempre disponible
              </h2>
            </div>

            {/* Cuadro superior derecho */}
            <div className="bg-purple-600 rounded-3xl p-10 flex items-center justify-center">
              <h2 className="text-4xl font-bold text-white leading-tight">
                ¿Todo listo para <br/>comenzar?
              </h2>
            </div>


            
          </div>
        </div>
      </div>
    </section>
  );
}
