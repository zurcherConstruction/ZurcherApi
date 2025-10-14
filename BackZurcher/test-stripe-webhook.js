/**
 * 🧪 SCRIPT DE PRUEBA: Verificar configuración de Stripe Webhooks
 * 
 * Este script verifica:
 * 1. Que las variables de entorno estén configuradas
 * 2. Que el modelo Income tenga los campos de Stripe
 * 3. Que puedas crear un Income con datos de Stripe
 * 
 * Uso: node test-stripe-webhook.js
 */

require('dotenv').config();
const { sequelize, Income, Budget } = require('./src/data');

async function testStripeWebhookConfiguration() {
  console.log('\n🔍 === VERIFICACIÓN DE CONFIGURACIÓN DE STRIPE WEBHOOKS ===\n');

  try {
    // 1. Verificar variables de entorno
    console.log('📋 1. Verificando variables de entorno...');
    const hasStripeKey = !!process.env.STRIPE_SECRET_KEY;
    const hasWebhookSecret = !!process.env.STRIPE_WEBHOOK_SECRET;
    
    console.log(`   STRIPE_SECRET_KEY: ${hasStripeKey ? '✅ Configurada' : '❌ Falta'}`);
    console.log(`   STRIPE_WEBHOOK_SECRET: ${hasWebhookSecret ? '✅ Configurada' : '❌ Falta'}`);
    
    if (!hasStripeKey) {
      console.log('\n⚠️  STRIPE_SECRET_KEY no está configurada en el .env');
    }
    if (!hasWebhookSecret) {
      console.log('\n⚠️  STRIPE_WEBHOOK_SECRET no está configurada en el .env');
      console.log('   Obtén este valor del Dashboard de Stripe → Webhooks → Signing secret');
    }

    // 2. Verificar conexión a BD
    console.log('\n📋 2. Verificando conexión a base de datos...');
    await sequelize.authenticate();
    console.log('   ✅ Conexión establecida');

    // 3. Verificar que existen los campos en Income
    console.log('\n📋 3. Verificando campos de Stripe en modelo Income...');
    const [columns] = await sequelize.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'Incomes'
      AND column_name IN ('stripePaymentIntentId', 'stripeSessionId')
      ORDER BY column_name
    `);

    if (columns.length === 0) {
      console.log('   ❌ Los campos de Stripe NO existen en la tabla Incomes');
      console.log('   ⚠️  Debes ejecutar la migración:');
      console.log('   node migrations/add-stripe-fields-to-income.js');
    } else {
      console.log('   ✅ Campos de Stripe encontrados:');
      console.table(columns);
    }

    // 4. Verificar que podemos crear un Income de prueba
    console.log('\n📋 4. Probando creación de Income con datos de Stripe...');
    
    // Buscar un Budget de prueba
    const testBudget = await Budget.findOne({
      limit: 1,
      order: [['createdAt', 'DESC']]
    });

    if (!testBudget) {
      console.log('   ⚠️  No hay budgets en la base de datos para probar');
    } else {
      const testIncome = await Income.create({
        type: 'Comprobante Ingreso',
        typeIncome: 'Comprobante Ingreso',
        amount: 0.01, // Solo 1 centavo para prueba
        date: new Date(),
        description: 'TEST - Prueba de webhook de Stripe (eliminar si es necesario)',
        budgetId: testBudget.idBudget,
        paymentMethod: 'Cap Trabajos Septic',
        stripePaymentIntentId: 'pi_test_12345',
        stripeSessionId: 'cs_test_67890',
        verified: false
      });

      console.log('   ✅ Income de prueba creado exitosamente');
      console.log('   📝 ID:', testIncome.idIncome);
      console.log('   💰 Monto:', testIncome.amount);
      console.log('   🔗 Stripe Payment Intent:', testIncome.stripePaymentIntentId);
      console.log('   🔗 Stripe Session:', testIncome.stripeSessionId);

      // Eliminar el Income de prueba
      await testIncome.destroy();
      console.log('   🗑️  Income de prueba eliminado');
    }

    // 5. Verificar endpoint del webhook
    console.log('\n📋 5. Verificando endpoint del webhook...');
    const apiUrl = process.env.API_URL || 'http://localhost:3000';
    console.log(`   🌐 URL base de la API: ${apiUrl}`);
    console.log(`   🎯 Endpoint del webhook: ${apiUrl}/api/stripe/webhook`);
    console.log(`   🧪 Endpoint de prueba: ${apiUrl}/api/stripe/test`);
    console.log('\n   💡 Para probar el endpoint, ejecuta:');
    console.log(`   curl ${apiUrl}/api/stripe/test`);

    // 6. Verificar integración con Stripe
    console.log('\n📋 6. Verificando integración con Stripe SDK...');
    if (hasStripeKey) {
      try {
        const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
        
        // Intentar listar los últimos eventos (solo prueba de conexión)
        const events = await stripe.events.list({ limit: 1 });
        console.log('   ✅ Conexión con Stripe API exitosa');
        console.log(`   📊 Modo: ${process.env.STRIPE_SECRET_KEY.startsWith('sk_test') ? 'TEST' : 'LIVE'}`);
      } catch (stripeError) {
        console.log('   ❌ Error conectando con Stripe:', stripeError.message);
      }
    } else {
      console.log('   ⚠️  No se puede verificar (falta STRIPE_SECRET_KEY)');
    }

    // Resumen final
    console.log('\n' + '='.repeat(60));
    console.log('📊 RESUMEN DE VERIFICACIÓN');
    console.log('='.repeat(60));
    
    const allGood = hasStripeKey && hasWebhookSecret && columns.length === 2;
    
    if (allGood) {
      console.log('\n✅ TODO ESTÁ CONFIGURADO CORRECTAMENTE\n');
      console.log('Próximos pasos:');
      console.log('1. Asegúrate de que tu servidor esté corriendo');
      console.log('2. Configura el webhook en Stripe Dashboard');
      console.log('3. Usa la URL: ' + (apiUrl + '/api/stripe/webhook'));
      console.log('4. Selecciona los eventos:');
      console.log('   - checkout.session.completed');
      console.log('   - payment_intent.succeeded');
      console.log('   - payment_intent.payment_failed');
      console.log('5. Haz un pago de prueba para verificar');
    } else {
      console.log('\n⚠️  FALTAN CONFIGURACIONES:\n');
      if (!hasStripeKey) console.log('❌ Agregar STRIPE_SECRET_KEY al .env');
      if (!hasWebhookSecret) console.log('❌ Agregar STRIPE_WEBHOOK_SECRET al .env');
      if (columns.length !== 2) console.log('❌ Ejecutar migración de campos de Stripe');
    }

    console.log('\n' + '='.repeat(60) + '\n');

  } catch (error) {
    console.error('\n❌ ERROR DURANTE LA VERIFICACIÓN:', error.message);
    console.error(error);
  } finally {
    await sequelize.close();
    process.exit(0);
  }
}

// Ejecutar
testStripeWebhookConfiguration();
