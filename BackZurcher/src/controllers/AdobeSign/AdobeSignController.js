const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');
const AdobeOAuthService = require('./AdobeOAuthService'); // Corregido el nombre

class AdobeSignService {
  constructor() {
    this.baseURL = process.env.ADOBE_SIGN_BASE_URL || 'https://api.na1.adobesign.com/api/rest/v6';
    this.oauthService = new AdobeOAuthService();
  }

  // Obtener headers con token válido
  async getAuthHeaders() {
    const accessToken = await this.oauthService.getValidAccessToken();
    return {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    };
  }

  // Subir documento transitorio
  async uploadTransientDocument(filePath, fileName) {
    try {
      const accessToken = await this.oauthService.getValidAccessToken();
      const formData = new FormData();
      formData.append('File-Name', fileName);
      formData.append('File', fs.createReadStream(filePath));

      const response = await axios.post(`${this.baseURL}/transientDocuments`, formData, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          ...formData.getHeaders()
        }
      });

      return response.data.transientDocumentId;
    } catch (error) {
      console.error('Error uploading transient document:', error.response?.data || error.message);
      throw error;
    }
  }

  // Crear acuerdo con campos de firma en páginas específicas
  async createAgreement(documentId, signerEmail, signerName, agreementName, signatureFields = []) {
    try {
      const headers = await this.getAuthHeaders();
      
      const agreementInfo = {
        documentCreationInfo: {
          fileInfos: [{
            transientDocumentId: documentId
          }],
          name: agreementName,
          recipientSetInfos: [{
            recipientSetMemberInfos: [{
              email: signerEmail,
              recipientRole: 'SIGNER'
            }],
            recipientSetRole: 'SIGNER'
          }],
          signatureType: 'ESIGN',
          state: 'IN_PROCESS',
          formFieldLayerTemplates: [{
            formFields: this.createSignatureFields(signatureFields)
          }]
        }
      };

      const response = await axios.post(`${this.baseURL}/agreements`, agreementInfo, {
        headers
      });

      return response.data;
    } catch (error) {
      console.error('Error creating agreement:', error.response?.data || error.message);
      throw error;
    }
  }

  // Crear campos de firma para las primeras 2 páginas
  createSignatureFields(customFields = []) {
    const defaultFields = [
      {
        inputType: 'SIGNATURE',
        name: 'ClientSignature_Page1',
        required: true,
        locations: [{
          left: 100,
          top: 650,
          width: 200,
          height: 50,
          pageNumber: 1
        }]
      },
      {
        inputType: 'DATE',
        name: 'SignatureDate_Page1',
        required: true,
        locations: [{
          left: 320,
          top: 650,
          width: 100,
          height: 25,
          pageNumber: 1
        }]
      },
      {
        inputType: 'SIGNATURE',
        name: 'ClientSignature_Page2',
        required: true,
        locations: [{
          left: 100,
          top: 650,
          width: 200,
          height: 50,
          pageNumber: 2
        }]
      },
      {
        inputType: 'DATE',
        name: 'SignatureDate_Page2',
        required: true,
        locations: [{
          left: 320,
          top: 650,
          width: 100,
          height: 25,
          pageNumber: 2
        }]
      }
    ];

    return [...defaultFields, ...customFields];
  }

  // Obtener estado del acuerdo
  async getAgreementStatus(agreementId) {
    try {
      const headers = await this.getAuthHeaders();
      const response = await axios.get(`${this.baseURL}/agreements/${agreementId}`, {
        headers
      });

      return response.data;
    } catch (error) {
      console.error('Error getting agreement status:', error.response?.data || error.message);
      throw error;
    }
  }

  // Verificar si el servicio está autorizado
  async isAuthorized() {
    return await this.oauthService.hasValidTokens();
  }
}

module.exports = AdobeSignService;