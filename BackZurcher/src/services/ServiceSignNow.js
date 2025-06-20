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
  getHeaders(contentType = 'application/json') {
    return {
      'Accept': 'application/json',
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': contentType
    };
  }

  // Subir documento usando API Key directamente
 async uploadDocument(filePath, fileName) {
    try {
      if (!this.apiKey) {
        throw new Error('API Key no configurada');
      }

      console.log('\n🔄 === INICIANDO UPLOAD DE DOCUMENTO ===');
      console.log(`📄 Archivo: ${fileName}`);
      console.log(`📁 Ruta: ${filePath}`);
      console.log(`📡 URL: ${this.baseURL}/document`);
      
      // Verificar que el archivo existe
      if (!fs.existsSync(filePath)) {
        console.error(`❌ ERROR: Archivo no encontrado en ${filePath}`);
        throw new Error(`Archivo no encontrado: ${filePath}`);
      }
      
      console.log(`✅ Archivo existe, tamaño: ${fs.statSync(filePath).size} bytes`);
      
      const formData = new FormData();
      formData.append('file', fs.createReadStream(filePath), fileName);

      console.log('📤 Headers que se enviarán:');
      console.log({
        'Accept': 'application/json',
        'Authorization': `Bearer ${this.apiKey.substring(0, 20)}...`,
        ...formData.getHeaders()
      });

      const response = await axios.post(`${this.baseURL}/document`, formData, {
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
          ...formData.getHeaders()
        },
        timeout: 30000 // 30 segundos timeout
      });

      console.log('📥 Respuesta de upload:');
      console.log(`Status: ${response.status}`);
      console.log(`Data:`, JSON.stringify(response.data, null, 2));
      console.log(`✅ Documento subido exitosamente: ${fileName} (ID: ${response.data.id})`);
      console.log('=== FIN UPLOAD DE DOCUMENTO ===\n');
      
      return response.data.id;
    } catch (error) {
      console.log('\n❌ === ERROR EN UPLOAD DE DOCUMENTO ===');
      console.log('Error message:', error.message);
      console.log('Status:', error.response?.status);
      console.log('Status Text:', error.response?.statusText);
      console.log('Response Data:', JSON.stringify(error.response?.data, null, 2));
      console.log('Request URL:', error.config?.url);
      console.log('Request Headers:', error.config?.headers);
      console.log('================================\n');
      throw error;
    }
  }

  // Crear invitación para firma usando API Key directamente
async createSigningInvite(documentId, signerEmail, signerName, fromEmail = null) {
  try {
    if (!this.apiKey) {
      throw new Error('API Key no configurada');
    }

    console.log('\n🔄 === CREANDO FREEFORM INVITE (DOCUMENTACIÓN OFICIAL) ===');
    console.log(`📧 Email del firmante: ${signerEmail}`);
    console.log(`👤 Nombre del firmante: ${signerName}`);
    console.log(`📄 Document ID: ${documentId}`);
    console.log(`📧 From Email: ${fromEmail || "zurcherseptic@gmail.com"}`);
    console.log(`📡 URL: ${this.baseURL}/document/${documentId}/invite`); // ✅ CORRECTO: /invite

    // Validar inputs
    if (!documentId) {
      console.error('❌ ERROR: documentId es requerido');
      throw new Error('documentId es requerido');
    }
    
    if (!signerEmail || !signerEmail.includes('@')) {
      console.error(`❌ ERROR: Email inválido: ${signerEmail}`);
      throw new Error(`Email inválido: ${signerEmail}`);
    }

    // ✅ FORMATO FREEFORM SEGÚN DOCUMENTACIÓN OFICIAL
    const inviteData = {
      document_id: documentId, // ✅ CLAVE: Esto indica que es freeform invite
      to: signerEmail, // ✅ Solo email (string), no array
      from: fromEmail || "zurcherseptic@gmail.com", // ✅ Debe ser tu email de SignNow
      subject: `Please sign: Budget Document - Zurcher Construction`,
      message: `Hi ${signerName || 'there'}, please review and sign this budget document from Zurcher Construction. Thank you!`,
      language: "en",
      redirect_target: "blank",
      redirect_uri: process.env.FRONTEND_URL2 || "https://zurcher-api-fvus.vercel.app/"
    };

    console.log('📤 Datos de FREEFORM INVITE (formato oficial):');
    console.log(JSON.stringify(inviteData, null, 2));
    
    console.log('📤 Headers que se enviarán:');
    console.log({
      'Accept': 'application/json',
      'Authorization': `Bearer ${this.apiKey.substring(0, 20)}...`,
      'Content-Type': 'application/json'
    });

    // ✅ ENDPOINT CORRECTO: /invite (no /freeforminvite)
    const response = await axios.post(
      `${this.baseURL}/document/${documentId}/invite`, 
      inviteData, 
      { 
        headers: this.getHeaders(),
        timeout: 30000
      }
    );

    console.log('📥 Respuesta de FREEFORM INVITE:');
    console.log(`Status: ${response.status}`);
    console.log(`Data:`, JSON.stringify(response.data, null, 2));
    console.log(`✅ FREEFORM INVITE creado exitosamente para ${signerEmail}`);
    console.log('=== FIN CREACIÓN DE FREEFORM INVITE ===\n');
    
    return response.data;
  } catch (error) {
    console.log('\n❌ === ERROR EN CREACIÓN DE FREEFORM INVITE ===');
    console.log('Error message:', error.message);
    console.log('Status:', error.response?.status);
    console.log('Status Text:', error.response?.statusText);
    console.log('Response Data:', JSON.stringify(error.response?.data, null, 2));
    console.log('Request URL:', error.config?.url);
    console.log('Request Headers:', error.config?.headers);
    console.log('Request Data:', error.config?.data);
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

      return {
        id: response.data.id,
        document_name: response.data.document_name,
        page_count: response.data.page_count,
        created: response.data.created,
        updated: response.data.updated,
        status: response.data.status,
        signatures: response.data.signatures || [],
        invites: response.data.invites || []
      };
    } catch (error) {
      console.error('Error obteniendo estado del documento:', error.response?.data || error.message);
      throw error;
    }
  }

  // Verificar si el documento está firmado
  async isDocumentSigned(documentId) {
    try {
      const documentStatus = await this.getDocumentStatus(documentId);
      
      const allSignaturesComplete = documentStatus.signatures.every(signature => 
        signature.status === 'signed'
      );
      
      return {
        isSigned: allSignaturesComplete,
        status: documentStatus.status,
        signatures: documentStatus.signatures
      };
    } catch (error) {
      console.error('Error verificando firma del documento:', error);
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