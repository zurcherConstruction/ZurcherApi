import React, { useState, useEffect } from "react";
import api from '../utils/axios';

const BalanceStats = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedSections, setExpandedSections] = useState({});
  const [showTransactionList, setShowTransactionList] = useState(false);
  const [showPrintVersion, setShowPrintVersion] = useState(false);
  
  // 🆕 Inicializar con mes/año actual dinámicamente
  const currentDate = new Date();
  const [filters, setFilters] = useState({
    month: currentDate.getMonth() + 1, // Mes actual (1-12)
    year: currentDate.getFullYear(), // Año actual (2026, 2027, etc.)
  });

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      setError(null);

      // Verificar si hay token
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No hay token de autenticación. Por favor, inicia sesión.');
      }

      const params = {
        month: filters.month,
        year: filters.year
      };
      
      console.log('✅ Usando filtro mes/año:', `${filters.month}/${filters.year}`);

      console.log('Fetching dashboard with params:', params);
      
      const response = await api.get('/financial-dashboard/detailed', {
        params
      });

      console.log('=== FULL BACKEND RESPONSE DEBUG ===');
      console.log('Dashboard API Response (FULL):', JSON.stringify(response.data, null, 2));
      
      console.log('=== MAIN DATA STRUCTURE ===');
      console.log('response.data keys:', Object.keys(response.data));
      console.log('response.data.data keys:', Object.keys(response.data.data || {}));
      
      console.log('=== SUMMARY SECTION ===');
      console.log('summary:', response.data?.data?.summary);
      
      console.log('=== INCOME SECTION ===');
      console.log('incomeDetails:', response.data?.data?.incomeDetails);
      console.log('incomeByPaymentMethod:', response.data?.data?.incomeByPaymentMethod);
      
      console.log('=== EXPENSE DETAILS SECTION ===');
      console.log('expenseDetails FULL:', JSON.stringify(response.data?.data?.expenseDetails, null, 2));
      
      // 🚨 DEBUG ESPECÍFICO PARA MÉTODOS DE PAGO AMEX
      console.log('=== AMEX DEBUG ===');
      if (response.data?.data?.expenseDetails?.byCategory) {
        let amexCount = 0;
        let allPaymentMethods = [];
        
        response.data.data.expenseDetails.byCategory.forEach(category => {
          if (category.items) {
            category.items.forEach(expense => {
              allPaymentMethods.push(expense.paymentMethod);
              if (expense.paymentMethod && expense.paymentMethod.toUpperCase().includes('AMEX')) {
                amexCount++;
                console.log('🔍 GASTO AMEX ENCONTRADO:', {
                  category: category.category,
                  amount: expense.amount,
                  date: expense.date,
                  paymentMethod: expense.paymentMethod,
                  description: expense.notes || expense.description
                });
              }
            });
          }
        });
        
        console.log('📊 Total gastos AMEX encontrados:', amexCount);
        console.log('📋 Todos los métodos de pago únicos:', [...new Set(allPaymentMethods)].sort());
      }
      
      if (response.data?.data?.expensesByPaymentMethod) {
        console.log('💳 Gastos por método de pago (desde backend):', response.data.data.expensesByPaymentMethod);
        const amexInSummary = response.data.data.expensesByPaymentMethod.find(item => 
          item.method && item.method.toUpperCase().includes('AMEX')
        );
        console.log('🔍 AMEX en resumen por método:', amexInSummary);
      }
      console.log('=== FIN AMEX DEBUG ===');
      
      if (response.data?.data?.expenseDetails?.byCategory) {
        console.log('=== BY CATEGORY BREAKDOWN ===');
        console.log('byCategory array length:', response.data.data.expenseDetails.byCategory.length);
        response.data.data.expenseDetails.byCategory.forEach((category, index) => {
          console.log(`\n--- Category ${index + 1}: ${category.category} ---`);
          console.log('Total:', category.total);
          console.log('Count:', category.count);
          console.log('Has items:', !!category.items);
          console.log('Items length:', category.items?.length || 0);
          if (category.items && category.items.length > 0) {
            console.log('First 3 items:', category.items.slice(0, 3));
          }
        });
      }
      
      console.log('=== OTHER SECTIONS ===');
      console.log('expensesByPaymentMethod:', response.data?.data?.expensesByPaymentMethod);
      console.log('excludedItems:', response.data?.data?.excludedItems);
      
      console.log('=== END DEBUG ===');

      setData(response.data.data); // Usar response.data.data porque la estructura es { success: true, data: {...} }
      
      // 🔍 Ejecutar verificación de integridad automáticamente
      setTimeout(() => {
        if (response.data.data?.expenseDetails?.byCategory) {
          console.log('\n🤖 Ejecutando verificación automática...');
          // La función se ejecutará después de que se actualice el estado
        }
      }, 100);
    } catch (err) {
      console.error('Error fetching dashboard:', err);
      if (err.response?.status === 401) {
        // Token expirado o inválido
        localStorage.removeItem('token');
        localStorage.removeItem('staff');
        setError('Sesión expirada. Por favor, inicia sesión nuevamente.');
      } else if (err.response) {
        // Server responded with error status
        console.error('Error response:', err.response.data);
        setError(`Error del servidor: ${err.response.status} - ${err.response.data.message || err.message}`);
      } else if (err.request) {
        // Request was made but no response received
        console.error('No response received:', err.request);
        setError('No se pudo conectar con el servidor');
      } else {
        // Something else happened
        console.error('Error message:', err.message);
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, [filters]);

  // 🔍 Ejecutar verificación cuando se actualicen los datos
  useEffect(() => {
    if (data && data.expenseDetails?.byCategory) {
      const verification = verifyExpenseIntegrity();
      if (verification && !verification.isValid) {
        console.warn('⚠️ PROBLEMA DETECTADO:', verification);
      }
    }
  }, [data]);

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount || 0);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  };

  // Filtrar gastos generales (excluir materiales iniciales e inspecciones)
  const getGeneralExpenses = () => {
    if (!data?.expenseDetails?.byCategory) return [];
    
    const gastosDirectosCategory = data.expenseDetails.byCategory.find(cat => cat.category === 'Gastos Directos');
    if (!gastosDirectosCategory || !gastosDirectosCategory.items) return [];
    
    return gastosDirectosCategory.items.filter(expense => {
      const type = expense.typeExpense?.toLowerCase() || '';
      return !type.includes('material') && 
             !type.includes('inspeccion') && 
             !type.includes('inspection');
    });
  };

  // 🔍 Función para mejorar los detalles de inspecciones
  const getInspectionDetails = (category) => {
    if (!category?.items) return [];
    
    return category.items.map((expense) => {
      let descripcionMejorada = expense.notes || expense.description || 'Sin descripción';
      let tipoInspeccion = 'Inspección';
      let direccionPropiedad = expense.propertyAddress || 'Sin dirección';
      
      // Determinar tipo de inspección desde typeExpense
      if (expense.typeExpense) {
        tipoInspeccion = expense.typeExpense;
      }
      
      // Si no hay notas pero hay dirección, usar la dirección como descripción principal
      if (!expense.notes && !expense.description && direccionPropiedad !== 'Sin dirección') {
        descripcionMejorada = direccionPropiedad;
      }
      
      // Si hay dirección y es diferente a la descripción, agregar contexto
      if (direccionPropiedad !== 'Sin dirección' && direccionPropiedad !== descripcionMejorada) {
        descripcionMejorada = `${tipoInspeccion} en ${direccionPropiedad}`;
      }
      
      return {
        ...expense,
        descripcionMejorada,
        tipoInspeccion,
        direccionPropiedad
      };
    });
  };

  // 🔍 Función simple para mostrar gastos fijos pagados con su nombre real
  const getFixedExpenseDetails = () => {
    const fixedCategory = data?.expenseDetails?.byCategory?.find(cat => cat.category === 'Gastos Fijos');
    if (!fixedCategory || !fixedCategory.items) return [];
    
    const gastosPagados = fixedCategory.items.map((expense) => {
      // Usar la información del FixedExpense si está disponible
      let nombreGasto = 'Gasto Fijo Sin Nombre';
      let descripcion = '';
      let categoria = 'Sin categoría';
      
      // Si hay información del FixedExpense relacionado, usarla
      if (expense.fixedExpenseName) {
        nombreGasto = expense.fixedExpenseName;
        descripcion = expense.fixedExpenseDescription || '';
        categoria = expense.fixedExpenseCategory || 'Sin categoría';
      } else {
        // Fallback: extraer del texto si no hay info del FixedExpense
        const sourceText = expense.notes || expense.description || '';
        
        if (sourceText.toUpperCase().includes('PAYROLL')) {
          // Lista completa de empleados
          const employeeNames = ['DAMIAN', 'HEYANIRA', 'VIRGINIA', 'RAFAEL', 'YANI', 'PABLO', 'RAFITA', 'STEFANIA', 'KAREN', 'YANINA', 'GABY'];
          let foundEmployee = null;
          
          // Buscar nombre específico en el texto completo
          for (let name of employeeNames) {
            const nameUpper = name.toUpperCase();
            if (sourceText.toUpperCase().includes(nameUpper)) {
              foundEmployee = name;
              break;
            }
          }
          
          if (foundEmployee) {
            nombreGasto = `PAYROLL ${foundEmployee.toUpperCase()}`;
            categoria = 'Salarios';
            descripcion = `Nómina de ${foundEmployee}`;
          } else {
            // Buscar patrones como "PAYROLL NOMBRE"
            const payrollMatch = sourceText.match(/PAYROLL\s+([A-Z]+)/i);
            if (payrollMatch && payrollMatch[1]) {
              const extractedName = payrollMatch[1].toUpperCase();
              nombreGasto = `PAYROLL ${extractedName}`;
              categoria = 'Salarios';
              descripcion = `Nómina de ${extractedName}`;
            } else {
              nombreGasto = 'PAYROLL GENERAL';
              categoria = 'Salarios';
              descripcion = 'Nómina general';
            }
          }
        } else if (sourceText.toUpperCase().includes('LIABILITY')) {
          nombreGasto = 'LIABILITY';
          categoria = 'Seguros';
          descripcion = 'Seguro de responsabilidad';
        } else {
          // Usar el texto completo como nombre si no se puede identificar
          nombreGasto = sourceText.substring(0, 50) || 'Gasto Fijo';
          categoria = 'Otros';
          descripcion = sourceText || 'Sin descripción';
        }
      }
      
      return {
        ...expense,
        nombreGasto,
        descripcion,
        categoria,
        montoPagado: parseFloat(expense.amount),
        fecha: expense.date,
        metodoPago: expense.paymentMethod
      };
    });
    
    return gastosPagados;
  };

  // 🔍 Función para analizar la lógica de gastos fijos (parciales vs finales)
  const analyzeFixedExpenseLogic = () => {
    const fixedCategory = data?.expenseDetails?.byCategory?.find(cat => cat.category === 'Gastos Fijos');
    if (!fixedCategory || !fixedCategory.items) return { analysis: [], explanation: "", summary: { parcialesCount: 0, finalesCount: 0, otrosCount: 0 } };
    
    console.log('\n🔍 === ANÁLISIS DE LÓGICA DE GASTOS FIJOS ===');
    console.log('Basado en la lógica del backend:');
    console.log('- PARCIAL: cuando paidAmount < totalAmount (hay saldo restante)');
    console.log('- FINAL: cuando paidAmount >= totalAmount (gasto completado)');
    console.log('- Los "Pago parcial de:" son pagos individuales hacia un gasto fijo');
    console.log('- Los "Pago final de gasto fijo:" son el último pago que completa el total');
    console.log('');

    const analysis = [];
    let parcialesCount = 0;
    let finalesCount = 0;
    let otrosCount = 0;

    fixedCategory.items.forEach((expense, index) => {
      const sourceText = expense.notes || expense.description || '';
      let typeDetected = 'OTRO';
      let explanation = '';
      
      // Analizar el texto para determinar el tipo
      if (sourceText.toUpperCase().includes('PAGO PARCIAL DE:')) {
        typeDetected = 'PAGO PARCIAL';
        explanation = 'Este es un pago individual hacia un gasto fijo. El gasto fijo aún no está completamente pagado.';
        parcialesCount++;
        
        // Extraer nombre del empleado o gasto
        const employeeNames = ['DAMIAN', 'HEYANIRA', 'VIRGINIA', 'RAFAEL', 'YANI', 'PABLO', 'RAFITA', 'STEFANIA', 'KAREN'];
        let target = 'Gasto no identificado';
        for (let name of employeeNames) {
          if (sourceText.toUpperCase().includes(name.toUpperCase())) {
            target = `Empleado: ${name}`;
            break;
          }
        }
        if (target === 'Gasto no identificado' && sourceText.toUpperCase().includes('PAYROLL')) {
          target = 'Nómina general';
        }
        explanation += ` Destinatario: ${target}`;
        
      } else if (sourceText.toUpperCase().includes('PAGO FINAL DE GASTO FIJO:')) {
        typeDetected = 'PAGO FINAL';
        explanation = 'Este es el pago final que completa un gasto fijo. El backend actualizó el paymentStatus a "paid".';
        finalesCount++;
        
        // Buscar información de totales en el texto
        const totalMatch = sourceText.match(/Total:\s*\$?([\d,]+\.?\d*)/i);
        const paidMatch = sourceText.match(/Ya pagado:\s*\$?([\d,]+\.?\d*)/i);
        const thisPaymentMatch = sourceText.match(/Este pago:\s*\$?([\d,]+\.?\d*)/i);
        
        if (totalMatch && thisPaymentMatch) {
          explanation += ` Total del gasto: $${totalMatch[1]}, Este pago final: $${thisPaymentMatch[1]}`;
          if (paidMatch) {
            explanation += `, Ya pagado antes: $${paidMatch[1]}`;
          }
        }
        
      } else {
        typeDetected = 'OTRO';
        explanation = 'Gasto fijo sin patrón de texto específico para parcial/final.';
        otrosCount++;
      }

      analysis.push({
        index: index + 1,
        amount: expense.amount,
        date: expense.date,
        fullText: sourceText,
        typeDetected,
        explanation,
        relatedFixedExpenseId: expense.relatedFixedExpenseId || 'No disponible'
      });

      console.log(`--- Gasto ${index + 1} ---`);
      console.log('Monto:', expense.amount);
      console.log('Fecha:', expense.date);
      console.log('Texto:', sourceText);
      console.log('Tipo detectado:', typeDetected);
      console.log('Explicación:', explanation);
      console.log('ID relacionado:', expense.relatedFixedExpenseId || 'No disponible');
      console.log('');
    });

    const explanation = `🏦 LÓGICA DE GASTOS FIJOS EXPLICADA:

1. **Creación del Gasto Fijo**: Se crea un FixedExpense con totalAmount (ej: $1000 para nómina mensual)

2. **Pagos Parciales**: Se van registrando pagos individuales
   - Se crea un FixedExpensePayment por cada pago
   - Se crea un Expense con note: "Pago parcial de: [NOMBRE_EMPLEADO/GASTO]"  
   - Se actualiza paidAmount del FixedExpense
   - PaymentStatus = "partial" (mientras paidAmount < totalAmount)

3. **Pago Final**: Cuando se completa el gasto fijo
   - Se crea el último FixedExpensePayment
   - Se crea un Expense con note: "Pago final de gasto fijo: [NOMBRE] - Total: $X, Ya pagado: $Y, Este pago: $Z"
   - PaymentStatus se actualiza a "paid" (paidAmount >= totalAmount)
   - Se programa el siguiente período (nextDueDate)

📊 RESUMEN DE TU DATA:
- Pagos PARCIALES: ${parcialesCount} (pagos individuales pendientes de completar)
- Pagos FINALES: ${finalesCount} (gastos fijos completados en el período)  
- Otros gastos: ${otrosCount} (sin patrón claro)

🔑 CONCLUSIÓN: 
Los "parciales" son pagos individuales hacia gastos fijos en curso.
Los "finales" son pagos que completan gastos fijos del período.
Esto es normal y refleja el flujo real de pagos de nómina/gastos fijos.`;

    console.log('📊 RESUMEN:');
    console.log(`Pagos PARCIALES: ${parcialesCount}`);
    console.log(`Pagos FINALES: ${finalesCount}`);
    console.log(`Otros gastos: ${otrosCount}`);
    console.log('=== FIN ANÁLISIS ===\n');

    return { analysis, explanation, summary: { parcialesCount, finalesCount, otrosCount } };
  };

  // 🔍 FUNCIÓN DE VERIFICACIÓN ANTI-DUPLICADOS
  const verifyExpenseIntegrity = () => {
    if (!data?.expenseDetails?.byCategory) return null;
    
    console.log('\n🔍 === VERIFICACIÓN DE INTEGRIDAD DE GASTOS ===');
    
    // 1. Recopilar todos los IDs y transacciones
    let allExpenseIds = [];
    let totalManualSum = 0;
    let categoryDetails = {};
    
    data.expenseDetails.byCategory.forEach(category => {
      if (category.items && category.items.length > 0) {
        const categorySum = category.items.reduce((sum, item) => sum + parseFloat(item.amount || 0), 0);
        categoryDetails[category.category] = {
          count: category.items.length,
          sumFromItems: categorySum,
          sumFromCategory: category.total,
          difference: Math.abs(categorySum - category.total)
        };
        
        // Agregar IDs para verificar duplicados
        category.items.forEach(item => {
          if (item.id) allExpenseIds.push(item.id);
        });
        
        totalManualSum += categorySum;
        
        console.log(`📂 ${category.category}:`);
        console.log(`   Backend dice: $${category.total.toFixed(2)} (${category.count} items)`);
        console.log(`   Suma manual: $${categorySum.toFixed(2)}`);
        console.log(`   Diferencia: $${Math.abs(categorySum - category.total).toFixed(2)}`);
      }
    });
    
    // 2. Verificar duplicados por ID
    const uniqueIds = [...new Set(allExpenseIds)];
    const duplicateIds = allExpenseIds.filter((id, index) => allExpenseIds.indexOf(id) !== index);
    
    console.log(`\n🧮 RESUMEN DE VERIFICACIÓN:`);
    console.log(`   Total IDs encontrados: ${allExpenseIds.length}`);
    console.log(`   IDs únicos: ${uniqueIds.length}`);
    console.log(`   IDs duplicados: ${duplicateIds.length}`);
    if (duplicateIds.length > 0) {
      console.log(`   🚨 DUPLICADOS:`, [...new Set(duplicateIds)]);
    }
    
    // 3. Comparar suma total
    const backendTotal = data?.summary?.totalEgresos || 0;
    const difference = Math.abs(totalManualSum - backendTotal);
    
    console.log(`\n💰 COMPARACIÓN DE TOTALES:`);
    console.log(`   Backend dice: $${backendTotal.toFixed(2)}`);
    console.log(`   Suma manual: $${totalManualSum.toFixed(2)}`);
    console.log(`   Diferencia: $${difference.toFixed(2)}`);
    
    if (difference > 0.01) {
      console.log(`   🚨 ADVERTENCIA: Diferencia significativa detectada!`);
    } else {
      console.log(`   ✅ Totales coinciden correctamente`);
    }
    
    console.log('=== FIN VERIFICACIÓN ===\n');
    
    return {
      totalIds: allExpenseIds.length,
      uniqueIds: uniqueIds.length,
      duplicatesFound: duplicateIds.length,
      duplicateIds: [...new Set(duplicateIds)],
      backendTotal,
      manualSum: totalManualSum,
      difference,
      categoryDetails,
      isValid: duplicateIds.length === 0 && difference <= 0.01
    };
  };

  // Función para obtener todas las transacciones en un array unificado
  const getAllTransactions = () => {
    if (!data?.expenseDetails?.byCategory) return [];
    
    let allTransactions = [];
    let amexCount = 0; // 🚨 DEBUG: Contador AMEX
    
    // Agregar ingresos
    if (data.incomeDetails) {
      data.incomeDetails.forEach(income => {
        allTransactions.push({
          id: income.id,
          type: 'INGRESO',
          category: income.type,
          amount: income.amount,
          date: income.date,
          description: income.notes || 'Sin descripción',
          paymentMethod: income.paymentMethod,
          propertyAddress: income.propertyAddress || 'Sin dirección',
          workNotes: income.workNotes || 'Sin notas'
        });
      });
    }

    // Agregar gastos por categoría
    data.expenseDetails.byCategory.forEach(category => {
      if (category.items) {
        category.items.forEach(expense => {
          // Mejorar descripción para gastos fijos
          let description = expense.notes || expense.description || 'Sin descripción';
          let isSuspiciousExpense = false;
          
          // Marcar gastos sospechosos (sin información básica)
          if (expense.type === 'GASTO') {
            isSuspiciousExpense = !expense.hasNotes || (!expense.hasVendor && expense.amount > 100);
          }
          
          if (expense.relatedFixedExpenseId && expense.fixedExpenseName) {
            description = `${expense.fixedExpenseName}`;
            if (expense.fixedExpenseDescription) {
              description += ` - ${expense.fixedExpenseDescription}`;
            }
            if (expense.fixedExpenseCategory) {
              description += ` (${expense.fixedExpenseCategory})`;
            }
          }
          
          // 🚨 DEBUG ESPECÍFICO PARA AMEX
          if (expense.paymentMethod && expense.paymentMethod.toUpperCase().includes('AMEX')) {
            amexCount++;
            console.log(`🔍 TRANSACCIÓN AMEX #${amexCount}:`, {
              id: expense.id,
              category: category.name,
              amount: expense.amount,
              paymentMethod: expense.paymentMethod,
              date: expense.date,
              description: description
            });
          }
          
          allTransactions.push({
            id: expense.id,
            type: 'GASTO',
            category: category.name,
            amount: expense.amount,
            date: expense.date,
            description: description,
            paymentMethod: expense.paymentMethod,
            propertyAddress: expense.propertyAddress || 'Sin dirección',
            workNotes: expense.workNotes || 'Sin notas',
            isFixedExpense: !!expense.relatedFixedExpenseId,
            isSuspiciousExpense: isSuspiciousExpense,
            fixedExpenseName: expense.fixedExpenseName,
            fixedExpenseDescription: expense.fixedExpenseDescription,
            fixedExpenseCategory: expense.fixedExpenseCategory,
            // Nueva información
            vendor: expense.vendor || 'Sin vendor',
            paymentDetails: expense.paymentDetails || 'Sin detalles',
            verified: expense.verified || false,
            paymentStatus: expense.paymentStatus || 'Sin estado',
            hasNotes: expense.hasNotes || false,
            hasVendor: expense.hasVendor || false
          });
        });
      }
    });

    // Detectar posibles duplicados por monto, fecha, tipo, dirección Y descripción
    const suspiciousTransactions = new Map();
    allTransactions.forEach(transaction => {
      // Crear una clave más específica que incluya todos los campos importantes
      const key = `${transaction.amount}_${transaction.date}_${transaction.type}_${transaction.propertyAddress}_${transaction.description.substring(0, 50)}`;
      if (suspiciousTransactions.has(key)) {
        suspiciousTransactions.get(key).push(transaction.id);
      } else {
        suspiciousTransactions.set(key, [transaction.id]);
      }
    });

    // Marcar transacciones sospechosas (solo si son EXACTAMENTE iguales en todos los campos importantes)
    allTransactions.forEach(transaction => {
      const key = `${transaction.amount}_${transaction.date}_${transaction.type}_${transaction.propertyAddress}_${transaction.description.substring(0, 50)}`;
      transaction.isSuspicious = suspiciousTransactions.get(key).length > 1;
      transaction.suspiciousGroup = suspiciousTransactions.get(key).length > 1 ? suspiciousTransactions.get(key) : [];
    });

    // 🚨 DEBUG FINAL AMEX
    console.log(`\n💳 RESUMEN AMEX EN getAllTransactions():`);
    console.log(`   Total transacciones AMEX procesadas: ${amexCount}`);
    const finalAmexTransactions = allTransactions.filter(t => 
      t.paymentMethod && t.paymentMethod.toUpperCase().includes('AMEX')
    );
    console.log(`   Transacciones AMEX en array final: ${finalAmexTransactions.length}`);
    if (finalAmexTransactions.length > 0) {
      console.log('   Detalles AMEX finales:');
      finalAmexTransactions.forEach((t, index) => {
        console.log(`   ${index + 1}. $${t.amount} - ${t.paymentMethod} - ${t.date} - ${t.description.substring(0, 50)}...`);
      });
    }
    console.log('=== FIN DEBUG AMEX ===\n');

    // Ordenar por fecha (más reciente primero)
    return allTransactions.sort((a, b) => new Date(b.date) - new Date(a.date));
  };

  // Función para imprimir el listado
  const handlePrint = () => {
    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Listado de Transacciones - ${filters.month}/${filters.year}</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              margin: 20px;
              font-size: 12px;
            }
            h1 { 
              text-align: center; 
              color: #333;
              margin-bottom: 10px;
            }
            .summary { 
              background: #f5f5f5; 
              padding: 15px; 
              margin-bottom: 20px;
              border-radius: 5px;
            }
            table { 
              width: 100%; 
              border-collapse: collapse; 
              margin-top: 10px;
              font-size: 10px;
            }
            th, td { 
              border: 1px solid #ddd; 
              padding: 6px; 
              text-align: left;
            }
            th { 
              background-color: #f2f2f2; 
              font-weight: bold;
            }
            .income { background-color: #e8f5e8; }
            .expense { background-color: #ffe8e8; }
            .suspicious { background-color: #fff3cd; }
            .fixed-expense { background-color: #e3f2fd; }
            .print-date { 
              text-align: right; 
              font-size: 10px; 
              color: #666;
              margin-bottom: 10px;
            }
            @media print {
              body { margin: 0; font-size: 10px; }
              table { font-size: 9px; }
            }
          </style>
        </head>
        <body>
          <div class="print-date">Impreso: ${new Date().toLocaleString('es-ES')}</div>
          
          <h1>Dashboard Financiero - Listado de Transacciones</h1>
          <h2>Período: ${new Date(0, filters.month - 1).toLocaleString('es', { month: 'long' })} ${filters.year}</h2>
          
          <div class="summary">
            <h3>Resumen</h3>
            <p><strong>Total Ingresos:</strong> $${(data?.summary?.totalIncome || 0).toLocaleString('es-ES', { minimumFractionDigits: 2 })}</p>
            <p><strong>Total Egresos:</strong> $${(data?.summary?.totalEgresos || 0).toLocaleString('es-ES', { minimumFractionDigits: 2 })}</p>
            <p><strong>Ganancia:</strong> $${((data?.summary?.totalIncome || 0) - (data?.summary?.totalEgresos || 0)).toLocaleString('es-ES', { minimumFractionDigits: 2 })}</p>
            <p><strong>Total Transacciones:</strong> ${allTransactions.length}</p>
            <p><strong>IDs Únicos:</strong> ${new Set(allTransactions.map(t => t.id)).size}</p>
            <p><strong>Transacciones Sospechosas:</strong> ${allTransactions.filter(t => t.isSuspicious).length}</p>
          </div>
          
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Fecha</th>
                <th>Tipo</th>
                <th>Categoría</th>
                <th>Monto</th>
                <th>Descripción</th>
                <th>Método Pago</th>
                <th>Dirección</th>
              </tr>
            </thead>
            <tbody>
              ${allTransactions.map((transaction, index) => `
                <tr class="${
                  transaction.isSuspicious 
                    ? 'suspicious' 
                    : transaction.isFixedExpense
                      ? 'fixed-expense'
                      : transaction.type === 'INGRESO' 
                        ? 'income' 
                        : 'expense'
                }">
                  <td>${index + 1}</td>
                  <td>${transaction.date}</td>
                  <td>${transaction.type}</td>
                  <td>${transaction.category}</td>
                  <td>$${transaction.amount.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</td>
                  <td>${transaction.description}</td>
                  <td>${transaction.paymentMethod}</td>
                  <td>${transaction.propertyAddress}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          
          <div style="margin-top: 20px; font-size: 10px; color: #666;">
            <p><strong>Leyenda:</strong></p>
            <p>🟢 Verde: Ingresos | 🔴 Rojo: Gastos | 🟡 Amarillo: Sospechosos | 🔵 Azul: Gastos Fijos</p>
          </div>
        </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.print();
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
        <div className="flex flex-col space-y-3">
          <h3 className="font-bold text-lg">Error</h3>
          <p>{error}</p>
          {error.includes('autenticación') || error.includes('Sesión expirada') ? (
            <div className="flex gap-2">
              <button
                onClick={() => window.location.href = '/login'}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
              >
                Ir a Login
              </button>
              <button
                onClick={() => {
                  setError(null);
                  fetchDashboard();
                }}
                className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700 transition-colors"
              >
                Reintentar
              </button>
            </div>
          ) : (
            <button 
              onClick={fetchDashboard}
              className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition-colors w-fit"
            >
              Reintentar
            </button>
          )}
        </div>
      </div>
    );
  }

  const totalIncome = data?.summary?.totalIncome || 0;
  const totalExpenses = data?.summary?.totalEgresos || 0;
  const profit = totalIncome - totalExpenses;

  // Obtener todas las transacciones para el listado
  const allTransactions = getAllTransactions();

  // Renderizar tabla de todas las transacciones
  const renderTransactionList = () => {
    const suspiciousCount = allTransactions.filter(t => t.isSuspicious).length;
    const fixedExpenseCount = allTransactions.filter(t => t.isFixedExpense).length;
    const suspiciousExpenseCount = allTransactions.filter(t => t.isSuspiciousExpense).length;
    
    return (
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-800">
            📋 Listado Completo de Transacciones ({allTransactions.length})
            {suspiciousCount > 0 && (
              <span className="ml-2 text-yellow-600 font-bold">
                ⚠️ {suspiciousCount} duplicados
              </span>
            )}
            {suspiciousExpenseCount > 0 && (
              <span className="ml-2 text-red-600 font-bold">
                🚨 {suspiciousExpenseCount} sin info
              </span>
            )}
            {fixedExpenseCount > 0 && (
              <span className="ml-2 text-blue-600 font-bold">
                🏦 {fixedExpenseCount} gastos fijos
              </span>
            )}
          </h3>
          <div className="flex gap-2">
            <button
              onClick={handlePrint}
              className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition-colors"
            >
              🖨️ Imprimir
            </button>
            <button
              onClick={() => setShowTransactionList(!showTransactionList)}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
            >
              {showTransactionList ? 'Ocultar' : 'Mostrar'} Lista
            </button>
          </div>
        </div>

        {showTransactionList && (
          <div className="overflow-x-auto">
            <div className="mb-4 text-sm text-gray-600 grid grid-cols-4 gap-4">
              <div>
                <p><strong>Total transacciones:</strong> {allTransactions.length}</p>
                <p><strong>IDs únicos:</strong> {new Set(allTransactions.map(t => t.id)).size}</p>
                <p><strong>Duplicados por ID:</strong> {allTransactions.length - new Set(allTransactions.map(t => t.id)).size}</p>
              </div>
              <div>
                <p><strong>Duplicados exactos:</strong> {suspiciousCount}</p>
                <p className="text-xs text-yellow-600">
                  (idénticos en todos los campos)
                </p>
              </div>
              <div>
                <p><strong>Gastos sin información:</strong> {suspiciousExpenseCount}</p>
                <p className="text-xs text-red-600">
                  (sin notas o vendor)
                </p>
              </div>
              <div>
                <p><strong>Gastos fijos:</strong> {fixedExpenseCount}</p>
                <p className="text-xs text-blue-600">
                  (con información detallada)
                </p>
              </div>
            </div>
            
            <table className="min-w-full table-auto text-sm">
              <thead>
                <tr className="bg-gray-100">
                  <th className="px-2 py-2 text-left">#</th>
                  <th className="px-2 py-2 text-left">Estado Pago</th>
                  <th className="px-2 py-2 text-left">⚠️</th>
                  <th className="px-2 py-2 text-left">Tipo</th>
                  <th className="px-2 py-2 text-left">Categoría</th>
                  <th className="px-2 py-2 text-left">Fecha</th>
                  <th className="px-2 py-2 text-left">Monto</th>
                  <th className="px-2 py-2 text-left">Descripción</th>
                  <th className="px-2 py-2 text-left">Vendor</th>
                  <th className="px-2 py-2 text-left">Método Pago</th>
                  <th className="px-2 py-2 text-left">Dirección</th>
                </tr>
              </thead>
              <tbody>
                {allTransactions.map((transaction, index) => (
                  <tr 
                    key={transaction.id} 
                    className={`border-b hover:bg-gray-50 ${
                      transaction.isSuspicious 
                        ? 'bg-yellow-100 border-yellow-300' 
                        : transaction.isFixedExpense
                          ? 'bg-blue-50 border-blue-200'
                          : transaction.type === 'INGRESO' 
                            ? 'bg-green-50' 
                            : 'bg-red-50'
                    }`}
                    title={
                      transaction.isSuspicious 
                        ? `Posible duplicado exacto: ${transaction.suspiciousGroup.length} transacciones idénticas (mismo monto, fecha, tipo, dirección y descripción)` 
                        : transaction.isFixedExpense
                          ? `Gasto Fijo: ${transaction.fixedExpenseName || 'Sin nombre'} - ${transaction.fixedExpenseCategory || 'Sin categoría'}`
                          : ''
                    }
                  >
                    <td className="px-2 py-2">{index + 1}</td>
                    <td className="px-2 py-2 text-xs">
                      {transaction.type === 'GASTO' ? (
                        <div>
                          <span className={`px-2 py-1 rounded text-xs font-semibold ${
                            transaction.paymentStatus === 'paid' 
                              ? 'bg-green-200 text-green-800'
                              : transaction.paymentStatus === 'paid_via_invoice'
                                ? 'bg-blue-200 text-blue-800'
                                : transaction.paymentStatus === 'partial'
                                  ? 'bg-yellow-200 text-yellow-800'
                                  : 'bg-gray-200 text-gray-800'
                          }`}>
                            {transaction.paymentStatus === 'paid' && '✓ Pagado'}
                            {transaction.paymentStatus === 'paid_via_invoice' && '📄 Vía Factura'}
                            {transaction.paymentStatus === 'partial' && '📊 Parcial'}
                            {!transaction.paymentStatus && 'Sin estado'}
                          </span>
                          {transaction.paymentDetails && (
                            <div className="text-xs text-gray-500 mt-1" title={transaction.paymentDetails}>
                              {transaction.paymentDetails.length > 15 
                                ? `${transaction.paymentDetails.substring(0, 15)}...`
                                : transaction.paymentDetails
                              }
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-green-600 text-xs font-semibold">✓ Ingreso</span>
                      )}
                    </td>
                    <td className="px-2 py-2 text-center">
                      {transaction.isSuspicious && (
                        <span className="text-yellow-600 font-bold" title="Posible duplicado exacto - idéntico en todos los campos">⚠️</span>
                      )}
                      {transaction.isFixedExpense && (
                        <span className="text-blue-600 font-bold" title="Gasto Fijo">🏦</span>
                      )}
                      {transaction.isSuspiciousExpense && (
                        <span className="text-red-600 font-bold" title="Gasto sin información básica">🚨</span>
                      )}
                    </td>
                    <td className="px-2 py-2">
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${
                        transaction.type === 'INGRESO' 
                          ? 'bg-green-200 text-green-800' 
                          : transaction.isFixedExpense
                            ? 'bg-blue-200 text-blue-800'
                            : 'bg-red-200 text-red-800'
                      }`}>
                        {transaction.type}
                      </span>
                    </td>
                    <td className="px-2 py-2 text-xs">{transaction.category}</td>
                    <td className="px-2 py-2">{transaction.date}</td>
                    <td className="px-2 py-2 font-semibold">
                      ${transaction.amount.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-2 py-2 max-w-xs text-xs" title={transaction.description}>
                      <div className="truncate">
                        {transaction.isFixedExpense && transaction.fixedExpenseName ? (
                          <div>
                            <div className="font-semibold text-blue-700">{transaction.fixedExpenseName}</div>
                            {transaction.fixedExpenseDescription && (
                              <div className="text-gray-600 text-xs">{transaction.fixedExpenseDescription}</div>
                            )}
                            {transaction.fixedExpenseCategory && (
                              <div className="text-blue-600 text-xs">({transaction.fixedExpenseCategory})</div>
                            )}
                          </div>
                        ) : (
                          transaction.description
                        )}
                      </div>
                    </td>
                    <td className="px-2 py-2 text-xs">
                      {transaction.type === 'GASTO' ? (
                        <span className={`${transaction.hasVendor ? 'text-gray-800' : 'text-red-500'}`}>
                          {transaction.vendor}
                        </span>
                      ) : (
                        <span className="text-gray-400">N/A</span>
                      )}
                    </td>
                    <td className="px-2 py-2 text-xs">{transaction.paymentMethod}</td>
                    <td className="px-2 py-2 max-w-xs text-xs truncate" title={transaction.propertyAddress}>
                      {transaction.propertyAddress}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {suspiciousCount > 0 && (
              <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded">
                <h4 className="font-semibold text-yellow-800 mb-2">⚠️ Transacciones Sospechosas Detectadas</h4>
                <p className="text-sm text-yellow-700">
                  Se encontraron {suspiciousCount} transacciones que son <strong>exactamente idénticas</strong> en todos los campos importantes: 
                  monto, fecha, tipo, dirección de propiedad y descripción. 
                  Estas están marcadas en amarillo en la tabla y requieren revisión manual para confirmar si son duplicados reales.
                </p>
                <p className="text-xs text-yellow-600 mt-2">
                  <strong>Nota:</strong> Las transacciones con mismo monto y fecha pero diferentes direcciones o descripciones ya NO se marcan como sospechosas.
                </p>
              </div>
            )}

            {fixedExpenseCount > 0 && (
              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded">
                <h4 className="font-semibold text-blue-800 mb-2">🏦 Gastos Fijos Encontrados</h4>
                <p className="text-sm text-blue-700">
                  Se encontraron {fixedExpenseCount} gastos fijos con información detallada (nombre, descripción y categoría). 
                  Estos están marcados en azul y muestran información completa del gasto fijo asociado.
                </p>
              </div>
            )}

            {suspiciousExpenseCount > 0 && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded">
                <h4 className="font-semibold text-red-800 mb-2">🚨 Gastos Sin Información Básica</h4>
                <p className="text-sm text-red-700">
                  Se encontraron {suspiciousExpenseCount} gastos que no tienen información básica completa:
                </p>
                <ul className="text-sm text-red-700 ml-4 mt-2">
                  <li>• Sin notas/descripción</li>
                  <li>• Sin vendor/proveedor (para montos mayores a $100)</li>
                </ul>
                <p className="text-xs text-red-600 mt-2">
                  <strong>Revisar:</strong> Estos gastos están marcados con 🚨 y pueden necesitar más información o verificación.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header con filtros */}
      <div className="bg-white p-6 rounded-lg shadow-lg">
        <div className="flex flex-col space-y-4">
          <h1 className="text-2xl font-bold text-gray-800">Dashboard Financiero</h1>
          
          {/* Filtros */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mes</label>
              <select
                value={filters.month}
                onChange={(e) => {
                  const newMonth = parseInt(e.target.value);
                  setFilters({...filters, month: newMonth});
                  console.log('Cambiando mes a:', newMonth);
                }}
                className="w-full border border-gray-300 rounded px-3 py-2"
              >
                {[...Array(12)].map((_, i) => (
                  <option key={i} value={i + 1}>
                    {new Date(0, i).toLocaleString('es', { month: 'long' })}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Año</label>
              <select
                value={filters.year}
                onChange={(e) => {
                  const newYear = parseInt(e.target.value);
                  setFilters({...filters, year: newYear});
                  console.log('Cambiando año a:', newYear);
                }}
                className="w-full border border-gray-300 rounded px-3 py-2"
              >
                {/* 🆕 Mostrar solo 2025 y el año actual (2026) */}
                {[2025, new Date().getFullYear()].map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Información del período actual */}
          <div className="text-sm bg-gray-50 p-3 rounded">
            <span className="font-medium text-green-600">📅 Período seleccionado: </span>
            <span className="font-semibold">{new Date(0, filters.month - 1).toLocaleString('es', { month: 'long' })} {filters.year}</span>
            {data?.totalTransactions && (
              <span className="ml-4">• {data.totalTransactions} transacciones</span>
            )}
          </div>
        </div>
      </div>

      {/* Resumen Principal */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-green-500 text-white p-6 rounded-lg shadow-lg">
          <h2 className="text-lg font-semibold mb-2">Total Ingresos</h2>
          <p className="text-3xl font-bold">{formatCurrency(totalIncome)}</p>
        </div>
        <div className="bg-red-500 text-white p-6 rounded-lg shadow-lg">
          <h2 className="text-lg font-semibold mb-2">Total Egresos</h2>
          <p className="text-3xl font-bold">{formatCurrency(totalExpenses)}</p>
        </div>
        <div className={`${profit >= 0 ? 'bg-blue-500' : 'bg-orange-500'} text-white p-6 rounded-lg shadow-lg`}>
          <h2 className="text-lg font-semibold mb-2">Ganancia</h2>
          <p className="text-3xl font-bold">{formatCurrency(profit)}</p>
        </div>
      </div>

    

      {/* Lista completa de transacciones */}
      {data && renderTransactionList()}

      {/* Secciones Expandibles */}
      <div className="space-y-4">
        
        {/* Ingresos */}
        <div className="bg-white rounded-lg shadow-lg">
          <button
            onClick={() => toggleSection('ingresos')}
            className="w-full p-4 text-left flex justify-between items-center hover:bg-gray-50"
          >
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 bg-green-500 rounded"></div>
              <h3 className="text-lg font-semibold">Ingresos - {formatCurrency(totalIncome)}</h3>
            </div>
            <svg 
              className={`w-5 h-5 transition-transform ${expandedSections.ingresos ? 'rotate-180' : ''}`}
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          
          {expandedSections.ingresos && (
            <div className="border-t p-4">
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {/* Mostrar transacciones individuales si están disponibles */}
                {data?.incomeDetails && data.incomeDetails.length > 0 ? (
                  data.incomeDetails.map((income, index) => (
                    <div key={index} className="flex justify-between items-center py-3 border-b hover:bg-gray-50">
                      <div className="flex-1">
                        <div className="font-medium">{income.notes || income.type || 'Ingreso'}</div>
                        <div className="text-sm text-gray-500">
                          {formatDate(income.date)} • {income.paymentMethod}
                        </div>
                        {income.propertyAddress && income.propertyAddress !== 'Sin dirección' && (
                          <div className="text-sm text-blue-600 mt-1">
                            📍 {income.propertyAddress}
                          </div>
                        )}
                      </div>
                      <span className="text-green-600 font-semibold">{formatCurrency(income.amount)}</span>
                    </div>
                  ))
                ) : (
                  /* Fallback: mostrar por método de pago */
                  data?.incomeByPaymentMethod && data.incomeByPaymentMethod.map(({method, amount}) => (
                    <div key={method} className="flex justify-between items-center py-2 border-b">
                      <span className="font-medium">{method}</span>
                      <span className="text-green-600 font-semibold">{formatCurrency(amount)}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Gastos Fijos - Vista Simple */}
        <div className="bg-white rounded-lg shadow-lg">
          <button
            onClick={() => toggleSection('gastosFijos')}
            className="w-full p-4 text-left flex justify-between items-center hover:bg-gray-50"
          >
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 bg-purple-500 rounded"></div>
              <h3 className="text-lg font-semibold">
                Gastos Fijos Pagados - {formatCurrency(data?.expenseDetails?.byCategory?.find(cat => cat.category === 'Gastos Fijos')?.total || 0)}
              </h3>
              <span className="text-sm text-gray-500">
                ({data?.expenseDetails?.byCategory?.find(cat => cat.category === 'Gastos Fijos')?.count || 0} pagos)
              </span>
            </div>
            <svg 
              className={`w-5 h-5 transition-transform ${expandedSections.gastosFijos ? 'rotate-180' : ''}`}
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          
          {expandedSections.gastosFijos && (
            <div className="border-t p-4">
              {/* Vista Simple de Gastos Fijos */}
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {(() => {
                  const gastosPagados = getFixedExpenseDetails();
                  return gastosPagados.map((gasto, index) => (
                    <div key={index} className="flex justify-between items-center p-3 border rounded-lg hover:bg-gray-50 bg-purple-50 border-purple-200">
                      <div className="flex-1">
                        <div className="font-semibold text-purple-800 text-lg">
                          {gasto.nombreGasto}
                        </div>
                        <div className="text-sm text-purple-600">
                          {gasto.categoria} • {formatDate(gasto.fecha)} • {gasto.metodoPago}
                        </div>
                      </div>
                      <div className="ml-4 text-right">
                        <div className="font-bold text-red-600 text-xl">
                          {formatCurrency(gasto.montoPagado)}
                        </div>
                        <div className="text-xs text-gray-500">
                          Pagado
                        </div>
                      </div>
                    </div>
                  ));
                })()}
              </div>
            </div>
          )}
        </div>

        {/* Proveedores */}
        <div className="bg-white rounded-lg shadow-lg">
          <button
            onClick={() => toggleSection('proveedores')}
            className="w-full p-4 text-left flex justify-between items-center hover:bg-gray-50"
          >
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 bg-blue-500 rounded"></div>
              <h3 className="text-lg font-semibold">
                Proveedores - {formatCurrency(data?.expenseDetails?.byCategory?.find(cat => cat.category === 'Proveedores')?.total || 0)}
              </h3>
              <span className="text-sm text-gray-500">
                ({data?.expenseDetails?.byCategory?.find(cat => cat.category === 'Proveedores')?.count || 0} transacciones)
              </span>
            </div>
            <svg 
              className={`w-5 h-5 transition-transform ${expandedSections.proveedores ? 'rotate-180' : ''}`}
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          
          {expandedSections.proveedores && (
            <div className="border-t p-4">
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {data?.expenseDetails?.byCategory?.find(cat => cat.category === 'Proveedores')?.items?.map((expense, index) => (
                  <div key={index} className="flex justify-between items-center py-3 border-b hover:bg-gray-50">
                    <div className="flex-1">
                      <div className="font-medium">{expense.notes || expense.description}</div>
                      <div className="text-sm text-gray-500">
                        {formatDate(expense.date)} • {expense.paymentMethod} • {expense.typeExpense}
                      </div>
                    </div>
                    <span className="text-red-600 font-semibold">{formatCurrency(expense.amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* COMENTADO TEMPORALMENTE - Gastos Generales viene del backend 
        <div className="bg-white rounded-lg shadow-lg">
          <button
            onClick={() => toggleSection('gastosGenerales')}
            className="w-full p-4 text-left flex justify-between items-center hover:bg-gray-50"
          >
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 bg-orange-500 rounded"></div>
              <h3 className="text-lg font-semibold">
                Gastos Generales - {formatCurrency(getGeneralExpenses().reduce((sum, exp) => sum + parseFloat(exp.amount), 0))}
              </h3>
              <span className="text-sm text-gray-500">
                ({getGeneralExpenses().length} transacciones)
              </span>
              <span className="text-xs text-gray-400">(Excluye materiales e inspecciones)</span>
            </div>
            <svg 
              className={`w-5 h-5 transition-transform ${expandedSections.gastosGenerales ? 'rotate-180' : ''}`}
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          
          {expandedSections.gastosGenerales && (
            <div className="border-t p-4">
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {getGeneralExpenses().map((expense, index) => (
                  <div key={index} className="flex justify-between items-center py-3 border-b hover:bg-gray-50">
                    <div className="flex-1">
                      <div className="font-medium">{expense.notes || expense.description}</div>
                      <div className="text-sm text-gray-500">
                        {formatDate(expense.date)} • {expense.paymentMethod} • {expense.typeExpense}
                      </div>
                    </div>
                    <span className="text-red-600 font-semibold">{formatCurrency(expense.amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        FIN COMENTARIO */}

        {/* Secciones Dinámicas para todas las categorías (excepto las hardcodeadas) */}
        {data?.expenseDetails?.byCategory?.filter(category => 
          !['Gastos Fijos', 'Proveedores'].includes(category.category)
        ).map(category => (
          <div key={category.category} className="bg-white rounded-lg shadow-lg">
            <button
              onClick={() => toggleSection(category.category)}
              className="w-full p-4 text-left flex justify-between items-center hover:bg-gray-50"
            >
              <div className="flex items-center gap-3">
                <div className={`w-4 h-4 rounded ${getCategoryColor(category.category)}`}></div>
                <h3 className="text-lg font-semibold">
                  {category.category} - {formatCurrency(category.total)}
                </h3>
                <span className="text-sm text-gray-500">
                  ({category.count} transacciones)
                </span>
              </div>
              <svg 
                className={`w-5 h-5 transition-transform ${expandedSections[category.category] ? 'rotate-180' : ''}`}
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            
            {expandedSections[category.category] && (
              <div className="border-t p-4">
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {(() => {
                    // Mejorar detalles para inspecciones
                    const isInspection = category.category.toLowerCase().includes('inspección') || 
                                        category.category.toLowerCase().includes('inspection');
                    
                    if (isInspection) {
                      const inspections = getInspectionDetails(category);
                      return inspections.map((expense, index) => (
                        <div key={index} className="flex justify-between items-center py-3 border-b hover:bg-gray-50">
                          <div className="flex-1">
                            <div className="font-medium text-orange-700">{expense.descripcionMejorada}</div>
                            <div className="text-sm text-gray-500">
                              {formatDate(expense.date)} • {expense.paymentMethod}
                            </div>
                            {expense.direccionPropiedad !== 'Sin dirección' && expense.direccionPropiedad !== expense.descripcionMejorada && (
                              <div className="text-xs text-blue-600 mt-1">
                                📍 {expense.direccionPropiedad}
                              </div>
                            )}
                          </div>
                          <span className="text-red-600 font-semibold">{formatCurrency(expense.amount)}</span>
                        </div>
                      ));
                    } else {
                      // Vista normal para otras categorías
                      return category.items?.map((expense, index) => (
                        <div key={index} className="flex justify-between items-center py-3 border-b hover:bg-gray-50">
                          <div className="flex-1">
                            <div className="font-medium">{expense.notes || expense.description || 'Sin descripción'}</div>
                            <div className="text-sm text-gray-500">
                              {formatDate(expense.date)} • {expense.paymentMethod} • {expense.typeExpense}
                            </div>
                            {expense.propertyAddress && expense.propertyAddress !== 'Sin dirección' && (
                              <div className="text-xs text-blue-600 mt-1">
                                📍 {expense.propertyAddress}
                              </div>
                            )}
                          </div>
                          <span className="text-red-600 font-semibold">{formatCurrency(expense.amount)}</span>
                        </div>
                      ));
                    }
                  })()}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

// Helper function para asignar colores a las categorías
const getCategoryColor = (category) => {
  const colorMap = {
    'Materiales': 'bg-indigo-500',
    'Materiales Iniciales': 'bg-cyan-500', 
    'Gastos Generales': 'bg-orange-500',
    'Inspección Inicial': 'bg-yellow-500',
    'Comisión Vendedor': 'bg-pink-500',
    'Workers': 'bg-emerald-500',
    'Diseño': 'bg-violet-500',
    'Fee de Inspección': 'bg-amber-500'
  };
  return colorMap[category] || 'bg-gray-500';
};

export default BalanceStats;