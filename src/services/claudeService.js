import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: import.meta.env.VITE_ANTHROPIC_API_KEY,
});

export async function analyzePlanImage(imageBase64) {
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
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    return JSON.parse(jsonMatch[0]);
  }
  throw new Error('Failed to parse AI response');
}

export async function analyzeDevisPdf(pdfBase64) {
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
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    return JSON.parse(jsonMatch[0]);
  }
  throw new Error('Failed to parse AI response');
}

export function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}