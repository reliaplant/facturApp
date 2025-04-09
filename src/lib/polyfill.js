/**
 * Polyfill para evitar errores de "document is not defined" con bibliotecas como Radix UI
 * en Next.js durante la hidratación del cliente
 */
if (typeof window !== 'undefined') {
  // Asegúrate de que estos objetos existen en el entorno del navegador
  if (!window.HTMLElement) window.HTMLElement = Element;
}
