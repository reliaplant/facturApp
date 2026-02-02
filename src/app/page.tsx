import Hero from "./visitorComponents/Hero";
import Services from "./visitorComponents/Services";
import Features from "./visitorComponents/Features";
import Contact from "./visitorComponents/Contact";
import FAQ from "./visitorComponents/FAQ";
import Navbar from "./visitorComponents/Navbar";
import Footer from "./visitorComponents/Footer";
import PersonaFisicaPage from "./personaFisica/page";

export default function Home() {
  return (
    <div className="font-[family-name:var(--font-geist-sans)]">
      <Navbar />

      <main>
        <section className="pt-4 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
          <Hero />
        </section>

        <section>
          <Services />
        </section>

        <section id="comienza" className="pt-8">
          <Features />
        </section>

        <section id="contabilidad" className="pt-8">
          <PersonaFisicaPage />
        </section>

        <section id="faq" className="pt-8">
          <FAQ />
        </section>

        {/* Contact section remains at the bottom but modal should open from navbar button */}
        <section id="contact-section">
          <Contact />
        </section>
      </main>

      <Footer />
    </div>
  );
}
