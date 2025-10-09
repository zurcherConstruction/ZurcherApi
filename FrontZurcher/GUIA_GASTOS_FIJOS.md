# 💰 Guía de Uso: Sistema de Gastos Fijos

## 📖 Concepto

Los **Gastos Fijos** son plantillas de gastos recurrentes que te permiten:
- Definir gastos que se repiten periódicamente (alquiler, internet, seguros, etc.)
- Recibir alertas de próximos vencimientos
- Generar gastos reales automáticamente
- Mantener un control detallado de tus compromisos financieros

---

## 🚀 Acceso al Sistema

1. **Desde el menú lateral:**
   - Sección: **Financial** 💰
   - Opción: **Fixed Expenses**

2. **URL directa:**
   - `/fixed-expenses`

3. **Permisos requeridos:**
   - Solo usuarios con rol `owner` pueden acceder

---

## ✨ Funcionalidades

### 1️⃣ Crear un Gasto Fijo

**Pasos:**
1. Click en botón **"Nuevo Gasto Fijo"**
2. Completa el formulario:
   - **Nombre** (obligatorio): Ej: "Alquiler de Oficina"
   - **Descripción**: Detalles adicionales
   - **Monto** (obligatorio): Cantidad en dólares
   - **Frecuencia** (obligatorio):
     - Semanal
     - Quincenal
     - Mensual (más común)
     - Trimestral
     - Semestral
     - Anual
     - Único (pago único)
   - **Categoría** (obligatorio):
     - Alquiler
     - Servicios Públicos (agua, luz, gas)
     - Internet/Telefonía
     - Seguros
     - Salarios
     - Software/Licencias
     - Mantenimiento
     - Otro
   - **Método de Pago** (obligatorio): Selecciona la cuenta/tarjeta
   - **Proveedor**: Nombre de quien recibes el servicio
   - **Fecha de Inicio**: Primera vez que se paga
   - **Opciones:**
     - ✅ **Activo**: Si está marcado, el gasto está vigente
     - ✅ **Auto-generar gasto**: El sistema creará automáticamente el Expense en la fecha de vencimiento (próximamente)

3. Click en **"Crear Gasto Fijo"**

---

### 2️⃣ Ver Gastos Fijos

**Tabla principal muestra:**
- **Estado**: ✅ Activo / ❌ Inactivo (click para cambiar)
- **Nombre**: Identificación del gasto
- **Categoría**: Tipo de gasto
- **Monto**: Cantidad en USD
- **Frecuencia**: Cada cuánto se paga
- **Método de Pago**: Cuenta/tarjeta utilizada
- **Próximo Vencimiento**: Fecha en que debes pagar

**Acciones disponibles:**
- ✏️ **Editar**: Modificar datos del gasto fijo
- 🗑️ **Eliminar**: Borrar permanentemente (con confirmación)
- ✅/❌ **Toggle Estado**: Activar/desactivar sin eliminar

---

### 3️⃣ Filtrar Gastos Fijos

**Opciones de filtro:**
1. **🔍 Búsqueda**: Por nombre, proveedor o descripción
2. **Estado**:
   - Todos los estados
   - ✅ Solo activos
   - ❌ Solo inactivos
3. **Categoría**: Filtrar por tipo de gasto
4. **🔄 Recargar**: Actualiza la lista

---

### 4️⃣ Alertas de Próximos Vencimientos

**Banner amarillo superior:**
- Muestra gastos fijos que vencen en los próximos **7 días**
- Lista los 3 más urgentes con:
  - 📅 Nombre
  - 💵 Monto
  - 📆 Fecha de vencimiento
- Si hay más de 3, indica cuántos más faltan

**Ejemplo:**
```
⚠️ Próximos vencimientos (7 días)
  📅 Alquiler de Oficina - $1,500.00 (2025-10-15)
  📅 Internet Empresarial - $89.99 (2025-10-16)
  📅 Seguro de Vehículo - $250.00 (2025-10-17)
  Y 2 más...
```

---

### 5️⃣ Editar un Gasto Fijo

**Pasos:**
1. Click en el ícono ✏️ **Editar** de la fila deseada
2. Se abre el formulario con los datos actuales pre-cargados
3. Modifica los campos necesarios
4. Click en **"Actualizar"**

**Notas:**
- Si cambias la **frecuencia**, el sistema recalculará la próxima fecha de vencimiento
- Puedes modificar el monto si el proveedor ajustó el precio

---

### 6️⃣ Activar/Desactivar Gastos Fijos

**Cuándo desactivar:**
- ✋ Cancelaste el servicio pero quieres mantener el registro histórico
- 🔄 Servicio temporalmente suspendido
- 📊 Quieres que no aparezca en estadísticas pero no eliminarlo

**Cuándo reactivar:**
- ✅ Volviste a contratar el servicio
- 🔄 Se reanudó el compromiso

**Cómo hacerlo:**
- Click en el ícono de estado (✅/❌) en la columna "Estado"
- Confirmación instantánea con toast notification

---

### 7️⃣ Eliminar Gastos Fijos

**Advertencia:** 
- ⚠️ Esta acción es **permanente**
- Se pierde todo el histórico del gasto fijo
- **Recomendación**: Mejor desactiva en lugar de eliminar

**Pasos:**
1. Click en 🗑️ **Eliminar**
2. Confirma en el popup
3. El gasto desaparece de la lista

---

## 🔄 Flujo de Trabajo Recomendado

### Escenario 1: Alquiler Mensual

1. **Crear Gasto Fijo:**
   - Nombre: "Alquiler Oficina Central"
   - Monto: $1,500.00
   - Frecuencia: Mensual
   - Categoría: Alquiler
   - Método de Pago: Chase Bank
   - Proveedor: "ABC Real Estate"
   - Fecha de Inicio: 2025-10-01

2. **El sistema automáticamente:**
   - Calcula próximo vencimiento: 2025-11-01
   - Muestra alerta 7 días antes (2025-10-25)

3. **Cuando llegue la fecha de pago:**
   - Ve a **Upload Vouchers** (`/attachInvoice`)
   - Selecciona tipo: **"Gasto Fijo"**
   - Sube el recibo del pago
   - Método de pago: Chase Bank (ya está guardado)
   - Se crea un **Expense** real en el sistema

4. **El sistema actualiza:**
   - Próximo vencimiento pasa a: 2025-12-01
   - El ciclo se repite

---

### Escenario 2: Internet Empresarial

1. **Crear Gasto Fijo:**
   - Nombre: "Internet Empresarial"
   - Monto: $89.99
   - Frecuencia: Mensual
   - Categoría: Internet/Telefonía
   - Método de Pago: AMEX
   - Proveedor: "Comcast Business"
   - Auto-generar: ✅ (si está habilitado)

2. **Seguimiento:**
   - Recibes alertas antes de cada vencimiento
   - Pagas a tiempo
   - Adjuntas el comprobante

---

## 📊 Estadísticas (en la interfaz)

El sistema muestra:
- **Total de gastos fijos** (todos)
- **Gastos activos** vs **inactivos**
- **Compromiso mensual total**: Suma aproximada de todos los gastos mensuales
  - Gastos semanales × 4.33
  - Gastos quincenales × 2
  - Gastos mensuales × 1
  - Gastos trimestrales ÷ 3
  - Gastos semestrales ÷ 6
  - Gastos anuales ÷ 12

---

## 🎯 Mejores Prácticas

### ✅ DO (Hacer):
- ✅ Crea gastos fijos para **todos** tus compromisos recurrentes
- ✅ Usa nombres descriptivos ("Alquiler Oficina Central" en lugar de solo "Alquiler")
- ✅ Especifica siempre el **proveedor** para facilitar búsquedas
- ✅ Mantén actualizado el **método de pago** si cambias de cuenta
- ✅ Revisa las alertas de vencimiento regularmente
- ✅ Adjunta **siempre** el comprobante de pago real

### ❌ DON'T (No hacer):
- ❌ No elimines gastos fijos si solo los suspendiste temporalmente (mejor desactiva)
- ❌ No uses "Otro" en categoría si puedes ser más específico
- ❌ No olvides actualizar el monto si el proveedor cambió el precio
- ❌ No crees gastos fijos para pagos únicos pequeños (usa directamente Expenses)

---

## 🔗 Integración con Otros Módulos

### Con **Upload Vouchers** (`/attachInvoice`):
- Al crear un Expense con tipo "Gasto Fijo"
- Puedes adjuntar el comprobante de pago
- El sistema lo asocia al movimiento financiero

### Con **Summary** (`/summary`):
- Los Expenses generados desde gastos fijos aparecen en el resumen
- Filtro por tipo: "Gasto Fijo"
- Método de pago heredado del gasto fijo

### Con **Balance** (`/balance`):
- Los gastos fijos se contabilizan en el balance general
- Puedes filtrar por método de pago para ver flujo por cuenta

---

## 🐛 Solución de Problemas

### "Error al cargar gastos fijos"
**Causa:** El backend no está respondiendo
**Solución:**
1. Verifica que el servidor esté corriendo
2. Revisa la consola del navegador (F12)
3. Confirma que la ruta `/api/fixed-expenses` esté registrada

### "Error al crear gasto fijo"
**Causa:** Campos obligatorios faltantes
**Solución:**
1. Verifica que completaste: Nombre, Monto, Frecuencia, Categoría, Método de Pago
2. Asegúrate que el monto sea mayor a 0
3. Confirma que seleccionaste una fecha de inicio válida

### "No se muestran próximos vencimientos"
**Causa:** No hay gastos activos próximos a vencer
**Solución:**
1. Verifica que tienes gastos fijos con estado **Activo** ✅
2. Confirma que la fecha de vencimiento esté dentro de los próximos 7 días
3. Recarga la página (F5)

---

## 📈 Próximas Funcionalidades (Roadmap)

- [ ] **Auto-generación de Expenses**: El sistema creará automáticamente el gasto en la fecha de vencimiento
- [ ] **Notificaciones por Email**: Alertas enviadas a tu correo X días antes
- [ ] **Dashboard de Gastos Fijos**: Visualización gráfica de compromisos mensuales
- [ ] **Histórico de Pagos**: Ver todos los pagos realizados de un gasto fijo específico
- [ ] **Copia masiva**: Duplicar gastos fijos para diferentes períodos
- [ ] **Exportación a Excel**: Descargar lista de gastos fijos

---

## 📞 Soporte

Si tienes dudas o encuentras errores:
1. Revisa esta documentación
2. Verifica la consola del navegador (F12 → Console)
3. Contacta al equipo de desarrollo con:
   - Descripción del problema
   - Pasos para reproducirlo
   - Screenshots si es posible

---

**Última actualización:** Octubre 9, 2025  
**Versión:** 1.0.0  
**Sistema:** Zurcher API - Fixed Expenses Module
