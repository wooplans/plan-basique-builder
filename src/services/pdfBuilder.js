import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

const COLORS = {
  cream: rgb(0.96, 0.94, 0.91),
  gold: rgb(0.83, 0.69, 0.22),
  brown: rgb(0.55, 0.27, 0.07),
  darkBlue: rgb(0.17, 0.24, 0.31),
  white: rgb(1, 1, 1),
  black: rgb(0, 0, 0),
};

export async function generatePdf(data) {
  const { files, planData, devisData, clientData, pdfOptions } = data;
  const doc = await PDFDocument.create();

  const boldFont = await doc.embedFont(StandardFonts.HelveticaBold);
  const regularFont = await doc.embedFont(StandardFonts.Helvetica);

  const pageWidth = pdfOptions.format === 'landscape' ? 841.89 : 595.28;
  const pageHeight = pdfOptions.format === 'landscape' ? 595.28 : 841.89;

  const封面 = doc.addPage([pageWidth, pageHeight]);
  await drawCoverPage(doc,封面, planData, clientData, files.logo, pdfOptions, boldFont, regularFont);

  const descPage = doc.addPage([pageWidth, pageHeight]);
  await drawDescriptionPage(doc, descPage, planData, files.renders[0], boldFont, regularFont);

  if (files.plan2d) {
    const planPage = doc.addPage([pageWidth, pageHeight]);
    await drawPlanPage(doc, planPage, files.plan2d, pdfOptions);
  }

  for (let i = 1; i < files.renders.length; i++) {
    const renderPage = doc.addPage([pageWidth, pageHeight]);
    await drawRenderPage(doc, renderPage, files.renders[i], pdfOptions);
  }

  if (devisData.lignes.length > 0) {
    const devisPage = doc.addPage([pageWidth, pageHeight]);
    await drawDevisPage(doc, devisPage, devisData, boldFont, regularFont);
  }

  const pdfBytes = await doc.save();
  return pdfBytes;
}

async function drawCoverPage(doc, page, planData, clientData, logoFile, pdfOptions, boldFont, regularFont) {
  const { width, height } = page.getSize();
  page.drawRectangle({
    x: 0,
    y: 0,
    width: width,
    height: height,
    color: COLORS.cream,
  });

  if (logoFile && pdfOptions.includeLogo) {
    try {
      const logoImage = await doc.embedPng(await logoFile.arrayBuffer());
      const logoDims = logoImage.scale(0.3);
      const logoX = (width - logoDims.width) / 2;
      page.drawImage(logoImage, {
        x: logoX,
        y: height - 80 - logoDims.height,
        width: logoDims.width,
        height: logoDims.height,
      });
    } catch (e) {
      console.error('Logo embedding failed:', e);
    }
  }

  page.drawText('wooplans', {
    x: width / 2 - 50,
    y: height - 120,
    size: 18,
    font: boldFont,
    color: COLORS.brown,
  });

  const title = 'PLAN BASIQUE + DEVIS';
  const titleWidth = boldFont.widthOfTextAtSize(title, 28);
  page.drawText(title, {
    x: (width - titleWidth) / 2,
    y: height - 200,
    size: 28,
    font: boldFont,
    color: COLORS.darkBlue,
  });

  page.drawRectangle({
    x: 100,
    y: height - 220,
    width: width - 200,
    height: 2,
    color: COLORS.gold,
  });

  const subtitle = `${planData.type}: ${planData.codePlan}`;
  const subtitleWidth = boldFont.widthOfTextAtSize(subtitle, 18);
  page.drawText(subtitle, {
    x: (width - subtitleWidth) / 2,
    y: height - 260,
    size: 18,
    font: boldFont,
    color: COLORS.brown,
  });

  page.drawRectangle({
    x: 100,
    y: height - 275,
    width: width - 200,
    height: 2,
    color: COLORS.gold,
  });

  if (planData.imageData) {
    try {
      const img = await doc.embedJpg(planData.imageData);
      const maxWidth = width - 100;
      const maxHeight = 250;
      const scale = Math.min(maxWidth / img.width, maxHeight / img.height);
      const imgWidth = img.width * scale;
      const imgHeight = img.height * scale;
      const imgX = (width - imgWidth) / 2;
      page.drawImage(img, {
        x: imgX,
        y: height - 340 - imgHeight,
        width: imgWidth,
        height: imgHeight,
      });
    } catch (e) {
      console.error('Main image embedding failed:', e);
    }
  }

  page.drawRectangle({
    x: 100,
    y: 180,
    width: width - 200,
    height: 1,
    color: COLORS.gold,
  });

  const specs = `Surface: ${planData.surface || '—'} m²  |  Type: ${planData.type}  |  ${planData.chambres || 0} Chambres  |  ${planData.pieces || 0} Pièces`;
  const specsWidth = regularFont.widthOfTextAtSize(specs, 12);
  page.drawText(specs, {
    x: (width - specsWidth) / 2,
    y: 160,
    size: 12,
    font: regularFont,
    color: COLORS.darkBlue,
  });

  page.drawRectangle({
    x: 100,
    y: 145,
    width: width - 200,
    height: 1,
    color: COLORS.gold,
  });

  if (clientData.nom) {
    page.drawText(`Client: ${clientData.nom}`, {
      x: width / 2 - 100,
      y: 120,
      size: 14,
      font: boldFont,
      color: COLORS.darkBlue,
    });
  }
  if (clientData.email) {
    page.drawText(`Email: ${clientData.email}`, {
      x: width / 2 - 80,
      y: 100,
      size: 12,
      font: regularFont,
      color: COLORS.darkBlue,
    });
  }
  if (clientData.telephone) {
    page.drawText(`Tél: ${clientData.telephone}`, {
      x: width / 2 - 60,
      y: 80,
      size: 12,
      font: regularFont,
      color: COLORS.darkBlue,
    });
  }

  const date = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
  const dateWidth = regularFont.widthOfTextAtSize(date, 12);
  page.drawText(date, {
    x: (width - dateWidth) / 2,
    y: 50,
    size: 12,
    font: regularFont,
    color: COLORS.brown,
  });

  addFooter(page, planData, clientData, boldFont, regularFont);
}

async function drawDescriptionPage(doc, page, planData, renderFile, boldFont, regularFont) {
  const { width, height } = page.getSize();
  page.drawRectangle({ x: 0, y: 0, width, height, height: height, color: COLORS.cream });

  const title = 'DESCRIPTION DU PROJET';
  const titleWidth = boldFont.widthOfTextAtSize(title, 20);
  page.drawRectangle({
    x: width / 2 - titleWidth / 2 - 20,
    y: height - 80,
    width: titleWidth + 40,
    height: 30,
    color: COLORS.brown,
  });
  page.drawText(title, {
    x: width / 2 - titleWidth / 2,
    y: height - 68,
    size: 18,
    font: boldFont,
    color: COLORS.white,
  });

  if (renderFile) {
    try {
      const imgData = await renderFile.arrayBuffer();
      const img = await doc.embedJpg(imgData);
      const scale = Math.min(250 / img.width, 200 / img.height);
      const imgWidth = img.width * scale;
      const imgHeight = img.height * scale;
      page.drawImage(img, {
        x: 50,
        y: height - 150 - imgHeight,
        width: imgWidth,
        height: imgHeight,
      });
    } catch (e) {
      console.error('Render image failed:', e);
    }
  }

  if (planData.description) {
    const descLines = wrapText(planData.description, regularFont, 14, width - 320);
    descLines.forEach((line, i) => {
      page.drawText(line, {
        x: 320,
        y: height - 140 - i * 20,
        size: 14,
        font: regularFont,
        color: COLORS.darkBlue,
      });
    });
  }

  const compTitle = 'COMPOSITION';
  page.drawRectangle({
    x: 50,
    y: height - 320,
    width: 200,
    height: 25,
    color: COLORS.brown,
  });
  page.drawText(compTitle, {
    x: 60,
    y: height - 305,
    size: 14,
    font: boldFont,
    color: COLORS.white,
  });

  const tableTop = height - 360;
  const tableWidth = width - 100;
  const colWidths = [200, 100, tableWidth - 300];
  const rowHeight = 25;

  page.drawRectangle({ x: 50, y: tableTop, width: tableWidth, height: rowHeight, color: COLORS.gold });
  page.drawText('Pièce', { x: 60, y: tableTop + 8, size: 12, font: boldFont, color: COLORS.darkBlue });
  page.drawText('Surface', { x: 260, y: tableTop + 8, size: 12, font: boldFont, color: COLORS.darkBlue });
  page.drawText('Proportion', { x: 370, y: tableTop + 8, size: 12, font: boldFont, color: COLORS.darkBlue });

  const totalSurface = planData.composition?.reduce((sum, p) => sum + (parseFloat(p.surface) || 0), 0) || 1;

  planData.composition?.forEach((item, i) => {
    const y = tableTop - (i + 1) * rowHeight;
    const bgColor = i % 2 === 0 ? COLORS.white : rgb(0.96, 0.94, 0.91);
    page.drawRectangle({ x: 50, y: y, width: tableWidth, height: rowHeight, color: bgColor });

    page.drawText(item.nom || '', { x: 60, y: y + 8, size: 11, font: regularFont, color: COLORS.darkBlue });
    page.drawText(`${item.surface || 0} m²`, { x: 260, y: y + 8, size: 11, font: regularFont, color: COLORS.darkBlue });

    const proportion = (parseFloat(item.surface) || 0) / totalSurface;
    const barWidth = 150 * proportion;
    page.drawRectangle({ x: 370, y: y + 8, width: barWidth, height: 10, color: COLORS.gold });
  });

  addFooter(page, planData, {}, boldFont, regularFont);
}

async function drawPlanPage(doc, page, planFile, pdfOptions) {
  const { width, height } = page.getSize();
  page.drawRectangle({ x: 0, y: 0, width, height, height: height, color: COLORS.cream });

  const title = 'PLAN DE DISTRIBUTION';
  const titleWidth = pdfOptions.boldFont?.widthOfTextAtSize(title, 20) || 200;
  page.drawRectangle({
    x: width / 2 - titleWidth / 2 - 20,
    y: height - 80,
    width: titleWidth + 40,
    height: 30,
    color: COLORS.brown,
  });
  page.drawText(title, {
    x: width / 2 - titleWidth / 2,
    y: height - 68,
    size: 18,
    font: pdfOptions.boldFont || pdfOptions.regularFont,
    color: COLORS.white,
  });

  if (planFile) {
    try {
      const imgData = await planFile.arrayBuffer();
      const img = await doc.embedJpg(imgData);
      const maxWidth = width - 100;
      const maxHeight = height - 200;
      const scale = Math.min(maxWidth / img.width, maxHeight / img.height);
      const imgWidth = img.width * scale;
      const imgHeight = img.height * scale;
      const imgX = (width - imgWidth) / 2;
      page.drawImage(img, {
        x: imgX,
        y: height - 120 - imgHeight,
        width: imgWidth,
        height: imgHeight,
      });
    } catch (e) {
      console.error('Plan image failed:', e);
    }
  }

  page.drawText('Échelle indicative', {
    x: width / 2 - 50,
    y: 60,
    size: 10,
    font: pdfOptions.regularFont,
    color: COLORS.brown,
  });
}

async function drawRenderPage(doc, page, renderFile, pdfOptions) {
  const { width, height } = page.getSize();
  page.drawRectangle({ x: 0, y: 0, width, height, height: height, color: COLORS.cream });

  if (renderFile) {
    try {
      const imgData = await renderFile.arrayBuffer();
      const img = await doc.embedJpg(imgData);
      const maxWidth = width - 100;
      const maxHeight = height - 150;
      const scale = Math.min(maxWidth / img.width, maxHeight / img.height);
      const imgWidth = img.width * scale;
      const imgHeight = img.height * scale;
      const imgX = (width - imgWidth) / 2;
      page.drawImage(img, {
        x: imgX,
        y: height - 100 - imgHeight,
        width: imgWidth,
        height: imgHeight,
      });
    } catch (e) {
      console.error('Render page image failed:', e);
    }
  }
}

async function drawDevisPage(doc, page, devisData, boldFont, regularFont) {
  const { width, height } = page.getSize();
  page.drawRectangle({ x: 0, y: 0, width, height, height: height, color: COLORS.cream });

  const title = 'DOCUMENT DÉTAIL ESTIMATIF';
  const titleWidth = boldFont.widthOfTextAtSize(title, 20);
  page.drawRectangle({
    x: width / 2 - titleWidth / 2 - 20,
    y: height - 70,
    width: titleWidth + 40,
    height: 30,
    color: COLORS.brown,
  });
  page.drawText(title, {
    x: width / 2 - titleWidth / 2,
    y: height - 58,
    size: 18,
    font: boldFont,
    color: COLORS.white,
  });

  const entWidth = boldFont.widthOfTextAtSize('wooplans', 14);
  page.drawText('wooplans', {
    x: width / 2 - entWidth / 2,
    y: height - 95,
    size: 14,
    font: boldFont,
    color: COLORS.gold,
  });

  const tableTop = height - 140;
  const tableWidth = width - 100;
  const rowHeight = 22;
  const cols = { num: 50, des: 100, qte: 350, pu: 450, total: 550 };
  const colWidths = [40, 240, 90, 90, 90];

  page.drawRectangle({ x: 50, y: tableTop, width: tableWidth, height: rowHeight, color: COLORS.gold });
  page.drawText('N°', { x: cols.num, y: tableTop + 6, size: 10, font: boldFont, color: COLORS.darkBlue });
  page.drawText('Désignation', { x: cols.des, y: tableTop + 6, size: 10, font: boldFont, color: COLORS.darkBlue });
  page.drawText('Qté', { x: cols.qte, y: tableTop + 6, size: 10, font: boldFont, color: COLORS.darkBlue });
  page.drawText('Prix U.', { x: cols.pu, y: tableTop + 6, size: 10, font: boldFont, color: COLORS.darkBlue });
  page.drawText('Total', { x: cols.total, y: tableTop + 6, size: 10, font: boldFont, color: COLORS.darkBlue });

  devisData.lignes?.forEach((ligne, i) => {
    const y = tableTop - (i + 1) * rowHeight;
    const bgColor = i % 2 === 0 ? COLORS.white : rgb(0.96, 0.94, 0.91);
    page.drawRectangle({ x: 50, y: y, width: tableWidth, height: rowHeight, color: bgColor });

    page.drawText(String(ligne.numero || i + 1), { x: cols.num + 5, y: y + 6, size: 9, font: regularFont, color: COLORS.darkBlue });
    page.drawText(ligne.designation || '', { x: cols.des + 5, y: y + 6, size: 9, font: regularFont, color: COLORS.darkBlue });
    page.drawText(String(ligne.quantite || 1), { x: cols.qte + 5, y: y + 6, size: 9, font: regularFont, color: COLORS.darkBlue });
    page.drawText(`${formatNumber(ligne.prixUnitaire)} €`, { x: cols.pu + 5, y: y + 6, size: 9, font: regularFont, color: COLORS.darkBlue });
    page.drawText(`${formatNumber(ligne.total)} €`, { x: cols.total + 5, y: y + 6, size: 9, font: regularFont, color: COLORS.darkBlue });
  });

  const totalsY = tableTop - (devisData.lignes?.length || 0 + 2) * rowHeight - 30;

  page.drawText('TOTAL HT:', { x: 350, y: totalsY, size: 12, font: boldFont, color: COLORS.darkBlue });
  page.drawText(`${formatNumber(devisData.totalHT)} €`, { x: 480, y: totalsY, size: 12, font: boldFont, color: COLORS.darkBlue });

  page.drawText('TVA (20%):', { x: 350, y: totalsY - 20, size: 12, font: regularFont, color: COLORS.darkBlue });
  page.drawText(`${formatNumber(devisData.tva)} €`, { x: 480, y: totalsY - 20, size: 12, font: regularFont, color: COLORS.darkBlue });

  page.drawRectangle({ x: 340, y: totalsY - 35, width: 200, height: 2, color: COLORS.gold });

  page.drawText('TOTAL TTC:', { x: 350, y: totalsY - 50, size: 14, font: boldFont, color: COLORS.brown });
  page.drawText(`${formatNumber(devisData.totalTTC)} €`, { x: 480, y: totalsY - 50, size: 14, font: boldFont, color: COLORS.brown });

  page.drawRectangle({ x: 100, y: 100, width: width - 200, height: 1, color: COLORS.gold });
  page.drawText(`Document établi par wooplans · ${devisData.dateDevis || ''}`, {
    x: width / 2 - 150,
    y: 80,
    size: 10,
    font: regularFont,
    color: COLORS.brown,
  });
}

function addFooter(page, planData, clientData, boldFont, regularFont) {
  const { width, height } = page.getSize();
  page.drawRectangle({ x: 50, y: 25, width: width - 100, height: 1, color: COLORS.gold });

  const footerText = `wooplans · PLAN BASIQUE + DEVIS · ${planData.codePlan || ''}`;
  const footerWidth = regularFont.widthOfTextAtSize(footerText, 9);
  page.drawText(footerText, {
    x: (width - footerWidth) / 2,
    y: 12,
    size: 9,
    font: regularFont,
    color: COLORS.brown,
  });

  if (clientData.nom) {
    const clientText = `Client: ${clientData.nom}`;
    page.drawText(clientText, { x: 60, y: 12, size: 9, font: regularFont, color: COLORS.brown });
  }
}

function formatNumber(num) {
  if (!num && num !== 0) return '0';
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

function wrapText(text, font, size, maxWidth) {
  const words = text.split(' ');
  const lines = [];
  let currentLine = '';

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const testWidth = font.widthOfTextAtSize(testLine, size);
    if (testWidth > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines;
}

export function downloadPdf(pdfBytes, filename) {
  const blob = new Blob([pdfBytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}