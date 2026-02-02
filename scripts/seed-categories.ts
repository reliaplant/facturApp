/**
 * Script para agregar categorías a la base de datos
 * Ejecutar con: npx ts-node scripts/seed-categories.ts
 * O desde el navegador: importar y ejecutar seedCategories()
 */

import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, collection, addDoc, getDocs } from 'firebase/firestore';

// Firebase config - ajusta si es diferente
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Categorías para gastos deducibles en México
const CATEGORIAS = [
  // Gastos de operación
  'Agua',
  'Arrendamiento de inmuebles',
  'Arrendamiento de equipo',
  'Artículos de limpieza',
  'Artículos de oficina',
  'Asesoría legal',
  'Asesoría financiera',
  'Atención a clientes',
  
  // Comunicaciones
  'Celular',
  'Internet',
  'Telefonía fija',
  'Paquetería y mensajería',
  
  // Transporte y viáticos
  'Casetas y peajes',
  'Estacionamiento',
  'Gasolina',
  'Mantenimiento vehicular',
  'Pasajes aéreos',
  'Pasajes terrestres',
  'Renta de auto',
  'Uber / Taxi',
  'Viáticos nacionales',
  'Viáticos internacionales',
  'Hospedaje',
  
  // Alimentos
  'Alimentos con clientes',
  'Alimentos de trabajo',
  'Consumos en restaurantes',
  
  // Seguros y fianzas
  'Seguros de auto',
  'Seguros de gastos médicos',
  'Seguros de vida',
  'Seguros de equipo',
  'Fianzas',
  
  // Servicios profesionales
  'Servicio contable',
  'Servicio de nómina',
  'Consultoría',
  'Diseño gráfico',
  'Desarrollo de software',
  'Fotografía y video',
  'Traducción',
  
  // Marketing y publicidad
  'Mercadeo',
  'Publicidad en línea',
  'Publicidad impresa',
  'Redes sociales',
  'Eventos y exposiciones',
  'Material promocional',
  
  // Tecnología
  'Software y licencias',
  'Hosting y dominios',
  'Servicios en la nube',
  'Equipo de cómputo',
  'Mantenimiento de equipo',
  'Suscripciones digitales',
  
  // Servicios básicos
  'Luz / Electricidad',
  'Gas',
  'Predial',
  'Tenencia',
  
  // Capacitación
  'Cursos y capacitación',
  'Libros y publicaciones',
  'Conferencias y seminarios',
  
  // Financieros
  'Comisiones bancarias',
  'Intereses por créditos',
  'Servicios financieros',
  
  // Otros deducibles
  'Donativos',
  'Cuotas y suscripciones',
  'Honorarios médicos',
  'Medicinas',
  'Lentes ópticos',
  'Gastos funerarios',
  
  // Nómina relacionados
  'Uniformes',
  'Equipo de seguridad',
  'Herramientas de trabajo',
  
  // Varios
  'Otros gastos deducibles',
  'Gastos no deducibles',
  'Uso personal',
];

async function seedCategories() {
  // Initialize Firebase
  const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
  const db = getFirestore(app);
  
  console.log('🚀 Iniciando seed de categorías...');
  
  // Obtener categorías existentes
  const existingSnapshot = await getDocs(collection(db, 'categories'));
  const existingNames = new Set<string>();
  existingSnapshot.forEach(doc => {
    existingNames.add(doc.data().name?.toLowerCase());
  });
  
  console.log(`📋 Categorías existentes: ${existingNames.size}`);
  
  let created = 0;
  let skipped = 0;
  
  for (const nombre of CATEGORIAS) {
    if (existingNames.has(nombre.toLowerCase())) {
      console.log(`⏭️  Saltando (ya existe): ${nombre}`);
      skipped++;
      continue;
    }
    
    try {
      const now = Date.now();
      await addDoc(collection(db, 'categories'), {
        name: nombre,
        description: '',
        createdAt: now,
        updatedAt: now
      });
      console.log(`✅ Creada: ${nombre}`);
      created++;
    } catch (error) {
      console.error(`❌ Error creando ${nombre}:`, error);
    }
  }
  
  console.log('\n📊 Resumen:');
  console.log(`   ✅ Creadas: ${created}`);
  console.log(`   ⏭️  Saltadas: ${skipped}`);
  console.log(`   📋 Total categorías ahora: ${existingNames.size + created}`);
  
  return { created, skipped };
}

// Para ejecutar desde Node.js
if (require.main === module) {
  seedCategories()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export { seedCategories, CATEGORIAS };
