const { MarketingCampaign } = require('./src/data');

async function fixStuckCampaign() {
  try {
    console.log('🔄 Buscando campañas en estado "sending" que no se completaron...');

    // Actualizar todas las campañas que quedaron en "sending" por más de 10 minutos
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);

    const [updated] = await MarketingCampaign.update(
      {
        status: 'failed',
        completedAt: new Date()
      },
      {
        where: {
          status: 'sending',
          startedAt: {
            [require('sequelize').Op.lt]: tenMinutesAgo
          }
        }
      }
    );

    console.log(`✅ ${updated} campaña(s) marcada(s) como fallidas`);
    
    // Mostrar las campañas actualizadas
    if (updated > 0) {
      const campaigns = await MarketingCampaign.findAll({
        where: { status: 'failed' },
        order: [['createdAt', 'DESC']],
        limit: 5,
        attributes: ['id', 'campaignName', 'recipientCount', 'status', 'startedAt', 'completedAt']
      });
      
      console.log('\n📋 Últimas campañas fallidas:');
      campaigns.forEach(c => {
        console.log(`  - ${c.campaignName} (${c.recipientCount} destinatarios) - ${c.status}`);
      });
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

fixStuckCampaign();
