const fs = require('fs');
const path = require('path');
const {
  NEW_PAGE_MARGIN,
  FONT_FAMILY_REGULAR,
  FONT_FAMILY_BOLD,
  FONT_FAMILY_MONO,
  FONT_FAMILY_MONO_BOLD,
  COLOR_TEXT_DARK,
  COLOR_TEXT_MEDIUM,
  COLOR_TEXT_LIGHT,
  COLOR_BORDER_LIGHT
} = require('./constants');

// Standard Page Footer
function addStandardPageFooter(doc) {
  const footerYPosition = doc.page.height - NEW_PAGE_MARGIN + 15;
  const contentWidth = doc.page.width - NEW_PAGE_MARGIN * 2;
  doc.fontSize(7).fillColor(COLOR_TEXT_LIGHT)
    .text('Thank you for your business! | Zurcher Construction', NEW_PAGE_MARGIN, footerYPosition, {
      align: 'center',
      width: contentWidth
    });
}

// Client Signature Section
function addClientSignatureSection(doc) {
  const currentY = doc.y;
  const pageBottom = doc.page.height - NEW_PAGE_MARGIN;

  // Check if we need a new page
  if (currentY + 100 > pageBottom) {
    doc.addPage();
  }

  doc.fontSize(10).font(FONT_FAMILY_BOLD).text('Client Acceptance:', NEW_PAGE_MARGIN, doc.y);
  doc.moveDown(1);

  const signatureLineY = doc.y + 20;
  const signatureLineLength = 200;

  // Client signature line
  doc.text('Client Signature:', NEW_PAGE_MARGIN, signatureLineY);
  doc.moveTo(NEW_PAGE_MARGIN + 100, signatureLineY + 10)
    .lineTo(NEW_PAGE_MARGIN + 100 + signatureLineLength, signatureLineY + 10)
    .strokeColor('#000000').stroke();

  // Date line
  doc.text('Date:', NEW_PAGE_MARGIN + 320, signatureLineY);
  doc.moveTo(NEW_PAGE_MARGIN + 350, signatureLineY + 10)
    .lineTo(NEW_PAGE_MARGIN + 450, signatureLineY + 10)
    .strokeColor('#000000').stroke();

  doc.y = signatureLineY + 40;
}

module.exports = {
  addStandardPageFooter,
  addClientSignatureSection
};