/**
 * Email Template Helper - Anti Dark Mode
 * 
 * Proporciona funciones helper para crear emails HTML que resisten
 * la conversión automática de colores por Gmail, Outlook, iOS Mail, etc.
 * 
 * Técnicas implementadas:
 * - Meta tags para desactivar modo oscuro
 * - !important y -webkit-text-fill-color
 * - bgcolor attributes (HTML puro)
 * - Atributos data de Gmail
 * - Envolturas específicas para Gmail
 */

/**
 * Genera el HEAD del email con protecciones anti-dark-mode
 */
const getEmailHead = () => {
  return `
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="color-scheme" content="light only" />
  <meta name="supported-color-schemes" content="light" />
  <meta name="x-apple-disable-message-reformatting" />
  <style>
    /* Forzar modo claro */
    @media (prefers-color-scheme: dark) {
      .force-light-mode { 
        color-scheme: light !important; 
      }
    }
    
    /* Gmail specific - prevenir conversión de colores */
    u + .body .gmail-blend-screen { background:#ffffff !important; }
    u + .body .gmail-blend-difference { background:#ffffff !important; }
    
    /* Forzar colores en modo oscuro */
    [data-ogsc] .white-text { color:#ffffff !important; }
    [data-ogsc] .light-text { color:#f5f5f5 !important; }
    [data-ogsc] .dark-text { color:#1a3a5c !important; }
    [data-ogsc] .gold-text { color:#f6d02c !important; }
  </style>
</head>`;
};

/**
 * Genera el BODY wrapper con clases anti-dark-mode
 */
const getEmailBodyStart = () => {
  return `<body style="margin:0;padding:0;background:#f0f4f8;font-family:'Segoe UI',Arial,sans-serif;" class="body force-light-mode">
  <div class="gmail-blend-screen">
  <div class="gmail-blend-difference">`;
};

const getEmailBodyEnd = () => {
  return `  </div>
  </div>
</body>`;
};

/**
 * Estilos para texto blanco/claro que resiste modo oscuro
 */
const getWhiteTextStyle = () => {
  return 'color:#ffffff !important;-webkit-text-fill-color:#ffffff !important;';
};

const getLightTextStyle = () => {
  return 'color:#f5f5f5 !important;-webkit-text-fill-color:#f5f5f5 !important;';
};

/**
 * Estilos para texto oscuro que resiste modo oscuro
 */
const getDarkTextStyle = () => {
  return 'color:#1a3a5c !important;-webkit-text-fill-color:#1a3a5c !important;';
};

const getGrayTextStyle = () => {
  return 'color:#4a5568 !important;-webkit-text-fill-color:#4a5568 !important;';
};

/**
 * Estilos para texto dorado
 */
const getGoldTextStyle = () => {
  return 'color:#f6d02c !important;-webkit-text-fill-color:#f6d02c !important;';
};

const getLightGoldTextStyle = () => {
  return 'color:#fde047 !important;-webkit-text-fill-color:#fde047 !important;';
};

/**
 * Estilos para fondos azules (gradiente empresa)
 */
const getBlueGradientBgStyle = () => {
  return 'background:linear-gradient(135deg,#1a3a5c 0%,#2563a8 100%) !important;background-color:#1a3a5c !important;';
};

/**
 * Estilos para fondos claros
 */
const getLightBgStyle = () => {
  return 'background:#f8fafc !important;background-color:#f8fafc !important;';
};

/**
 * Estilos para botón dorado
 */
const getGoldButtonStyle = () => {
  return 'display:inline-block;background:#f6d02c !important;background-color:#f6d02c !important;color:#000000 !important;-webkit-text-fill-color:#000000 !important;text-decoration:none;padding:16px 44px;border-radius:30px;font-size:17px;font-weight:700;letter-spacing:0.5px;box-shadow:0 6px 20px rgba(246,208,44,0.50);border:2px solid #000000;';
};

/**
 * Estilos para botón azul
 */
const getBlueButtonStyle = () => {
  return 'display:inline-block;background:linear-gradient(135deg,#1a3a5c 0%,#2563a8 100%) !important;background-color:#1a3a5c !important;color:#ffffff !important;-webkit-text-fill-color:#ffffff !important;text-decoration:none;padding:16px 44px;border-radius:30px;font-size:16px;font-weight:700;letter-spacing:0.5px;box-shadow:0 4px 16px rgba(37,99,168,0.35);';
};

/**
 * Genera sombra para emojis sobre fondo oscuro (azul)
 */
const getEmojiShadowForDarkBg = () => {
  return 'text-shadow:0 0 8px rgba(246,208,44,0.9), 0 2px 4px rgba(246,208,44,1);';
};

/**
 * Genera sombra para emojis sobre fondo claro (dorado)
 */
const getEmojiShadowForLightBg = () => {
  return 'text-shadow:0 0 8px rgba(26,58,92,0.9), 0 2px 4px rgba(26,58,92,1);';
};

/**
 * Wrapper para sección de contenido crítico
 * Usa atributos de Gmail para evitar conversión
 */
const wrapCriticalContent = (content) => {
  return `<div data-ogsc data-ogsb="${content}">${content}</div>`;
};

/**
 * Template completo base
 */
const getEmailTemplate = ({ title, headerText, headerSubtext, bodyContent }) => {
  return `
<!DOCTYPE html>
<html lang="en">
${getEmailHead()}
${getEmailBodyStart()}

  <table width="100%" cellpadding="0" cellspacing="0" bgcolor="#f0f4f8" style="background:#f0f4f8;padding:30px 0;">
    <tr>
      <td align="center">
        <table width="620" cellpadding="0" cellspacing="0" bgcolor="#ffffff" style="background:#ffffff !important;background-color:#ffffff !important;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.10);">

          <!-- HEADER -->
          <tr>
            <td bgcolor="#1a3a5c" style="${getBlueGradientBgStyle()}padding:32px 40px;text-align:center;">
              <h1 style="${getWhiteTextStyle()}margin:0;font-size:28px;font-weight:700;letter-spacing:1px;">
                ${headerText || 'Zurcher Septic'}
              </h1>
              ${headerSubtext ? `
              <p style="${getLightTextStyle()}margin:6px 0 0;font-size:14px;letter-spacing:2px;text-transform:uppercase;">
                ${headerSubtext}
              </p>` : ''}
            </td>
          </tr>

          ${bodyContent}

        </table>
      </td>
    </tr>
  </table>

${getEmailBodyEnd()}
</html>`;
};

module.exports = {
  getEmailHead,
  getEmailBodyStart,
  getEmailBodyEnd,
  getWhiteTextStyle,
  getLightTextStyle,
  getDarkTextStyle,
  getGrayTextStyle,
  getGoldTextStyle,
  getLightGoldTextStyle,
  getBlueGradientBgStyle,
  getLightBgStyle,
  getGoldButtonStyle,
  getBlueButtonStyle,
  getEmojiShadowForDarkBg,
  getEmojiShadowForLightBg,
  wrapCriticalContent,
  getEmailTemplate
};
