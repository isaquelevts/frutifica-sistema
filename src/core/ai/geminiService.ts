import { GoogleGenAI } from "@google/genai";
import { Report, Cell } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateChurchInsights = async (reports: Report[], cells: Cell[]): Promise<string> => {
  try {
    // Prepare data for the prompt
    const recentReports = reports.slice(-10); // Analyze last 10 reports to save tokens
    const dataSummary = JSON.stringify({
      totalCells: cells.length,
      recentReports: recentReports.map(r => ({
        cell: r.cellName,
        date: r.date,
        participants: r.participants,
        visitors: r.visitors,
        type: r.type,
        happened: r.happened
      }))
    });

    const prompt = `
      Atue como um consultor sênior de crescimento de igrejas e liderança cristã.
      Analise os seguintes dados de relatórios de células (pequenos grupos):
      ${dataSummary}

      Forneça 3 insights estratégicos curtos e motivadores em português.
      Foque em:
      1. Tendências de crescimento ou queda.
      2. Conversão de visitantes.
      3. Uma palavra de encorajamento para a liderança baseada nos números.
      
      Use formatação Markdown simples (negrito, listas). Seja direto e inspirador.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text || "Não foi possível gerar insights no momento.";
  } catch (error) {
    console.error("Error generating insights:", error);
    return "Ocorreu um erro ao conectar com a inteligência artificial. Verifique sua chave de API ou tente novamente mais tarde.";
  }
};