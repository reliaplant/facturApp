import { Invoice, calculateTotalIncomesByYear, calculateTotalExpensesByYear, calculateTaxableIncome } from '@/models/Invoice';

describe('Invoice Model Tests', () => {
  // Datos de ejemplo para pruebas
  const mockInvoices: Invoice[] = [
    {
      id: '1',
      uuid: 'uuid1',
      date: '2023-01-15',
      cfdiType: 'I', // Ingreso
      paymentMethod: 'PUE',
      paymentForm: '01',
      cfdiUsage: 'G03',
      fiscalYear: 2023,
      fiscalRegime: '621',
      subtotal: 10000,
      total: 11600,
      issuerRfc: 'AAA010101000',
      issuerName: 'Empresa A',
      receiverRfc: 'BBB020202000',
      receiverName: 'Empresa B',
      concepts: [],
      isCancelled: false,
      clientId: 'client1',
      createdAt: '2023-01-15T10:00:00Z',
      updatedAt: '2023-01-15T10:00:00Z'
    },
    {
      id: '2',
      uuid: 'uuid2',
      date: '2023-02-20',
      cfdiType: 'I', // Ingreso
      paymentMethod: 'PUE',
      paymentForm: '01',
      cfdiUsage: 'G03',
      fiscalYear: 2023,
      fiscalRegime: '621',
      subtotal: 5000,
      total: 5800,
      issuerRfc: 'AAA010101000',
      issuerName: 'Empresa A',
      receiverRfc: 'BBB020202000',
      receiverName: 'Empresa B',
      concepts: [],
      isCancelled: false,
      clientId: 'client1',
      createdAt: '2023-02-20T10:00:00Z',
      updatedAt: '2023-02-20T10:00:00Z'
    },
    {
      id: '3',
      uuid: 'uuid3',
      date: '2023-03-10',
      cfdiType: 'E', // Egreso
      paymentMethod: 'PUE',
      paymentForm: '01',
      cfdiUsage: 'G03',
      fiscalYear: 2023,
      fiscalRegime: '621',
      subtotal: 3000,
      total: 3480,
      issuerRfc: 'CCC030303000',
      issuerName: 'Empresa C',
      receiverRfc: 'BBB020202000',
      receiverName: 'Empresa B',
      concepts: [],
      isCancelled: false,
      expenseType: 'Gastos generales',
      clientId: 'client1',
      createdAt: '2023-03-10T10:00:00Z',
      updatedAt: '2023-03-10T10:00:00Z'
    },
    {
      id: '4',
      uuid: 'uuid4',
      date: '2023-04-05',
      cfdiType: 'E', // Egreso
      paymentMethod: 'PUE',
      paymentForm: '01',
      cfdiUsage: 'G03',
      fiscalYear: 2023,
      fiscalRegime: '621',
      subtotal: 2000,
      total: 2320,
      issuerRfc: 'CCC030303000',
      issuerName: 'Empresa C',
      receiverRfc: 'BBB020202000',
      receiverName: 'Empresa B',
      concepts: [],
      isCancelled: false,
      expenseType: 'Servicios profesionales',
      clientId: 'client1',
      createdAt: '2023-04-05T10:00:00Z',
      updatedAt: '2023-04-05T10:00:00Z'
    },
    {
      id: '5',
      uuid: 'uuid5',
      date: '2022-12-10',
      cfdiType: 'I', // Ingreso pero del año fiscal anterior
      paymentMethod: 'PUE',
      paymentForm: '01',
      cfdiUsage: 'G03',
      fiscalYear: 2022,
      fiscalRegime: '621',
      subtotal: 8000,
      total: 9280,
      issuerRfc: 'AAA010101000',
      issuerName: 'Empresa A',
      receiverRfc: 'BBB020202000',
      receiverName: 'Empresa B',
      concepts: [],
      isCancelled: false,
      clientId: 'client1',
      createdAt: '2022-12-10T10:00:00Z',
      updatedAt: '2022-12-10T10:00:00Z'
    },
    {
      id: '6',
      uuid: 'uuid6',
      date: '2023-05-15',
      cfdiType: 'I', // Ingreso pero cancelado
      paymentMethod: 'PUE',
      paymentForm: '01',
      cfdiUsage: 'G03',
      fiscalYear: 2023,
      fiscalRegime: '621',
      subtotal: 3000,
      total: 3480,
      issuerRfc: 'AAA010101000',
      issuerName: 'Empresa A',
      receiverRfc: 'BBB020202000',
      receiverName: 'Empresa B',
      concepts: [],
      isCancelled: true, // Factura cancelada
      clientId: 'client1',
      createdAt: '2023-05-15T10:00:00Z',
      updatedAt: '2023-05-15T10:00:00Z'
    }
  ];

  test('calculateTotalIncomesByYear debe sumar correctamente los ingresos por año', () => {
    const totalIncomes2023 = calculateTotalIncomesByYear(mockInvoices, 2023);
    // Solo debe sumar uuid1 y uuid2 porque son de ingreso en 2023 y no canceladas
    expect(totalIncomes2023).toBe(11600 + 5800);
    
    const totalIncomes2022 = calculateTotalIncomesByYear(mockInvoices, 2022);
    expect(totalIncomes2022).toBe(9280);
  });

  test('calculateTotalExpensesByYear debe sumar correctamente los egresos por año', () => {
    const totalExpenses2023 = calculateTotalExpensesByYear(mockInvoices, 2023);
    // Debe sumar uuid3 y uuid4 porque son de egreso en 2023 y no canceladas
    expect(totalExpenses2023).toBe(3480 + 2320);
    
    const totalExpenses2022 = calculateTotalExpensesByYear(mockInvoices, 2022);
    expect(totalExpenses2022).toBe(0); // No hay egresos en 2022
  });

  test('calculateTaxableIncome debe calcular correctamente la utilidad fiscal', () => {
    const taxableIncome2023 = calculateTaxableIncome(mockInvoices, 2023);
    // Ingresos - Egresos para 2023
    expect(taxableIncome2023).toBe((11600 + 5800) - (3480 + 2320));
    
    const taxableIncome2022 = calculateTaxableIncome(mockInvoices, 2022);
    expect(taxableIncome2022).toBe(9280);
  });

  test('Las facturas canceladas no deben considerarse en los cálculos', () => {
    const totalWithCancelled = mockInvoices
      .filter(invoice => invoice.cfdiType === 'I' && invoice.fiscalYear === 2023)
      .reduce((sum, invoice) => sum + invoice.total, 0);
      
    const totalIncomes2023 = calculateTotalIncomesByYear(mockInvoices, 2023);
    
    // La diferencia debe ser el monto de la factura cancelada
    expect(totalWithCancelled - totalIncomes2023).toBe(3480);
  });
});
