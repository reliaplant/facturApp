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
      <div className="py-12 md:py-20 px-4 md:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-center">
            <div className="order-2 md:order-1">
              <h3 className="text-xl md:text-2xl font-bold mb-4 !bg-gradient-to-r !from-zinc-700 !to-zinc-900 !text-transparent !bg-clip-text">
                Contabilidad sin dolores de cabeza
              </h3>
              <p className="text-gray-600 mb-6">
                Deja de perseguir fechas límite y preocuparte por multas. Nos encargamos de todo para que tú te dediques a hacer crecer tu negocio.
              </p>
              <ul className="space-y-2">
                {[
                  "Declaraciones mensuales siempre a tiempo",
                  "Tus facturas organizadas automáticamente",
                  "ISR e IVA calculados correctamente",
                  "Portal donde ves todo en tiempo real",
                  "Sin sorpresas del SAT",
                  "Historial completo de tus impuestos",
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
      <div className="py-12 md:py-20 px-4 md:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:h-[300px]">
            {/* Cuadro superior izquierdo */}
            <div className="bg-sky-100 rounded-2xl md:rounded-3xl p-6 md:p-10 flex items-center justify-center">
              <h2 className="text-2xl md:text-4xl font-bold text-zinc-800 leading-tight text-center">
                Tu información fiscal <br/>siempre a la mano
              </h2>
            </div>

            {/* Cuadro superior derecho */}
            <div className="bg-purple-600 rounded-2xl md:rounded-3xl p-6 md:p-10 flex items-center justify-center">
              <h2 className="text-2xl md:text-4xl font-bold text-white leading-tight text-center">
                Tú trabajas, <br/>nosotros declaramos
              </h2>
            </div>


            
          </div>
        </div>
      </div>
    </section>
  );
}
