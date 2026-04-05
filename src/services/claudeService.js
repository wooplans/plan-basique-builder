import Anthropic from '@anthropic-ai/sdk';

export async function analyzePlanImage(imageBase64, apiKey) {
  const anthropic = new Anthropic({
    apiKey: apiKey,
    dangerouslyAllowBrowser: true,
  });

  const prompt = `Analyze this architectural floor plan image and extract the following information in JSON format:
{
  "codePlan": "Extract the plan code if visible (format like V6-002 or D4-045)",
  "type": "Villa or Duplex based on the plan structure",
  "surface": "Total surface area in m² (only number)",
  "chambres": "Number of bedrooms",
  "pieces": "Total number of rooms",
  "composition": [
    {"nom": "Room name", "surface": area_in_m2}
  ],
  "description": "Brief description of the house/project in French"
}

Return ONLY the JSON object, no other text. If you cannot determine a value, use null.`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-latest',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: [{
          type: 'image',
          source: {
            type: 'base64',
            media_type: 'image/jpeg',
            data: imageBase64,
          },
        }, {
          type: 'text',
          text: prompt,
        }],
      }],
    });

    const text = response.content[0].text;
    console.log('AI Response:', text);
    
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      console.log('Parsed data:', parsed);
      return {
        codePlan: parsed.codePlan || '',
        type: parsed.type || 'Villa',
        surface: String(parsed.surface || ''),
        chambres: Number(parsed.chambres || 0),
        pieces: Number(parsed.pieces || 0),
        composition: Array.isArray(parsed.composition) ? parsed.composition : [],
        description: parsed.description || '',
      };
    }
    throw new Error('Failed to parse AI response');
  } catch (error) {
    console.error('Analysis error:', error);
    throw error;
  }
}

export async function analyzeDevisPdf(pdfBase64, apiKey) {
  const anthropic = new Anthropic({
    apiKey: apiKey,
    dangerouslyAllowBrowser: true,
  });

  const prompt = `Extract the detailed estimate (devis) information from this document and return a JSON object with this format:
{
  "lignes": [
    {"numero": 1, "designation": "Item name", "quantite": 1, "prixUnitaire": 1000, "total": 1000}
  ],
  "totalHT": 50000,
  "tva": 10000,
  "totalTTC": 60000,
  "dateDevis": "15/04/2025"
}

Return ONLY the JSON object, no other text. Extract all line items with their quantities, unit prices and totals. If total HT/TTC are not explicitly shown, calculate them from the line items.`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-latest',
      max_tokens: 2048,
      messages: [{
        role: 'user',
        content: [{
          type: 'image',
          source: {
            type: 'base64',
            media_type: 'application/pdf',
            data: pdfBase64,
          },
        }, {
          type: 'text',
          text: prompt,
        }],
      }],
    });

    const text = response.content[0].text;
    console.log('AI Devis Response:', text);
    
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      console.log('Parsed devis data:', parsed);
      return {
        lignes: Array.isArray(parsed.lignes) ? parsed.lignes : [],
        totalHT: Number(parsed.totalHT || 0),
        tva: Number(parsed.tva || 0),
        totalTTC: Number(parsed.totalTTC || 0),
        dateDevis: parsed.dateDevis || new Date().toLocaleDateString('fr-FR'),
      };
    }
    throw new Error('Failed to parse AI response');
  } catch (error) {
    console.error('Devis analysis error:', error);
    throw error;
  }
}

export function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}