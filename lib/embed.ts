// lib/embed.ts
// import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { pipeline } from "@huggingface/transformers"

let extractor: any;

async function loadModel() {
  if (!extractor) {
    extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
  }
  return extractor;
}

export async function embedText(text: string): Promise<number[]> {
  const extractor = await loadModel();
  const output = await extractor(text, { pooling: 'mean', normalize: true });
  return Array.from(output.data);
}

export async function embedTextBatch(texts: string[]): Promise<number[][]> {
  const extractor = await loadModel();
  const outputs = await Promise.all(
    texts.map(text => extractor(text, { pooling: 'mean', normalize: true }))
  );
  return outputs.map(out => Array.from(out.data));
}

// // Singleton instance to avoid re-initializing
// const embeddings = new GoogleGenerativeAIEmbeddings({
//   model: "text-embedding-004", // 768 dimensions
// });

// export async function embedText(text: string): Promise<number[]> {
//   const trimmed = text?.trim();
//   if (!trimmed) return [];

//   return await embeddings.embedQuery(trimmed);
// }


// export async function embedTextBatch(texts: string[]): Promise<number[][]> {
//   // Implementation depends on your embedding service
//   // Example for OpenAI:
//   /*
//   const response = await openai.embeddings.create({
//     model: "text-embedding-3-small",
//     input: texts,
//   });
//   return response.data.map(item => item.embedding);
//   */
  
//   // For services that don't support batch, fall back to concurrent individual calls
//   const embeddings = await Promise.all(
//     texts.map(text => embedText(text))
//   );
  
//   return embeddings.filter(emb => emb !== null) as number[][];
// }