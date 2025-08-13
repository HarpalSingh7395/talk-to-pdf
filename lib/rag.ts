import { streamText } from "ai";
import { querySimilar } from "./chroma";
// import { ai } from "./llm";
import { google } from "@ai-sdk/google"

const MODEL_NAME = "gemini-2.5-flash";


export async function askQuestion(question: string) {
  const context = await querySimilar(question);

  const prompt = `
You are a helpful assistant. Use the following context to answer the question:

Context:
${context}

Question: ${question}

Answer:
  `;

  const result = streamText({
    model: google(MODEL_NAME),
    prompt,
  })
  // await ai.models.generateContent({
  //   contents: [{ text: prompt }],
  //   model: MODEL_NAME,
  // });
  return result.toTextStreamResponse();
  // const response = await result.text;
  // return response;
}
