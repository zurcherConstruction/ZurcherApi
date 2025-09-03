const nodemailer = require('nodemailer');
require('dotenv').config();

// Configurar el transporte de Nodemailer
const createTransporter = () => {
  if (process.env.NODE_ENV === 'production') {
    // ✅ CONFIGURACIÓN OPTIMIZADA PARA GMAIL EN PRODUCCIÓN
    return nodemailer.createTransport({
      service: 'gmail', // Usar servicio predefinido de Gmail
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD
      },
      // ✅ CONFIGURACIONES AGRESIVAS PARA PRODUCCIÓN
      connectionTimeout: 15000,  // 15 segundos
      greetingTimeout: 10000,    // 10 segundos
      socketTimeout: 15000,      // 15 segundos
      pool: true,
      maxConnections: 2,         // Solo 2 conexiones
      maxMessages: 10,           // Pocos mensajes por conexión
      rateDelta: 1000,           // 1 segundo entre mensajes
      rateLimit: 1,              // 1 mensaje por segundo
      logger: false,
      debug: false,
      tls: {
        rejectUnauthorized: false
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

const transporter = createTransporter();

// Verificar la configuración del transporter
transporter.verify((error, success) => {
  if (error) {
    console.error('❌ Error al verificar la configuración SMTP:', error);
  } else {
    console.log('✅ Servidor SMTP listo para enviar correos');
  }
});

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

    // ✅ TIMEOUT MÁS AGRESIVO PARA PRODUCCIÓN
    const timeoutMs = process.env.NODE_ENV === 'production' ? 15000 : 45000; // 15s en prod, 45s en dev
    
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
      // ✅ PRIMER INTENTO CON TRANSPORTER PRINCIPAL
      info = await sendWithTimeoutAndTransporter(transporter, 1);
    } catch (firstError) {
      console.log(`⚠️ Primer intento falló, intentando con configuración alternativa...`);
      
      // ✅ SEGUNDO INTENTO CON CONFIGURACIÓN ALTERNATIVA MÁS SIMPLE
      const fallbackTransporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASSWORD
        },
        // ✅ CONFIGURACIÓN MÍNIMA PARA MÁXIMA VELOCIDAD
        pool: false, // Sin pool para conexión directa
        connectionTimeout: 10000,
        greetingTimeout: 5000,
        socketTimeout: 10000,
        logger: false,
        debug: false
      });
      
      info = await sendWithTimeoutAndTransporter(fallbackTransporter, 2);
    }

    const duration = Date.now() - startTime;
    
    console.log(`✅ Email enviado exitosamente en ${duration}ms. MessageId: ${info.messageId}`);
    return { success: true, info, duration };
    
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`❌ Error al enviar email después de ${duration}ms:`, {
      to: mailOptions?.to,
      subject: mailOptions?.subject,
      error: error.message,
      stack: error.stack
    });
    return { success: false, error: error.message, duration };
  }
};

module.exports = { sendEmail };