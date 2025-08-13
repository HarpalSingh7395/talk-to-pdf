import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';

export async function chunkText(text: string) {
  // Optimize chunk size for embedding APIs (most work well with 200-400 tokens)
  const splitter = new RecursiveCharacterTextSplitter({ 
    chunkSize: 300, // Reduced from 500 for faster embedding
    chunkOverlap: 30, // Reduced overlap proportionally
    separators: ['\n\n', '\n', '. ', ' ', ''] // Better splitting points
  });
  
  const chunks = await splitter.createDocuments([text]);
  
  // Filter out very small chunks that don't provide value
  return chunks.filter(chunk => chunk.pageContent.trim().length > 20);
}