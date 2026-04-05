const { Budget, Work, Permit, SalesLead, Staff, MarketingCampaign } = require('../data');
const { Op } = require('sequelize');
const { sendEmail } = require('../utils/notifications/emailService');

class CompanyEmailController {
  /**
   * 📧 GET /api/company-emails/unique-recipients
   * Obtiene lista de emails únicos de todas las fuentes (Budgets, Works, SalesLeads, Permits)
   */
  async getUniqueRecipients(req, res) {
    try {
      console.log('📧 Obteniendo emails únicos de todas las fuentes...');

      // Objeto para almacenar emails únicos con sus fuentes
      const emailMap = new Map();

      // 1️⃣ BUDGETS
      const budgets = await Budget.findAll({
        attributes: ['idBudget', 'applicantName', 'applicantEmail', 'propertyAddress'],
        where: {
          applicantEmail: { [Op.ne]: null },
        },
        raw: true
      });

      budgets.forEach(b => {
        const email = b.applicantEmail?.trim().toLowerCase();
        if (email && email.includes('@')) {
          if (!emailMap.has(email)) {
            emailMap.set(email, {
              email: email,
              name: b.applicantName,
              sources: [],
              address: b.propertyAddress
            });
          }
          emailMap.get(email).sources.push('budget');
        }
      });

      // 2️⃣ WORKS (via Budget)
      const works = await Work.findAll({
        include: [{
          model: Budget,
          as: 'budget',
          attributes: ['applicantEmail', 'applicantName', 'propertyAddress'],
          required: true,
          where: {
            applicantEmail: { [Op.ne]: null }
          }
        }],
        raw: true
      });

      works.forEach(w => {
        const email = w['budget.applicantEmail']?.trim().toLowerCase();
        if (email && email.includes('@')) {
          if (!emailMap.has(email)) {
            emailMap.set(email, {
              email: email,
              name: w['budget.applicantName'],
              sources: [],
              address: w['budget.propertyAddress']
            });
          }
          if (!emailMap.get(email).sources.includes('work')) {
            emailMap.get(email).sources.push('work');
          }
        }
      });

      // 3️⃣ SALES LEADS
      const salesLeads = await SalesLead.findAll({
        attributes: ['id', 'applicantName', 'applicantEmail', 'propertyAddress'],
        where: {
          applicantEmail: { [Op.ne]: null },
          status: { [Op.notIn]: ['lost', 'archived'] } // Excluir leads perdidos/archivados
        },
        raw: true
      });

      salesLeads.forEach(s => {
        const email = s.applicantEmail?.trim().toLowerCase();
        if (email && email.includes('@')) {
          if (!emailMap.has(email)) {
            emailMap.set(email, {
              email: email,
              name: s.applicantName,
              sources: [],
              address: s.propertyAddress
            });
          }
          if (!emailMap.get(email).sources.includes('sales_lead')) {
            emailMap.get(email).sources.push('sales_lead');
          }
        }
      });

      // 4️⃣ PERMITS (Legacy)
      const permits = await Permit.findAll({
        attributes: ['idPermit', 'applicantName', 'applicantEmail', 'propertyAddress'],
        where: {
          applicantEmail: { [Op.ne]: null }
        },
        raw: true
      });

      permits.forEach(p => {
        const email = p.applicantEmail?.trim().toLowerCase();
        if (email && email.includes('@')) {
          if (!emailMap.has(email)) {
            emailMap.set(email, {
              email: email,
              name: p.applicantName,
              sources: [],
              address: p.propertyAddress
            });
          }
          if (!emailMap.get(email).sources.includes('permit')) {
            emailMap.get(email).sources.push('permit');
          }
        }
      });

      // Convertir Map a Array
      const uniqueRecipients = Array.from(emailMap.values());

      console.log(`✅ ${uniqueRecipients.length} emails únicos encontrados`);

      res.json({
        success: true,
        count: uniqueRecipients.length,
        recipients: uniqueRecipients
      });

    } catch (error) {
      console.error('❌ Error al obtener emails únicos:', error);
      res.status(500).json({
        success: false,
        error: 'Error al obtener lista de destinatarios',
        message: error.message
      });
    }
  }

  /**
   * 📤 POST /api/company-emails/send-campaign
   * Envía email masivo a lista de destinatarios
   */
  async sendCampaign(req, res) {
    try {
      const {
        subject,
        message,
        emailTitle,
        titleColor,
        titleFont,
        imageUrl,
        recipients, // Array de emails
        campaignType,
        campaignName,
        excludedEmails // Optional: emails a excluir
      } = req.body;

      const userId = req.user?.id;

      // Validaciones
      if (!subject || !message) {
        return res.status(400).json({
          success: false,
          error: 'Asunto y mensaje son requeridos'
        });
      }

      if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Debe incluir al menos un destinatario'
        });
      }

      console.log(`📧 Iniciando campaña de email: ${campaignName || subject}`);
      console.log(`👥 ${recipients.length} destinatarios totales`);

      // Filtrar emails excluidos
      const finalRecipients = excludedEmails && excludedEmails.length > 0
        ? recipients.filter(r => !excludedEmails.includes(r.email))
        : recipients;

      console.log(`✅ ${finalRecipients.length} destinatarios después de filtrar`);

      // Crear registro de campaña
      const campaign = await MarketingCampaign.create({
        subject,
        message,
        imageUrl,
        recipientCount: finalRecipients.length,
        uniqueEmails: finalRecipients.map(r => r.email),
        campaignType: campaignType || 'holiday',
        campaignName: campaignName || subject,
        sentByStaffId: userId,
        status: 'sending',
        startedAt: new Date()
      });

      // Enviar emails en segundo plano
      this._sendCampaignEmails(
        campaign.id, 
        finalRecipients, 
        subject, 
        message, 
        imageUrl,
        emailTitle || 'Special Message',
        titleColor || '#1a3a5c',
        titleFont || 'Playfair Display'
      );

      res.json({
        success: true,
        campaignId: campaign.id,
        message: `Campaña iniciada. Enviando a ${finalRecipients.length} destinatarios...`
      });

    } catch (error) {
      console.error('❌ Error al iniciar campaña:', error);
      res.status(500).json({
        success: false,
        error: 'Error al iniciar campaña de email',
        message: error.message
      });
    }
  }

  /**
   * 🔄 Función privada para enviar emails en lotes
   * Se ejecuta en segundo plano después de responder al cliente
   */
  async _sendCampaignEmails(campaignId, recipients, subject, message, imageUrl, emailTitle, titleColor, titleFont) {
    try {
      let sentCount = 0;
      let failedCount = 0;
      const failedEmails = [];

      const BATCH_SIZE = 5; // Enviar 5 emails a la vez para evitar bloqueo SMTP
      const DELAY_MS = 1000; // 1 segundo entre lotes

      // Construir HTML del email
      const htmlContent = this._buildEmailHTML(message, imageUrl, emailTitle, titleColor, titleFont);

      for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
        const batch = recipients.slice(i, i + BATCH_SIZE);
        
        // Enviar lote en paralelo
        const promises = batch.map(async (recipient) => {
          try {
            await sendEmail({
              to: recipient.email,
              subject: subject,
              html: htmlContent.replace('{{NAME}}', recipient.name || 'Valued Customer')
            });
            sentCount++;
            console.log(`✅ Email enviado a: ${recipient.email}`);
            return { success: true, email: recipient.email };
          } catch (error) {
            failedCount++;
            failedEmails.push({
              email: recipient.email,
              error: error.message
            });
            console.error(`❌ Falló envío a ${recipient.email}:`, error.message);
            return { success: false, email: recipient.email, error: error.message };
          }
        });

        await Promise.allSettled(promises);

        // Delay entre lotes
        if (i + BATCH_SIZE < recipients.length) {
          await new Promise(resolve => setTimeout(resolve, DELAY_MS));
        }
      }

      // Actualizar campaña con resultados
      await MarketingCampaign.update({
        sentCount,
        failedCount,
        failedEmails: failedEmails.length > 0 ? failedEmails : null,
        status: failedCount === recipients.length ? 'failed' : 'completed',
        completedAt: new Date()
      }, {
        where: { id: campaignId }
      });

      console.log(`📊 Campaña completada: ${sentCount} enviados, ${failedCount} fallidos`);

    } catch (error) {
      console.error('❌ Error crítico en envío de campaña:', error);
      
      // Marcar campaña como fallida
      await MarketingCampaign.update({
        status: 'failed',
        completedAt: new Date()
      }, {
        where: { id: campaignId }
      });
    }
  }

  /**
   * 🎨 Construir HTML del email con imagen y mensaje
   */
  _buildEmailHTML(message, imageUrl, emailTitle = 'Special Message', titleColor = '#1a3a5c', titleFont = 'Playfair Display') {
    // Construir URL de Google Fonts dinámicamente para la fuente seleccionada
    const fontUrl = `https://fonts.googleapis.com/css2?family=${titleFont.replace(/ /g, '+')}:wght@700&family=Open+Sans:wght@400;600&display=swap`;
    
    return `
      <!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
      <html xmlns="http://www.w3.org/1999/xhtml">
      <head>
        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="${fontUrl}" rel="stylesheet">
      </head>
      <body style="margin: 0; padding: 0; font-family: 'Open Sans', Arial, sans-serif; background-color: #f4f4f4;">
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f4f4f4;">
          <tr>
            <td align="center" style="padding: 20px 0;">
              <!-- Container principal -->
              <table border="0" cellpadding="0" cellspacing="0" width="600" style="background-color: #ffffff; max-width: 600px;">
                
                <!-- Header -->
                <tr>
                  <td align="center" style="background-color: #1a3a5c; padding: 30px 20px;">
                    <a href="https://www.zurcherseptic.com" style="color: #ffffff; font-size: 28px; font-weight: bold; text-decoration: none; font-family: 'Playfair Display', Georgia, serif;">
                      Zurcher Septic
                    </a>
                  </td>
                </tr>
                
                <!-- Content -->
                <tr>
                  <td style="padding: 40px 30px;">
                    <table border="0" cellpadding="0" cellspacing="0" width="100%">
                      
                      <!-- Email Title -->
                      <tr>
                        <td align="center" style="padding-bottom: 30px;">
                          <h1 style="margin: 0; font-family: '${titleFont}', Georgia, serif; font-size: 32px; font-weight: 700; color: ${titleColor}; line-height: 1.2;">
                            ${emailTitle}
                          </h1>
                        </td>
                      </tr>
                      
                      <!-- Divider -->
                      <tr>
                        <td style="padding-bottom: 30px;">
                          <table border="0" cellpadding="0" cellspacing="0" width="100%">
                            <tr>
                              <td style="border-bottom: 1px solid #e0e0e0;"></td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      
                      <!-- Message -->
                      <tr>
                        <td style="font-family: 'Open Sans', Arial, sans-serif; font-size: 16px; line-height: 1.8; color: #333333; padding-bottom: 30px; white-space: pre-wrap;">
                          ${message}
                        </td>
                      </tr>
                      
                      ${imageUrl ? `
                      <!-- Image -->
                      <tr>
                        <td align="center" style="padding: 30px 0;">
                          <img src="${imageUrl}" alt="Campaign Image" style="max-width: 100%; height: auto; border-radius: 12px; display: block;" />
                        </td>
                      </tr>
                      ` : ''}
                      
                      <!-- CTA Button -->
                      <tr>
                        <td align="center" style="padding: 30px 0;">
                          <table border="0" cellpadding="0" cellspacing="0">
                            <tr>
                              <td align="center" style="background-color: #1a3a5c; border-radius: 8px;">
                                <a href="https://www.zurcherseptic.com" target="_blank" style="font-family: 'Open Sans', Arial, sans-serif; font-size: 16px; font-weight: 600; color: #ffffff; text-decoration: none; padding: 14px 36px; display: inline-block;">
                                  Visit Our Website
                                </a>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      
                    </table>
                  </td>
                </tr>
                
                <!-- Footer -->
                <tr>
                  <td style="background-color: #f9f9f9; padding: 30px 20px; border-top: 1px solid #e0e0e0;">
                    <table border="0" cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td align="center">
                          <p style="margin: 0 0 10px 0; font-family: 'Open Sans', Arial, sans-serif; font-size: 16px; font-weight: bold; color: #333333;">
                            Zurcher Septic
                          </p>
                          <p style="margin: 5px 0; font-family: 'Open Sans', Arial, sans-serif; font-size: 14px; color: #666666;">
                            Septic System Installation & Maintenance
                          </p>
                          <p style="margin: 5px 0; font-family: 'Open Sans', Arial, sans-serif; font-size: 14px; color: #666666;">
                            📧 admin@zurcherseptic.com | 📞 Contact Us
                          </p>
                          <table border="0" cellpadding="0" cellspacing="0" width="200" style="margin: 20px auto;">
                            <tr>
                              <td style="border-bottom: 1px solid #e0e0e0;"></td>
                            </tr>
                          </table>
                          <p style="margin: 10px 0 0 0; font-family: 'Open Sans', Arial, sans-serif; font-size: 12px; color: #999999;">
                            You're receiving this email because you're a valued customer of Zurcher Septic.
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;
  }

  /**
   * 📋 GET /api/company-emails/campaigns
   * Obtiene historial de campañas enviadas
   */
  async getCampaigns(req, res) {
    try {
      const { page = 1, pageSize = 20, status, campaignType } = req.query;
      const offset = (page - 1) * pageSize;

      const where = {};
      if (status) where.status = status;
      if (campaignType) where.campaignType = campaignType;

      const { rows, count } = await MarketingCampaign.findAndCountAll({
        where,
        include: [{
          model: Staff,
          as: 'sentBy',
          attributes: ['id', 'name', 'email']
        }],
        order: [['createdAt', 'DESC']],
        limit: parseInt(pageSize),
        offset
      });

      res.json({
        success: true,
        campaigns: rows,
        total: count,
        page: parseInt(page),
        pageSize: parseInt(pageSize),
        totalPages: Math.ceil(count / pageSize)
      });

    } catch (error) {
      console.error('❌ Error al obtener campañas:', error);
      res.status(500).json({
        success: false,
        error: 'Error al obtener historial de campañas',
        message: error.message
      });
    }
  }

  /**
   * 📊 GET /api/company-emails/campaigns/:id
   * Obtiene detalles de una campaña específica
   */
  async getCampaignDetails(req, res) {
    try {
      const { id } = req.params;

      const campaign = await MarketingCampaign.findByPk(id, {
        include: [{
          model: Staff,
          as: 'sentBy',
          attributes: ['id', 'name', 'email']
        }]
      });

      if (!campaign) {
        return res.status(404).json({
          success: false,
          error: 'Campaña no encontrada'
        });
      }

      res.json({
        success: true,
        campaign
      });

    } catch (error) {
      console.error('❌ Error al obtener detalles de campaña:', error);
      res.status(500).json({
        success: false,
        error: 'Error al obtener detalles de campaña',
        message: error.message
      });
    }
  }
}

module.exports = new CompanyEmailController();
