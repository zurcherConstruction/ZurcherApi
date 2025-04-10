const convertPdfDataToUrl = (receipts) => {
    return receipts.map((receipt) => {
      // Convertir a objeto plano si es necesario
      const plainReceipt = receipt.get ? receipt.get({ plain: true }) : receipt;
  
      // Verificar si pdfData y pdfData.data existen
      if (plainReceipt.pdfData && Buffer.isBuffer(plainReceipt.pdfData)) {
        try {
          return {
            ...plainReceipt,
            pdfUrl: `data:application/pdf;base64,${plainReceipt.pdfData.toString('base64')}`,
          };
        } catch (error) {
          console.error("Error al convertir pdfData a base64:", error);
          return { ...plainReceipt, pdfUrl: null };
        }
      } else {
        return { ...plainReceipt, pdfUrl: null };
      }
    });
  };
  
  module.exports = convertPdfDataToUrl;