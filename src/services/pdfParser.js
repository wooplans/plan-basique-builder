import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export async function parseDevisPdf(pdfFile) {
  try {
    const arrayBuffer = await pdfFile.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let text = '';

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const pageText = content.items.map(item => item.str).join(' ');
      text += pageText + '\n';
    }

    const lignes = extractLignes(text);
    const totals = extractTotals(text);
    const dateDevis = extractDate(text);

    return {
      lignes,
      ...totals,
      dateDevis,
    };
  } catch (error) {
    console.error('PDF parsing error:', error);
    throw error;
  }
}

function extractLignes(text) {
  const lignes = [];
  const lines = text.split('\n').filter(line => line.trim());
  let currentLigne = null;

  for (const line of lines) {
    const cleanedLine = line.trim();

    if (/^\d+\s+\w/i.test(cleanedLine)) {
      if (currentLigne) {
        lignes.push(currentLigne);
      }
      const parts = cleanedLine.split(/\s{2,}/);
      if (parts.length >= 4) {
        currentLigne = {
          numero: parseInt(parts[0]),
          designation: parts[1].trim(),
          quantite: parseInt(parts[2]) || 1,
          prixUnitaire: parseFloat(parts[3].replace(/[,\s]/g, '')) || 0,
          total: parseFloat(parts[4]?.replace(/[,\s]/g, '')) || (parseFloat(parts[3].replace(/[,\s]/g, '')) || 0) * (parseInt(parts[2]) || 1),
        };
      }
    } else if (currentLigne && /^\d+[\s,]*\d*$/.test(cleanedLine.replace(/[€EUR]/gi, ''))) {
      const values = cleanedLine.match(/[\d,]+/g);
      if (values && values.length >= 1) {
        currentLigne.total = parseFloat(values[values.length - 1].replace(/,/g, '.')) || currentLigne.total;
      }
    }
  }

  if (currentLigne) {
    lignes.push(currentLigne);
  }

  return lignes.map((l, i) => ({ ...l, numero: l.numero || i + 1 }));
}

function extractTotals(text) {
  let totalHT = 0;
  let tva = 0;
  let totalTTC = 0;

  const htMatch = text.match(/(?:total\s*ht|ht\s*:?\s*)([\d\s,]+)/i);
  if (htMatch) {
    totalHT = parseFloat(htMatch[1].replace(/[\s,]/g, '')) || 0;
  }

  const tvaMatch = text.match(/(?:tva|taxe)\s*:?\s*([\d\s,]+)/i);
  if (tvaMatch) {
    tva = parseFloat(tvaMatch[1].replace(/[\s,]/g, '')) || 0;
  }

  const ttcMatch = text.match(/(?:total\s*(?:ttc|all\s*taxes?)|ttc\s*:?\s*)([\d\s,]+)/i);
  if (ttcMatch) {
    totalTTC = parseFloat(ttcMatch[1].replace(/[\s,]/g, '')) || 0;
  } else if (totalHT && tva) {
    totalTTC = totalHT + tva;
  }

  return { totalHT, tva, totalTTC };
}

function extractDate(text) {
  const dateMatch = text.match(/(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/);
  if (dateMatch) {
    const day = dateMatch[1].padStart(2, '0');
    const month = dateMatch[2].padStart(2, '0');
    let year = dateMatch[3];
    if (year.length === 2) {
      year = parseInt(year) > 50 ? '19' + year : '20' + year;
    }
    return `${day}/${month}/${year}`;
  }
  const monthNames = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
  for (let i = 0; i < monthNames.length; i++) {
    const regex = new RegExp(`(\\d{1,2})\\s+${monthNames[i]}\\s+(\\d{4})`, 'i');
    const match = text.match(regex);
    if (match) {
      return `${match[1].padStart(2, '0')}/${String(i + 1).padStart(2, '0')}/${match[2]}`;
    }
  }
  const now = new Date();
  return `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
}