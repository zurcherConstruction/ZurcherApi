const AdobeSignSdk = require('adobe-sign-sdk');
const fs = require('fs');
const path = require('path'); // Útil para construir rutas de archivos
const jwt = require('jsonwebtoken'); // Necesitarás esta biblioteca para crear el JWT

// Importa tus variables de entorno. Asegúrate de que estas existan en tu .env
// y que tu archivo config/envs.js las cargue correctamente.
const {
    ADOBE_CLIENT_ID,         // Tu Client ID de la aplicación API de Adobe Sign
    ADOBE_CLIENT_SECRET,     // Tu Client Secret
    ADOBE_TECHNICAL_ACCOUNT_ID, // El email de la cuenta técnica/integración (ej: user@techacct.adobe.com)
    ADOBE_ORG_ID,            // El ID de tu organización en Adobe (ej: orgid@AdobeOrg)
    ADOBE_PRIVATE_KEY,       // La clave privada completa como string (con saltos de línea \n)
    ADOBE_API_BASE_URI,      // Ej: https://api.na1.adobesign.com (depende de tu datacenter)
    ADOBE_OAUTH_SERVER_URI   // Ej: https://ims-na1.adobelogin.com (servidor de autenticación)
} = require('../config/envs');


// --- Configuración del Cliente API de Adobe Sign ---
// Esta configuración puede variar ligeramente según la versión del SDK.
// Consulta la documentación del SDK para la inicialización precisa.
const context = new AdobeSignSdk.Context();
const opts = new AdobeSignSdk.Options();
opts.baseUri = ADOBE_API_BASE_URI; // La URL base para las llamadas a la API de Adobe Sign
// opts.oauthServer = ADOBE_OAUTH_SERVER_URI + '/ims/token/v2'; // Endpoint para obtener el token

const apiClient = new AdobeSignSdk.ApiClient(context, opts);
// Si el SDK no configura la base path completa automáticamente:
// apiClient.setBasePath(ADOBE_API_BASE_URI + AdobeSignSdk.Constants.BASE_PATH_V6);


// Variable para almacenar el token de acceso y su tiempo de expiración
let accessTokenCache = {
    token: null,
    expiresAt: 0, // Timestamp de cuándo expira
};

async function getAccessToken() {
    const now = Math.floor(Date.now() / 1000); // Tiempo actual en segundos

    // Si tenemos un token y aún no ha expirado (con un pequeño margen), lo reutilizamos
    if (accessTokenCache.token && accessTokenCache.expiresAt > now + 60) { // Margen de 60 segundos
        console.log('Using cached Adobe Sign Access Token.');
        apiClient.setAccessToken(accessTokenCache.token); // Asegurar que el cliente API lo tiene
        return accessTokenCache.token;
    }

    console.log('Requesting new Adobe Sign Access Token...');

    // 1. Construir el JWT Payload
    const jwtPayload = {
        exp: now + (60 * 60), // Expiración del JWT (ej. 1 hora), Adobe lo cambiará por la del access token
        iss: ADOBE_ORG_ID,
        sub: ADOBE_TECHNICAL_ACCOUNT_ID,
        aud: `${ADOBE_OAUTH_SERVER_URI}/c/${ADOBE_CLIENT_ID}`,
        [`${ADOBE_OAUTH_SERVER_URI}/s/ent_adobeio_sdk`]: true // Ámbito metascopio para el SDK
    };

    // 2. Firmar el JWT con tu Clave Privada
    // Asegúrate que ADOBE_PRIVATE_KEY es la clave completa, incluyendo BEGIN/END y con \n para saltos de línea.
    let signedJwt;
    try {
        signedJwt = jwt.sign(jwtPayload, ADOBE_PRIVATE_KEY, { algorithm: 'RS256' });
    } catch (jwtError) {
        console.error("Error signing JWT:", jwtError);
        throw new Error("Failed to sign JWT for Adobe Sign authentication.");
    }
    

    // 3. Intercambiar el JWT por un Access Token usando el SDK
    // La forma exacta de hacer esto puede variar con la versión del SDK.
    // Busca en la documentación del SDK "OAuthApi" o "getAccessToken" con JWT.
    try {
        const oAuthApi = new AdobeSignSdk.OAuthApi(apiClient); // O como se llame la clase de OAuth en tu SDK
        
        // El SDK podría tener un método específico para el flujo JWT.
        // Esto es un ejemplo conceptual, la llamada real puede ser diferente.
        const tokenResponse = await oAuthApi.getAccessToken( // Este método puede no existir o tener otros params
            'urn:ietf:params:oauth:grant-type:jwt-bearer', // grant_type
            ADOBE_CLIENT_ID,
            ADOBE_CLIENT_SECRET, // A veces no se necesita el secret si el JWT es suficiente
            signedJwt // El JWT firmado
            // Algunos SDKs pueden requerir los parámetros en un objeto o de forma diferente
        );

        if (!tokenResponse || !tokenResponse.access_token) {
            console.error("Failed to obtain access token from Adobe Sign. Response:", tokenResponse);
            throw new Error("Invalid response when obtaining Adobe Sign access token.");
        }
        
        accessTokenCache.token = tokenResponse.access_token;
        accessTokenCache.expiresAt = now + (tokenResponse.expires_in || 3600); // expires_in suele estar en segundos

        apiClient.setAccessToken(accessTokenCache.token); // Configurar el token en el cliente API para futuras llamadas
        console.log('Adobe Sign Access Token obtained successfully.');
        return accessTokenCache.token;

    } catch (error) {
        // El error del SDK puede tener más detalles en error.response.body o similar
        console.error('Error obtaining Adobe Sign Access Token:', error.response ? JSON.stringify(error.response.body || error.response.text, null, 2) : error.message);
        throw new Error('Failed to obtain Adobe Sign access token.');
    }
}

const adobeSignService = {
    uploadTransientDocument: async (filePath, fileName) => {
        const accessToken = await getAccessToken();
        // apiClient ya debería tener el token configurado por getAccessToken()

        const transientDocumentsApi = new AdobeSignSdk.TransientDocumentsApi(apiClient);
        console.log(`Uploading document: ${filePath} as ${fileName} to Adobe Sign...`);

        try {
            const fileStream = fs.createReadStream(filePath);
            const result = await transientDocumentsApi.createTransientDocument(
                {}, // Headers adicionales si son necesarios (ej. x-api-user)
                fileStream,
                {
                    fileName: fileName,
                    mimeType: 'application/pdf'
                    // xApiUser: `email:${ADOBE_TECHNICAL_ACCOUNT_ID}` // A veces necesario
                }
            );
            console.log(`Document uploaded. Transient ID: ${result.transientDocumentId}`);
            return result.transientDocumentId;
        } catch (error) {
            console.error("Error uploading transient document to Adobe Sign:", error.response ? JSON.stringify(error.response.body || error.response.text, null, 2) : error.message);
            throw new Error("Failed to upload document to Adobe Sign.");
        }
    },

    createAgreement: async (agreementDetails) => {
        const accessToken = await getAccessToken();
        // apiClient ya debería tener el token configurado

        const agreementsApi = new AdobeSignSdk.AgreementsApi(apiClient);
        console.log(`Creating agreement in Adobe Sign for: ${agreementDetails.participantSetsInfo[0].memberInfos[0].email}`);

        try {
            // El SDK puede requerir que los detalles del acuerdo estén dentro de un objeto `agreementInfo`
            // o una estructura específica. Consulta la documentación del método `createAgreement`.
            const agreementCreationInfo = { agreementInfo: agreementDetails };

            const result = await agreementsApi.createAgreement(
                {}, // Headers adicionales (ej. x-api-user)
                agreementCreationInfo
                // { xApiUser: `email:${ADOBE_TECHNICAL_ACCOUNT_ID}` } // A veces necesario
            );
            console.log(`Agreement created. Agreement ID: ${result.id}`);
            return result.id;
        } catch (error) {
            console.error("Error creating agreement in Adobe Sign:", error.response ? JSON.stringify(error.response.body || error.response.text, null, 2) : error.message);
            throw new Error("Failed to create agreement in Adobe Sign.");
        }
    },
};

module.exports = adobeSignService;