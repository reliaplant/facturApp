/**
 * Servicio para gestionar Saldos a Favor (IVA e ISR)
 */

import { 
  collection, 
  doc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy,
  Timestamp 
} from 'firebase/firestore';
import { db } from '@/services/firebase';
import { SaldoFavor, SaldoFavorInput, TipoSaldoFavor } from '@/models/SaldoFavor';

class SaldoFavorService {
  private collectionName = 'saldosFavor';

  /**
   * Obtener todos los saldos a favor de un cliente
   * Si se pasa ejercicio, obtiene saldos que apliquen a ese año o que se originaron en ese año
   */
  async getSaldosFavor(clientId: string, ejercicio?: number): Promise<SaldoFavor[]> {
    try {
      // Obtener todos los saldos del cliente
      const q = query(
        collection(db, this.collectionName),
        where('clientId', '==', clientId)
      );

      const snapshot = await getDocs(q);
      let saldos = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as SaldoFavor[];

      // Si se especifica ejercicio, filtrar saldos relevantes
      if (ejercicio) {
        saldos = saldos.filter(s => {
          const ejOrigen = s.ejercicioOrigen || s.ejercicio;
          const ejAplicacion = s.ejercicioAplicacion || s.ejercicio;
          // Mostrar si: se originó en este año O aplica a este año O está entre ambos
          return ejOrigen === ejercicio || 
                 ejAplicacion === ejercicio || 
                 (ejOrigen <= ejercicio && ejAplicacion >= ejercicio);
        });
      }

      // Ordenar por fecha de creación descendente
      saldos.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      return saldos;
    } catch (error) {
      console.error('Error fetching saldos a favor:', error);
      return [];
    }
  }

  /**
   * Obtener saldos a favor activos (con monto disponible) para un mes específico
   */
  async getSaldosActivosPorMes(
    clientId: string, 
    ejercicio: number, 
    mes: number, 
    tipo?: TipoSaldoFavor
  ): Promise<SaldoFavor[]> {
    try {
      const saldos = await this.getSaldosFavor(clientId, ejercicio);
      
      return saldos.filter(saldo => 
        saldo.activo &&
        saldo.mesAplicacion <= mes &&
        (saldo.monto - saldo.montoAplicado) > 0 &&
        (!tipo || saldo.tipo === tipo)
      );
    } catch (error) {
      console.error('Error fetching saldos activos:', error);
      return [];
    }
  }

  /**
   * Obtener el total de saldo a favor disponible por tipo
   */
  async getTotalSaldoDisponible(
    clientId: string, 
    ejercicio: number, 
    mes: number, 
    tipo: TipoSaldoFavor
  ): Promise<number> {
    const saldos = await this.getSaldosActivosPorMes(clientId, ejercicio, mes, tipo);
    return saldos.reduce((total, saldo) => total + (saldo.monto - saldo.montoAplicado), 0);
  }

  /**
   * Crear un nuevo saldo a favor
   */
  async createSaldoFavor(clientId: string, input: SaldoFavorInput): Promise<SaldoFavor> {
    const now = new Date().toISOString();
    
    const saldoData = {
      clientId,
      tipo: input.tipo,
      monto: input.monto,
      montoOriginal: input.monto,
      montoAplicado: 0,
      ejercicio: input.ejercicio,
      mesOrigen: input.mesOrigen,
      ejercicioOrigen: input.ejercicioOrigen,
      mesAplicacion: input.mesAplicacion,
      ejercicioAplicacion: input.ejercicioAplicacion,
      descripcion: input.descripcion || '',
      activo: true,
      createdAt: now,
      updatedAt: now,
    };

    const docRef = await addDoc(collection(db, this.collectionName), saldoData);
    
    return {
      id: docRef.id,
      ...saldoData,
    };
  }

  /**
   * Actualizar un saldo a favor
   */
  async updateSaldoFavor(
    saldoId: string, 
    updates: Partial<SaldoFavorInput>
  ): Promise<void> {
    const docRef = doc(db, this.collectionName, saldoId);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: new Date().toISOString(),
    });
  }

  /**
   * Aplicar parte del saldo a favor (cuando se usa en una declaración)
   */
  async aplicarSaldo(saldoId: string, montoAplicar: number): Promise<void> {
    const docRef = doc(db, this.collectionName, saldoId);
    
    // Obtener el saldo actual
    const saldos = await this.getSaldosFavor('', undefined);
    const saldo = saldos.find(s => s.id === saldoId);
    
    if (!saldo) throw new Error('Saldo no encontrado');
    
    const nuevoMontoAplicado = saldo.montoAplicado + montoAplicar;
    const saldoRestante = saldo.monto - nuevoMontoAplicado;
    
    await updateDoc(docRef, {
      montoAplicado: nuevoMontoAplicado,
      activo: saldoRestante > 0,
      updatedAt: new Date().toISOString(),
    });
  }

  /**
   * Eliminar un saldo a favor
   */
  async deleteSaldoFavor(saldoId: string): Promise<void> {
    const docRef = doc(db, this.collectionName, saldoId);
    await deleteDoc(docRef);
  }
}

export const saldoFavorService = new SaldoFavorService();
