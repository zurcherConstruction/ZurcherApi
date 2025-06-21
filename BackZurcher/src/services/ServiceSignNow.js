const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

class SignNowService {
  constructor() {
    this.apiKey = process.env.SIGNNOW_API_KEY; // Solo necesitamos la API Key
    
    // ✅ URL BASE CORRECTA (sin /oauth2/token)
    this.baseURL = 'https://api.signnow.com';
    
    console.log('=== CONFIGURACIÓN SIGNNOW LIVE (API KEY) ===');
    console.log(`🔧 Modo: Live (Production) - Sin OAuth`);
    console.log(`🌐 URL base: ${this.baseURL}`);
    console.log(`🔑 API Key: ${this.apiKey ? 'CONFIGURADO' : 'NO CONFIGURADO'}`);
    console.log('===========================================');
    
    if (!this.apiKey) {
      console.error('❌ SIGNNOW_API_KEY no configurada en variables de entorno');
    }
  }

  // Obtener headers con API Key directa (no OAuth necesario)
 getHeaders(contentType = 'application/json', useBasic = true) {
    const basicAuth = `Basic ${Buffer.from(this.apiKey + ':').toString('base64')}`;
    const bearerAuth = `Bearer ${this.apiKey}`;
    
    const authMethod = useBasic ? basicAuth : bearerAuth;
    console.log(`🔍 Usando ${useBasic ? 'Basic' : 'Bearer'} Auth:`, authMethod.substring(0, 30) + '...');
    
    return {
      'Accept': 'application/json',
      'Authorization': authMethod,
      'Content-Type': contentType
    };
  }

  // Subir documento usando DUAL METHOD con fallback automático
  async uploadDocument(filePath, fileName) {
    // Definir los métodos de autenticación a probar
    const authMethods = [
      { type: 'Basic', getAuth: () => `Basic ${Buffer.from(this.apiKey + ':').toString('base64')}` },
      { type: 'Bearer', getAuth: () => `Bearer ${this.apiKey}` }
    ];

    try {
      if (!this.apiKey) {
        throw new Error('API Key no configurada');
      }

      console.log('\n🔄 === INICIANDO UPLOAD DE DOCUMENTO ===');
      console.log(`📄 Archivo: ${fileName}`);
      console.log(`📁 Origen: ${filePath}`);
      console.log(`📡 URL de destino: ${this.baseURL}/document`);

      let fileStream;
      let fileSize;

      // Manejar tanto archivos locales como URLs
      if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
        console.log('   -> Origen es una URL. Descargando archivo en memoria...');
        const axios = require('axios');
        const response = await axios({
          method: 'GET',
          url: filePath,
          responseType: 'stream',
          timeout: 30000
        });
        fileStream = response.data;
        fileSize = response.headers['content-length'] || 'desconocido';
      } else {
        console.log('   -> Origen es archivo local. Verificando existencia...');
        if (!fs.existsSync(filePath)) {
          console.error(`❌ ERROR: Archivo no encontrado en ${filePath}`);
          throw new Error(`Archivo no encontrado: ${filePath}`);
        }
        fileStream = fs.createReadStream(filePath);
        fileSize = fs.statSync(filePath).size;
      }

      console.log(`✅ Archivo accesible, tamaño: ${fileSize} bytes`);

      // Probar cada método de autenticación
      for (let i = 0; i < authMethods.length; i++) {
        const method = authMethods[i];
        console.log(`\n🔄 Probando método ${i + 1}/2: ${method.type} Auth...`);

        try {
          const formData = new FormData();
          
          // Recrear el stream para cada intento
          if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
            const axios = require('axios');
            const response = await axios({
              method: 'GET',
              url: filePath,
              responseType: 'stream',
              timeout: 30000
            });
            formData.append('file', response.data, fileName);
          } else {
            formData.append('file', fs.createReadStream(filePath), fileName);
          }

          console.log('📤 Subiendo a la API de SignNow...');

          const response = await axios.post(`${this.baseURL}/document`, formData, {
            headers: {
              'Accept': 'application/json',
              'Authorization': method.getAuth(),
              ...formData.getHeaders()
            },
            timeout: 30000
          });

          console.log(`✅ ${method.type} Auth FUNCIONÓ!`);
          console.log('📥 Respuesta de upload:');
          console.log(`Status: ${response.status}`);
          console.log(`Document ID: ${response.data.id}`);
          console.log(`✅ Documento subido exitosamente: ${fileName}`);
          console.log('=== FIN UPLOAD DE DOCUMENTO ===\n');
          
          return response.data.id;

        } catch (error) {
          console.log(`❌ ${method.type} Auth FALLÓ:`, error.response?.data?.error || error.message);
          
          // Si es el último método, lanzar el error
          if (i === authMethods.length - 1) {
            console.log('\n❌ === TODOS LOS MÉTODOS DE AUTH FALLARON ===');
            console.log('Error final:', error.message);
            console.log('Status:', error.response?.status);
            console.log('Response Data:', JSON.stringify(error.response?.data, null, 2));
            console.log('================================\n');
            throw error;
          }
          
          // Continuar con el siguiente método
          console.log(`🔄 Intentando con ${authMethods[i + 1].type} Auth...`);
        }
      }

    } catch (error) {
      console.log('\n❌ === ERROR EN UPLOAD DE DOCUMENTO ===');
      console.log('Error message:', error.message);
      console.log('Status:', error.response?.status);
      console.log('Status Text:', error.response?.statusText);
      console.log('Response Data:', JSON.stringify(error.response?.data, null, 2));
      console.log('================================\n');
      throw error;
    }
  }

  // Crear invitación para firma usando API Key directamente
 async createSigningInvite(documentId, signerEmail, signerName, fromEmail = null) {
    const authMethods = [
      { type: 'Basic', headers: () => this.getHeaders('application/json', true) },
      { type: 'Bearer', headers: () => this.getHeaders('application/json', false) }
    ];

    try {
      if (!this.apiKey) {
        throw new Error('API Key no configurada');
      }

      console.log('\n🔄 === CREANDO FREEFORM INVITE (DOCUMENTACIÓN OFICIAL) ===');
      console.log(`📧 Email del firmante: ${signerEmail}`);
      console.log(`👤 Nombre del firmante: ${signerName}`);
      console.log(`📄 Document ID: ${documentId}`);
      console.log(`📧 From Email: ${fromEmail || "zurcherseptic@gmail.com"}`);
      console.log(`📡 URL: ${this.baseURL}/document/${documentId}/invite`);

      // Validar inputs
      if (!documentId) {
        console.error('❌ ERROR: documentId es requerido');
        throw new Error('documentId es requerido');
      }
      
      if (!signerEmail || !signerEmail.includes('@')) {
        console.error(`❌ ERROR: Email inválido: ${signerEmail}`);
        throw new Error(`Email inválido: ${signerEmail}`);
      }

      const inviteData = {
        document_id: documentId,
        to: signerEmail,
        from: fromEmail || "zurcherseptic@gmail.com",
        subject: `Please sign: Budget Document - Zurcher Construction`,
        message: `Hi ${signerName || 'there'}, please review and sign this budget document from Zurcher Construction. Thank you!`,
        language: "en",
        redirect_target: "blank",
        redirect_uri: process.env.FRONTEND_URL2 || "https://zurcher-api-fvus.vercel.app/"
      };

      console.log('📤 Datos de FREEFORM INVITE (formato oficial):');
      console.log(JSON.stringify(inviteData, null, 2));

      // Probar cada método de autenticación
      for (let i = 0; i < authMethods.length; i++) {
        const method = authMethods[i];
        console.log(`\n🔄 Probando método ${i + 1}/2: ${method.type} Auth para invite...`);

        try {
          const response = await axios.post(
            `${this.baseURL}/document/${documentId}/invite`, 
            inviteData, 
            { 
              headers: method.headers(),
              timeout: 30000
            }
          );

          console.log(`✅ ${method.type} Auth FUNCIONÓ para invite!`);
          console.log('📥 Respuesta de FREEFORM INVITE:');
          console.log(`Status: ${response.status}`);
          console.log(`✅ FREEFORM INVITE creado exitosamente para ${signerEmail}`);
          console.log('=== FIN CREACIÓN DE FREEFORM INVITE ===\n');
          
          return response.data;

        } catch (error) {
          console.log(`❌ ${method.type} Auth FALLÓ para invite:`, error.response?.data?.error || error.message);
          
          if (i === authMethods.length - 1) {
            console.log('\n❌ === TODOS LOS MÉTODOS DE AUTH FALLARON PARA INVITE ===');
            console.log('Error final:', error.message);
            console.log('Status:', error.response?.status);
            console.log('Response Data:', JSON.stringify(error.response?.data, null, 2));
            console.log('================================\n');
            throw error;
          }
          
          console.log(`🔄 Intentando invite con ${authMethods[i + 1].type} Auth...`);
        }
      }

    } catch (error) {
      console.log('\n❌ === ERROR EN CREACIÓN DE FREEFORM INVITE ===');
      console.log('Error message:', error.message);
      console.log('Status:', error.response?.status);
      console.log('Response Data:', JSON.stringify(error.response?.data, null, 2));
      console.log('================================\n');
      throw error;
    }
  }

  // Obtener estado del documento
  async getDocumentStatus(documentId) {
    try {
      if (!this.apiKey) {
        throw new Error('API Key no configurada');
      }

      console.log(`🔄 Obteniendo estado del documento: ${documentId}`);
      console.log(`📡 URL: ${this.baseURL}/document/${documentId}`);

      const response = await axios.get(
        `${this.baseURL}/document/${documentId}`, 
        { headers: this.getHeaders() }
      );

      console.log('📥 Estado del documento obtenido:');
      console.log(JSON.stringify(response.data, null, 2));

      return response.data;
    } catch (error) {
      console.error('Error obteniendo estado del documento:', error.response?.data || error.message);
      throw error;
    }
  }

  // Verificar si el documento está firmado
  async isDocumentSigned(documentId) {
    try {
      console.log(`[SignNowService] Verificando estado detallado del documento: ${documentId}`);
      const documentDetails = await this.getDocumentStatus(documentId);

      if (!documentDetails) {
        console.log(`[SignNowService] No se pudieron obtener detalles para el documento ${documentId}.`);
        return { isSigned: false, status: 'not_found', signatures: [], invites: [] };
      }

      // La lógica clave:
      // 1. ¿Hay invitaciones (requests)?
      const hasInvites = Array.isArray(documentDetails.requests) && documentDetails.requests.length > 0;
      if (!hasInvites) {
        console.log(`[SignNowService] El documento ${documentId} no tiene invitaciones. No se puede considerar firmado.`);
        return { isSigned: false, status: 'no_invites', signatures: [], invites: [] };
      }

      // 2. ¿TODAS las invitaciones tienen una firma?
      const allInvitesAreSigned = documentDetails.requests.every(
        (req) => req.signature_id !== null && req.signature_id !== undefined
      );

      if (allInvitesAreSigned) {
        console.log(`[SignNowService] ¡Éxito! Todas las ${documentDetails.requests.length} invitaciones para el documento ${documentId} están firmadas.`);
      } else {
        console.log(`[SignNowService] Aún pendiente. No todas las invitaciones para el documento ${documentId} están firmadas.`);
      }

      return {
        isSigned: allInvitesAreSigned,
        status: allInvitesAreSigned ? 'signed' : 'pending',
        signatures: documentDetails.signatures || [],
        invites: documentDetails.requests || []
      };

    } catch (error) {
      console.error(`[SignNowService] Error en isDocumentSigned para ${documentId}:`, error.message);
      throw error;
    }
  }

  // Descargar documento firmado
  async downloadSignedDocument(documentId, downloadPath) {
    try {
      if (!this.apiKey) {
        throw new Error('API Key no configurada');
      }

      console.log(`🔄 Descargando documento firmado: ${documentId}`);
      console.log(`📡 URL: ${this.baseURL}/document/${documentId}/download`);

      const response = await axios.get(
        `${this.baseURL}/document/${documentId}/download`, 
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`
          },
          responseType: 'stream'
        }
      );

      const writer = fs.createWriteStream(downloadPath);
      response.data.pipe(writer);

      return new Promise((resolve, reject) => {
        writer.on('finish', () => {
          console.log(`✅ Documento descargado: ${downloadPath}`);
          resolve();
        });
        writer.on('error', reject);
      });
    } catch (error) {
      console.error('Error descargando documento:', error.response?.data || error.message);
      throw error;
    }
  }

  // Método principal para enviar presupuesto para firma
 async sendBudgetForSignature(pdfPath, fileName, signerEmail, signerName) {
    try {
      console.log('\n🚀 === INICIANDO PROCESO COMPLETO DE ENVÍO A SIGNNOW ===');
      console.log(`📄 Archivo: ${fileName}`);
      console.log(`📁 Ruta: ${pdfPath}`);
      console.log(`📧 Firmante: ${signerName} (${signerEmail})`);
      console.log(`⏰ Timestamp: ${new Date().toISOString()}`);
      
      // Paso 1: Subir documento
      console.log('📤 PASO 1: Subiendo documento...');
      const documentId = await this.uploadDocument(pdfPath, fileName);
      
      // Paso 2: Crear invitación usando email de la cuenta SignNow
      console.log('📨 PASO 2: Creando invitación de firma...');
      
      // ✅ IMPORTANTE: Usar el email de tu cuenta SignNow como remitente
      const signNowAccountEmail = 'zurcherseptic@gmail.com'; // Tu email de SignNow
      const inviteResult = await this.createSigningInvite(documentId, signerEmail, signerName, signNowAccountEmail);
      
      const result = {
        documentId,
        inviteId: inviteResult.id || documentId,
        status: 'sent',
        signerEmail,
        signerName,
        fileName,
        timestamp: new Date().toISOString()
      };
      
      console.log('🎉 === PROCESO COMPLETO EXITOSO ===');
      console.log('📊 Resultado final:');
      console.log(JSON.stringify(result, null, 2));
      console.log('=== FIN PROCESO COMPLETO ===\n');
      
      return result;
    } catch (error) {
      console.log('\n💥 === ERROR EN PROCESO COMPLETO ===');
      console.log('Error message:', error.message);
      console.log('Stack trace:', error.stack);
      console.log('================================\n');
      throw error;
    }
  }

  // Test de conexión simplificado (sin OAuth)
  async testConnection() {
    try {
      console.log('\n🔍 === TEST DE CONEXIÓN SIGNNOW (API KEY) ===');
      
      if (!this.apiKey) {
        return {
          success: false,
          error: 'API Key no configurada',
          message: 'SIGNNOW_API_KEY no está configurada en las variables de entorno'
        };
      }

      console.log('🔄 Probando conexión con API Key...');
      console.log(`📡 URL: ${this.baseURL}/user`);
      
      const response = await axios.get(`${this.baseURL}/user`, {
        headers: this.getHeaders()
      });

      console.log('📥 Respuesta del usuario:');
      console.log('Status:', response.status);
      console.log('User Data:', JSON.stringify(response.data, null, 2));
      console.log('✅ === CONEXIÓN EXITOSA ===\n');

      return {
        success: true,
        user: response.data.email || response.data.first_name || 'Usuario conectado',
        message: 'Conexión exitosa con SignNow (API Key)',
        details: {
          baseURL: this.baseURL,
          userInfo: response.data,
          authMethod: 'API Key'
        }
      };
    } catch (error) {
      console.log('\n❌ === ERROR EN TEST DE CONEXIÓN ===');
      console.log('Status:', error.response?.status);
      console.log('Status Text:', error.response?.statusText);
      console.log('Response Data:', JSON.stringify(error.response?.data, null, 2));
      console.log('Request URL:', error.config?.url);
      console.log('Request Headers:', error.config?.headers);
      console.log('Error Message:', error.message);
      console.log('================================\n');
      
      return {
        success: false,
        error: error.message,
        details: {
          status: error.response?.status,
          statusText: error.response?.statusText,
          responseData: error.response?.data,
          baseURL: this.baseURL,
          authMethod: 'API Key'
        },
        message: 'Error en conexión con SignNow'
      };
    }
  }
}

module.exports = SignNowService;