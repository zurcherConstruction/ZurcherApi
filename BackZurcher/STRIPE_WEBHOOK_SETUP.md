# 🎯 GUÍA COMPLETA: Configuración de Webhooks de Stripe

## 📋 Resumen
Esta guía te ayudará a recibir notificaciones automáticas cuando los clientes paguen a través de los links de Stripe enviados en los invoices.

---

## 🛠️ PASO 1: Agregar Variable de Entorno

Agrega esta nueva variable a tu archivo `.env`:

```env
# Stripe Configuration
STRIPE_SECRET_KEY=sk_live_xxxxxxxxxxxxx  # Ya tienes esto
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx  # 🆕 NUEVO - Lo obtendrás del dashboard de Stripe
```

---

## 🗄️ PASO 2: Ejecutar Migración de Base de Datos

Esta migración agrega campos para tracking de pagos de Stripe en la tabla `Incomes`:

```bash
# En la carpeta BackZurcher
node migrations/add-stripe-fields-to-income.js
```

**Campos agregados:**
- `stripePaymentIntentId` - ID del pago en Stripe
- `stripeSessionId` - ID de la sesión de checkout

---

## 🌐 PASO 3: Configurar Webhook en Stripe Dashboard

### 3.1 Acceder al Dashboard
1. Ve a https://dashboard.stripe.com
2. Login con tu cuenta
3. Ve a **Developers → Webhooks**

### 3.2 Crear Endpoint
Click en **"Add endpoint"**

**URL del Endpoint:**
```
https://tu-dominio.com/api/stripe/webhook
```
Por ejemplo: `https://api.zurcherseptic.com/api/stripe/webhook`

⚠️ **IMPORTANTE:** 
- La URL debe ser **HTTPS** (no HTTP)
- Debe ser accesible públicamente desde internet
- Stripe debe poder hacer POST requests a esta URL

### 3.3 Seleccionar Eventos
Marca estos eventos:
- ✅ `checkout.session.completed`
- ✅ `payment_intent.succeeded`
- ✅ `payment_intent.payment_failed`

### 3.4 Obtener el Webhook Secret
1. Después de crear el webhook, Stripe te mostrará un **Signing secret**
2. Empieza con `whsec_...`
3. Cópialo y agrégalo a tu `.env` como `STRIPE_WEBHOOK_SECRET`

---

## 🧪 PASO 4: Probar el Webhook

### 4.1 Verificar que el Endpoint está Activo
```bash
curl https://tu-dominio.com/api/stripe/test
```

Deberías recibir:
```json
{
  "status": "Webhook endpoint is working",
  "timestamp": "2025-01-13T...",
  "env": {
    "hasStripeKey": true,
    "hasWebhookSecret": true
  }
}
```

### 4.2 Probar con Stripe CLI (Opcional)
```bash
# Instalar Stripe CLI
brew install stripe/stripe-cli/stripe  # Mac
# o descarga desde https://stripe.com/docs/stripe-cli

# Login
stripe login

# Escuchar eventos localmente
stripe listen --forward-to localhost:3000/api/stripe/webhook

# Enviar evento de prueba
stripe trigger checkout.session.completed
```

---

## 📧 PASO 5: Configurar Notificaciones

El sistema enviará notificaciones automáticas cuando:
- ✅ Se reciba un pago exitoso
- ❌ Falle un intento de pago

**Destinatarios de notificaciones:**
- Owner
- Admin  
- Finance

**Canales:**
- 🌐 Sistema Web (Dashboard)
- 📱 App Móvil (Push Notifications)

---

## 🔍 PASO 6: Verificar en Producción

### 6.1 Hacer un Pago Real de Prueba
1. Genera un invoice con link de pago
2. Envíalo a un email de prueba
3. Completa el pago con tarjeta de prueba de Stripe:
   - **Número:** 4242 4242 4242 4242
   - **Fecha:** Cualquier fecha futura
   - **CVC:** Cualquier 3 dígitos

### 6.2 Verificar que se Recibió el Webhook
Revisa los logs del servidor:
```bash
# Deberías ver:
📬 Stripe Webhook recibido: checkout.session.completed
✅ Checkout completado: cs_test_xxxxx
💰 Procesando pago de $XXX.XX para Budget #123
✅ Income creado: uuid-xxxxx
✅ Notificaciones de pago enviadas
```

### 6.3 Verificar en Dashboard de Stripe
1. Ve a **Developers → Webhooks**
2. Click en tu webhook
3. Ve a la pestaña **"Recent deliveries"**
4. Verifica que los eventos tienen status **200** (success)

---

## 🚨 TROUBLESHOOTING

### Problema: Webhook no recibe eventos
**Solución:**
- Verifica que la URL sea HTTPS
- Confirma que el servidor esté corriendo
- Revisa el firewall/security groups
- Verifica en Stripe Dashboard → Webhooks → Recent deliveries

### Problema: Error 401 Unauthorized
**Solución:**
- El endpoint de webhook NO debe estar protegido por `verifyToken`
- En `routes/index.js` debe estar ANTES del middleware de autenticación

### Problema: Error de firma inválida
**Solución:**
- Verifica que `STRIPE_WEBHOOK_SECRET` sea correcto
- Asegúrate de usar `express.raw()` en la ruta del webhook
- No parsees el body como JSON antes de verificar la firma

### Problema: No se crean los Incomes
**Solución:**
- Verifica que la migración se ejecutó correctamente
- Revisa los logs del servidor
- Confirma que los metadatos en el checkout session son correctos:
  ```javascript
  metadata: { 
    internal_budget_id: budgetData.idBudget,
    payment_type: 'invoice_payment' 
  }
  ```

---

## 📊 PASO 7: Monitoreo Continuo

### Ver Webhooks en Tiempo Real
```bash
# Dashboard de Stripe → Webhooks → View logs
# O usa Stripe CLI:
stripe listen
```

### Verificar Incomes Creados
```sql
SELECT 
  "idIncome",
  "amount",
  "paymentMethod",
  "stripePaymentIntentId",
  "stripeSessionId",
  "createdAt"
FROM "Incomes"
WHERE "paymentMethod" = 'Stripe'
ORDER BY "createdAt" DESC
LIMIT 10;
```

---

## 🔐 SEGURIDAD

✅ **Validación de Firma:** El webhook verifica que los eventos vengan realmente de Stripe
✅ **Metadata:** Solo se procesan pagos con metadata válido (budget_id, payment_type)
✅ **Logging:** Todos los eventos se registran para auditoría
✅ **Transacciones:** Los cambios en BD se hacen dentro de transacciones

---

## 📝 NOTAS IMPORTANTES

1. **Producción vs Test:**
   - En modo test usa: `whsec_test_...`
   - En producción usa: `whsec_live_...`

2. **Multiple Webhooks:**
   - Puedes tener un webhook para test y otro para producción
   - Usa diferentes URLs o el mismo backend con diferentes secrets

3. **Reintentos:**
   - Si tu servidor está caído, Stripe reintenta el webhook automáticamente
   - Hasta 3 días de reintentos

4. **Idempotencia:**
   - El código verifica si el pago ya fue procesado
   - No se crean duplicados si Stripe reenvía el mismo evento

---

## 📞 SOPORTE

Si tienes problemas:
1. Revisa los logs del servidor
2. Verifica los "Recent deliveries" en Stripe Dashboard
3. Usa Stripe CLI para testing local
4. Consulta: https://stripe.com/docs/webhooks

---

## ✅ CHECKLIST FINAL

- [ ] Variable `STRIPE_WEBHOOK_SECRET` agregada al `.env`
- [ ] Migración ejecutada exitosamente
- [ ] Webhook creado en Stripe Dashboard
- [ ] Eventos seleccionados correctamente
- [ ] Endpoint de prueba responde OK
- [ ] Pago de prueba procesado correctamente
- [ ] Income creado en base de datos
- [ ] Notificaciones recibidas
- [ ] Logs muestran éxito sin errores

¡Listo! Ahora recibirás notificaciones automáticas de todos los pagos de Stripe 🎉
