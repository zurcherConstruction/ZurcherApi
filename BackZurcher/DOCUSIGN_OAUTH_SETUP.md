# INSTRUCCIONES PARA COMPLETAR LA CONFIGURACIÓN DE DOCUSIGN

## ✅ Implementación Completada

Se ha implementado Authorization Code Grant para DocuSign. Esto permite usar DocuSign sin necesidad de resolver el problema de JWT.

## 📋 PASOS PARA ACTIVAR DOCUSIGN

### 1. Actualizar Redirect URI en DocuSign

Ve a la configuración de tu aplicación en DocuSign:
https://developers.docusign.com/platform/account/

Haz clic en tu app "zurcherconstruction" → Edit

En la sección **"Redirect URIs"**, agrega:

```
http://localhost:3001/docusign/callback
```

(Si usas otro puerto o dominio, ajústalo en consecuencia)

Haz clic en **"Save"**

### 2. Iniciar el Servidor

```bash
npm run dev
```

### 3. Autorizar la Aplicación

Abre tu navegador y ve a:

```
http://localhost:3001/docusign/auth
```

Esto te redirigirá a DocuSign para autorizar la aplicación.

Haz clic en **"Allow"** o **"Permitir"**

Serás redirigido de vuelta a tu aplicación con un mensaje de éxito.

### 4. Verificar que Funciona

Ejecuta el test:

```bash
node test-docusign.js
```

Deberías ver: ✅ TOKEN OBTENIDO EXITOSAMENTE

### 5. Enviar tu Primer Presupuesto

Una vez autorizado, puedes enviar presupuestos normalmente desde tu aplicación.
El sistema usará DocuSign automáticamente cuando `USE_DOCUSIGN=true` en el `.env`

## 🔧 Configuración Actual

```env
DOCUSIGN_INTEGRATION_KEY=79d27412-c799-442a-b358-3f4bc9f7feb5
DOCUSIGN_USER_ID=dcf6428f-3381-4604-97ff-c151983bca0c
DOCUSIGN_ACCOUNT_ID=4d74d3bc-2b4b-499b-97f4-5509119d1fd2
DOCUSIGN_ENVIRONMENT=demo
USE_DOCUSIGN=false  # Cambiar a true cuando esté listo
API_URL=http://localhost:3001  # Asegúrate de que esté configurado
```

## 📝 Endpoints Disponibles

- **GET** `/docusign/auth` - Iniciar autorización OAuth
- **GET** `/docusign/callback` - Callback de DocuSign (automático)
- **GET** `/docusign/auth-status` - Verificar estado de autenticación
- **POST** `/docusign/refresh-token` - Refrescar token manualmente

## ⚙️ Cómo Funciona

1. La primera vez, vas a `/docusign/auth`
2. DocuSign te pide permiso para acceder a tu cuenta
3. Después de autorizar, DocuSign te redirige a `/docusign/callback`
4. El sistema guarda los tokens en `docusign_tokens.json`
5. Los tokens se refrescan automáticamente cuando expiran
6. Puedes enviar documentos sin volver a autorizar

## 🔄 Tokens

Los tokens se guardan en: `BackZurcher/docusign_tokens.json`

Este archivo contiene:
- `access_token`: Token de acceso (válido por 1 hora)
- `refresh_token`: Token para obtener nuevos access tokens
- `expires_in`: Tiempo de expiración
- `obtained_at`: Cuándo se obtuvo

El sistema automáticamente refresca el token cuando está por expirar.

## 🚀 Producción

Cuando estés listo para producción:

1. Contacta a DocuSign para habilitar API en tu cuenta de producción
2. Cambia `DOCUSIGN_ENVIRONMENT=production` en `.env`
3. Vuelve a autorizar en `/docusign/auth`
4. Listo

## 📞 Soporte

Si tienes problemas, revisa:
- ¿El servidor está corriendo?
- ¿El Redirect URI está configurado en DocuSign?
- ¿La variable API_URL está correcta en `.env`?
- ¿Hay errores en la consola del servidor?
