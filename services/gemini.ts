import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export interface AIAnalysisResult {
  name: string;
  description: string;
  machineModel: string;
  suggestedSku: string;
}

export const analyzePartImage = async (base64Image: string): Promise<AIAnalysisResult> => {
  try {
    // Remove header if present (e.g., data:image/jpeg;base64,)
    const base64Data = base64Image.split(',')[1] || base64Image;

    const model = 'gemini-2.5-flash';

    const response = await ai.models.generateContent({
      model: model,
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: base64Data
            }
          },
          {
            text: "Analise esta imagem de uma peça de manutenção. Identifique o nome provável da peça, uma breve descrição técnica, para qual tipo de máquina ela geralmente serve (ex: Furadeira, Torno, Empilhadeira, Genérico) e sugira um SKU curto (3 letras - 4 numeros). Responda em Português do Brasil."
          }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            description: { type: Type.STRING },
            machineModel: { type: Type.STRING },
            suggestedSku: { type: Type.STRING }
          },
          required: ["name", "description", "machineModel", "suggestedSku"]
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("Sem resposta da IA");
    
    return JSON.parse(text) as AIAnalysisResult;

  } catch (error) {
    console.error("Erro na análise Gemini:", error);
    throw error;
  }
};