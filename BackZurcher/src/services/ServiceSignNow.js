const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

class SignNowService {
  constructor() {
    this.apiKey = process.env.SIGNNOW_API_KEY; // Solo necesitamos la API Key
    
    // ✅ URL BASE CORRECTA (sin /oauth2/token)
    this.baseURL = 'https://api.signnow.com';
    
    if (!this.apiKey) {
      console.error('❌ SIGNNOW_API_KEY no configurada en variables de entorno');
    }
  }

  // Obtener headers con API Key directa (no OAuth necesario)
 getHeaders(contentType = 'application/json', useBasic = true) {
    const basicAuth = `Basic ${Buffer.from(this.apiKey + ':').toString('base64')}`;
    const bearerAuth = `Bearer ${this.apiKey}`;
    
    const authMethod = useBasic ? basicAuth : bearerAuth;
    
    
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

     

      let fileStream;
      let fileSize;

      // Manejar tanto archivos locales como URLs
      if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
       
        const axios = require('axios');
        const response = await axios({
          method: 'GET',
          url: filePath,
          responseType: 'stream',
          timeout: 60000
        });
        fileStream = response.data;
        fileSize = response.headers['content-length'] || 'desconocido';
      } else {
       
        if (!fs.existsSync(filePath)) {
          console.error(`❌ ERROR: Archivo no encontrado en ${filePath}`);
          throw new Error(`Archivo no encontrado: ${filePath}`);
        }
        fileStream = fs.createReadStream(filePath);
        fileSize = fs.statSync(filePath).size;
      }

    

      // Probar cada método de autenticación
      for (let i = 0; i < authMethods.length; i++) {
        const method = authMethods[i];
       
        try {
          const formData = new FormData();
          
          // Recrear el stream para cada intento
          if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
            const axios = require('axios');
            const response = await axios({
              method: 'GET',
              url: filePath,
              responseType: 'stream',
              timeout: 60000
            });
            formData.append('file', response.data, fileName);
          } else {
            formData.append('file', fs.createReadStream(filePath), fileName);
          }

        

          const response = await axios.post(`${this.baseURL}/document`, formData, {
            headers: {
              'Accept': 'application/json',
              'Authorization': method.getAuth(),
              ...formData.getHeaders()
            },
            timeout: 60000, // CAMBIAR DE 30000 A 60000 (60 segundos)
            maxContentLength: Infinity,
            maxBodyLength: Infinity
          });

         
          return response.data.id;

        } catch (error) {
          console.log(`❌ ${method.type} Auth FALLÓ:`, error.response?.data?.error || error.message);
          
          // Si es el último método, lanzar el error
          if (i === authMethods.length - 1) {
           
            throw error;
          }
          
          
        }
      }

    } catch (error) {
      
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
        redirect_uri: process.env.FRONTEND_URL || "https://zurcherseptic.com",
      };

      

      // Probar cada método de autenticación
      for (let i = 0; i < authMethods.length; i++) {
        const method = authMethods[i];
       

        try {
          const response = await axios.post(
            `${this.baseURL}/document/${documentId}/invite`, 
            inviteData, 
            { 
              headers: method.headers(),
              timeout: 60000
            }
          );

         
          
          return response.data;

        } catch (error) {
         
          
          if (i === authMethods.length - 1) {
            
            throw error;
          }
          
         
        }
      }

    } catch (error) {
     
      throw error;
    }
  }

  // Obtener estado del documento
 async getDocumentStatus(documentId) {
    const authMethods = [
      { type: 'Basic', headers: () => this.getHeaders('application/json', true) },
      { type: 'Bearer', headers: () => this.getHeaders('application/json', false) }
    ];

    try {
      if (!this.apiKey) {
        throw new Error('API Key no configurada');
      }

      

      // Probar cada método de autenticación
      for (let i = 0; i < authMethods.length; i++) {
        const method = authMethods[i];
       

        try {
          const response = await axios.get(`${this.baseURL}/document/${documentId}`, {
            headers: method.headers(),
            timeout: 60000
          });

         
          
          return response.data;

        } catch (error) {
         
          
          if (i === authMethods.length - 1) {
           
            throw error;
          }
        }
      }

    } catch (error) {
      console.error('Error obteniendo estado del documento:', error.response?.data || error.message);
      throw error;
    }
  }

  // Verificar si el documento está firmado
  async isDocumentSigned(documentId) {
    try {
      
      const documentDetails = await this.getDocumentStatus(documentId);

      if (!documentDetails) {
       
        return { isSigned: false, status: 'not_found', signatures: [], invites: [] };
      }

      // La lógica clave:
      // 1. ¿Hay invitaciones (requests)?
      const hasInvites = Array.isArray(documentDetails.requests) && documentDetails.requests.length > 0;
      if (!hasInvites) {
       
        return { isSigned: false, status: 'no_invites', signatures: [], invites: [] };
      }

      // 2. ¿TODAS las invitaciones tienen una firma?
      const allInvitesAreSigned = documentDetails.requests.every(
        (req) => req.signature_id !== null && req.signature_id !== undefined
      );

      if (allInvitesAreSigned) {
       
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

      // Usar el endpoint correcto para PDF "flattened" (firma visible)
      const downloadUrl = `${this.baseURL}/document/${documentId}/download?type=collapsed`;
      
      const response = await axios.get(
        downloadUrl,
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
         
          resolve();
        });
        writer.on('error', reject);
      });
    } catch (error) {
      console.error('Error descargando documento (flattened):', error.response?.data || error.message);
      throw error;
    }
  }

  // Método principal para enviar presupuesto para firma
 async sendBudgetForSignature(pdfPath, fileName, signerEmail, signerName) {
    try {
      
      
      // Paso 1: Subir documento
      
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
      
     
      
      return result;
    } catch (error) {
    
      throw error;
    }
  }

  // Test de conexión simplificado (sin OAuth)
  async testConnection() {
    try {
     
      
      if (!this.apiKey) {
        return {
          success: false,
          error: 'API Key no configurada',
          message: 'SIGNNOW_API_KEY no está configurada en las variables de entorno'
        };
      }

      
      
      const response = await axios.get(`${this.baseURL}/user`, {
        headers: this.getHeaders()
      });

     

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