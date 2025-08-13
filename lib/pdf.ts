import * as pdf from "pdf-parse/lib/pdf-parse.js";

export async function extractTextFromPDF(buffer: Buffer) {
  const data = await pdf(buffer);
  return data.text;
}
