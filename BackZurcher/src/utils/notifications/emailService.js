const nodemailer = require('nodemailer');
require('dotenv').config();

// Configurar el transporte de Nodemailer
const createTransporter = () => {
  if (process.env.NODE_ENV === 'production') {
    // 🚀 CONFIGURACIÓN ULTRA AGRESIVA PARA RAILWAY
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD
      },
      // 🔥 TIMEOUTS EXTREMADAMENTE CORTOS PARA RAILWAY
      connectionTimeout: 8000,   // 8 segundos máximo
      greetingTimeout: 5000,     // 5 segundos máximo  
      socketTimeout: 8000,       // 8 segundos máximo
      pool: false,               // Sin pool - conexión directa
      maxConnections: 1,         // Solo 1 conexión
      maxMessages: 1,            // 1 mensaje por conexión
      logger: false,
      debug: false,
      secure: true,              // Forzar SSL
      requireTLS: true,          // Requerir TLS
      tls: {
        rejectUnauthorized: false,
        minVersion: 'TLSv1.2'
      }
    });
  } else {
    // ✅ CONFIGURACIÓN ESTÁNDAR PARA DESARROLLO
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD
      },
      connectionTimeout: 30000,
      greetingTimeout: 15000,
      socketTimeout: 30000,
      pool: true,
      maxConnections: 3,
      maxMessages: 50,
      rateDelta: 500,
      rateLimit: 3,
      requireTLS: true,
      logger: false,
      debug: false,
      tls: {
        rejectUnauthorized: false
      }
    });
  }
};

// ✅ NO CREAR TRANSPORTER AL CARGAR EL MÓDULO
// Lo crearemos dinámicamente cuando sea necesario

// Función para enviar el correo
const sendEmail = async (mailOptions) => {
  const startTime = Date.now();
  try {
    // *** LOG DETALLADO ***
    console.log('📧 Iniciando envío de email a:', mailOptions?.to); 
    
    if (!mailOptions || !mailOptions.to || !mailOptions.to.includes('@')) {
       console.error('❌ Error en sendEmail: Destinatario inválido o faltante:', mailOptions?.to);
       return { success: false, error: 'Destinatario inválido' };
    }

    // Asegúrate de que el 'from' esté configurado
    const optionsToSend = {
      from: `"ZURCHER CONSTRUCTION" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
      ...mailOptions,
    };

    console.log(`📤 Enviando email a ${optionsToSend.to} con subject: "${optionsToSend.subject}"`);

    // 🚀 TIMEOUT ULTRA AGRESIVO PARA RAILWAY
    const timeoutMs = process.env.NODE_ENV === 'production' ? 10000 : 45000; // 10s en prod, 45s en dev
    
    // ✅ FUNCIÓN PARA ENVIAR CON TIMEOUT Y TRANSPORTER ESPECÍFICO
    const sendWithTimeoutAndTransporter = (transporterToUse, attempt = 1) => {
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error(`Email timeout después de ${timeoutMs/1000} segundos (intento ${attempt})`));
        }, timeoutMs);

        console.log(`⏱️ Enviando email con timeout de ${timeoutMs/1000}s (intento ${attempt})...`);
        
        transporterToUse.sendMail(optionsToSend)
          .then(result => {
            clearTimeout(timeout);
            resolve(result);
          })
          .catch(error => {
            clearTimeout(timeout);
            reject(error);
          });
      });
    };

    let info;
    try {
      // ✅ PRIMER INTENTO - CREAR TRANSPORTER DINÁMICAMENTE
      const primaryTransporter = createTransporter();
      info = await sendWithTimeoutAndTransporter(primaryTransporter, 1);
    } catch (firstError) {
      console.log(`⚠️ Primer intento falló, intentando con configuración alternativa...`);
      
      // 🚀 SEGUNDO INTENTO CON CONFIGURACIÓN EXTREMA PARA RAILWAY
      const fallbackTransporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASSWORD
        },
        // 🔥 CONFIGURACIÓN ULTRA MINIMALISTA
        pool: false,               // Sin pool - conexión directa
        connectionTimeout: 5000,   // Solo 5 segundos
        greetingTimeout: 3000,     // Solo 3 segundos
        socketTimeout: 5000,       // Solo 5 segundos
        logger: false,
        debug: false
      });
      
      try {
        info = await sendWithTimeoutAndTransporter(fallbackTransporter, 2);
      } catch (secondError) {
        console.log(`⚠️ Segundo intento falló, probando SMTP directo como último recurso...`);
        
        // 🆘 TERCER INTENTO CON SMTP DIRECTO (último recurso)
        const directTransporter = nodemailer.createTransport({
          host: 'smtp.gmail.com',
          port: 587,
          secure: false,
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASSWORD
          },
          // 💀 CONFIGURACIÓN DESESPERADA
          pool: false,
          connectionTimeout: 3000,   // Solo 3 segundos
          greetingTimeout: 2000,     // Solo 2 segundos
          socketTimeout: 3000,       // Solo 3 segundos
          logger: false,
          debug: false,
          requireTLS: true,
          tls: {
            rejectUnauthorized: false
          }
        });
        
        info = await sendWithTimeoutAndTransporter(directTransporter, 3);
      }
    }

    const duration = Date.now() - startTime;
    
    console.log(`✅ Email enviado exitosamente en ${duration}ms. MessageId: ${info.messageId}`);
    return { success: true, messageId: info.messageId, duration };
    
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`❌ Error enviando email después de ${duration}ms:`, {
      error: error.message,
      to: mailOptions?.to,
      subject: mailOptions?.subject,
      stack: error.stack
    });
    
    // ✅ RETORNAR ERROR EN LUGAR DE LANZARLO PARA NO ROMPER EL PROCESO
    return { 
      success: false, 
      error: error.message, 
      duration,
      to: mailOptions?.to 
    };
  }
};

// ✅ FUNCIÓN DE DIAGNÓSTICO PARA PRODUCCIÓN
const diagnoseEmailService = async () => {
  console.log('🔍 Iniciando diagnóstico del servicio de email...');
  
  try {
    // Crear transporter dinámicamente
    const transporter = createTransporter();
    
    console.log('📧 Verificando conexión SMTP...');
    const isConnected = await new Promise((resolve) => {
      const timeout = setTimeout(() => {
        resolve(false);
      }, 10000); // 10 segundos de timeout
      
      transporter.verify((error, success) => {
        clearTimeout(timeout);
        if (error) {
          console.error('❌ Error de verificación SMTP:', error.message);
          resolve(false);
        } else {
          console.log('✅ Conexión SMTP verificada exitosamente');
          resolve(true);
        }
      });
    });
    
    return {
      success: isConnected,
      environment: process.env.NODE_ENV,
      smtpUser: process.env.SMTP_USER ? '✅ Configurado' : '❌ Faltante',
      smtpPass: process.env.SMTP_PASSWORD ? '✅ Configurado' : '❌ Faltante',
      connection: isConnected ? '✅ Exitosa' : '❌ Falló'
    };
  } catch (error) {
    console.error('❌ Error en diagnóstico:', error.message);
    return {
      success: false,
      error: error.message,
      environment: process.env.NODE_ENV
    };
  }
};

module.exports = { sendEmail, diagnoseEmailService };