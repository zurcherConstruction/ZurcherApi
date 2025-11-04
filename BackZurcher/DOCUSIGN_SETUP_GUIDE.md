# Guía de Configuración DocuSign JWT

## Problema Actual
DocuSign requiere "Admin Consent" para JWT, pero la aplicación muestra error "issuer_not_found" al intentar obtener token.

## Estado Actual
✅ Aplicación creada: zurcherconstruction
✅ Integration Key: 79d27412-c799-442a-b358-3f4bc9f7feb5
✅ RSA Keypair generado: ffc0b1d5-819f-4207-83b1-a6e90d1064f6
✅ Private Key descargada y guardada
✅ Redirect URI configurado: https://www.docusign.com
✅ User ID: dcf6428f-3381-4604-97ff-c151983bca0c
✅ Account ID: 4d74d3bc-2b4b-499b-97f4-5509119d1fd2
⚠️ App Status: Development Environment - Ready to Submit
❌ Admin Consent: NO OTORGADO

## Soluciones Intentadas
1. ❌ URL de consentimiento OAuth estándar → Error "client id not registered"
2. ❌ URL con admin_consent=true → Mismo error
3. ❌ Promote to Production → Cuenta no soporta API

## Próximos Pasos

### Opción A: Otorgar Individual Consent (Método Directo)
Según la documentación de DocuSign, para aplicaciones en desarrollo puedes otorgar el consentimiento directamente desde el Admin Console.

**Pasos:**
1. Ve a: https://admindemo.docusign.com (Admin Console Demo)
2. Inicia sesión con tu cuenta
3. Ve a "Integrations" → "Apps and Keys"
4. Encuentra tu app "zurcherconstruction"
5. Busca un botón "Grant Consent" o "Individual Consent"
6. Haz clic y autoriza

### Opción B: Usar Authorization Code Grant Temporalmente
Cambiar temporalmente a Authorization Code Grant (requiere login de usuario) hasta resolver el JWT.

**Pasos:**
1. Modificar ServiceDocuSign.js para usar Authorization Code Grant
2. Implementar flujo OAuth con redirect
3. Almacenar tokens de acceso y refresh

### Opción C: Contactar Soporte DocuSign
Contactar al soporte técnico de DocuSign para:
- Verificar por qué la app no acepta JWT consent
- Solicitar habilitación de API en cuenta de producción
- Obtener asistencia para completar el proceso Go-Live

## Recursos
- [DocuSign JWT Auth](https://developers.docusign.com/platform/auth/jwt/)
- [Grant Consent](https://developers.docusign.com/platform/auth/consent/)
- [Admin Console](https://admindemo.docusign.com)
