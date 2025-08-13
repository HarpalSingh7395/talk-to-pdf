import { CloudClient } from "chromadb";
import { embedText, embedTextBatch } from "./embed";
import { Document } from "langchain/document"
import { flattenMetadata } from "./utils";
import pLimit from 'p-limit'; // Add this dependency: npm install p-limit

export const chroma = new CloudClient();

// Optimized constants based on typical API limits
const EMBEDDING_CONCURRENCY = 3; // Reduced concurrent embedding calls
const BATCH_SIZE = 10; // Smaller batches for better error handling
const MAX_RETRIES = 2;
const RETRY_DELAY = 1000; // 1 second

// Create concurrency limiter
const embedLimit = pLimit(EMBEDDING_CONCURRENCY);

interface ChunkWithEmbedding {
  id: string;
  document: string;
  embedding: number[];
  metadata: any;
}

async function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function embedWithRetry(text: string, retries = MAX_RETRIES): Promise<number[] | null> {
  for (let i = 0; i <= retries; i++) {
    try {
      const embedding = await embedText(text);
      if (embedding && embedding.length > 0) {
        return embedding;
      }
    } catch (error) {
      console.warn(`Embedding attempt ${i + 1} failed:`, error.message);
      if (i < retries) {
        await delay(RETRY_DELAY * Math.pow(2, i)); // Exponential backoff
      }
    }
  }
  return null;
}

async function processChunkBatch(chunks: { doc: Document, index: number }[]): Promise<ChunkWithEmbedding[]> {
  // Use concurrency limiter for embedding calls
  const embeddingPromises = chunks.map(({ doc, index }) =>
    embedLimit(async () => {
      const text = doc.pageContent.trim();
      const embedding = await embedWithRetry(text);
      
      if (!embedding) {
        console.warn(`Failed to embed chunk ${index} after retries`);
        return null;
      }
      
      const safeMetadata = flattenMetadata(doc.metadata ?? {}, { index });
      return {
        id: `chunk-${Date.now()}-${Math.random().toString(36).substring(2)}-${index}`,
        document: text,
        embedding,
        metadata: safeMetadata,
      };
    })
  );

  const results = await Promise.allSettled(embeddingPromises);
  
  return results
    .map((r) => (r.status === "fulfilled" ? r.value : null))
    .filter((r): r is ChunkWithEmbedding => r !== null);
}

export async function upsertChunks(chunks: Document[]): Promise<{ success: number, failed: number }> {
  const col = await chroma.getOrCreateCollection({ name: "pdf-chunks-v2" });
  
  // Filter out empty chunks early
  const validChunks = chunks
    .map((doc, index) => ({ doc, index }))
    .filter(({ doc }) => doc.pageContent?.trim() && doc.pageContent.trim().length > 20);
  
  console.log(`Processing ${validChunks.length} valid chunks in batches of ${BATCH_SIZE}`);
  
  let totalSuccess = 0;
  let totalFailed = 0;

  // Process in smaller batches for better error handling and progress tracking
  for (let i = 0; i < validChunks.length; i += BATCH_SIZE) {
    const batch = validChunks.slice(i, i + BATCH_SIZE);
    console.log(`Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(validChunks.length / BATCH_SIZE)}`);
    
    try {
      const successful = await processChunkBatch(batch);
      
      if (successful.length > 0) {
        // Insert into ChromaDB
        await col.add({
          ids: successful.map((r) => r.id),
          documents: successful.map((r) => r.document),
          embeddings: successful.map((r) => r.embedding),
          metadatas: successful.map((r) => r.metadata),
        });
        
        totalSuccess += successful.length;
        console.log(`Successfully processed ${successful.length}/${batch.length} chunks in this batch`);
      }
      
      totalFailed += batch.length - successful.length;
      
      // Small delay between batches to be respectful to the API
      if (i + BATCH_SIZE < validChunks.length) {
        await delay(100);
      }
      
    } catch (error) {
      console.error(`Failed to process batch starting at index ${i}:`, error);
      totalFailed += batch.length;
      
      // Continue with next batch instead of failing completely
      continue;
    }
  }
  
  console.log(`Embedding complete: ${totalSuccess} successful, ${totalFailed} failed`);
  return { success: totalSuccess, failed: totalFailed };
}

// Alternative batch embedding function (if your embed service supports it)
export async function upsertChunksBatch(chunks: Document[]): Promise<{ success: number, failed: number }> {
  const col = await chroma.getOrCreateCollection({ name: "pdf-chunks-v2" });
  
  const validChunks = chunks
    .map((doc, index) => ({ doc, index }))
    .filter(({ doc }) => doc.pageContent?.trim() && doc.pageContent.trim().length > 20);
  
  // If your embedding service supports batch processing, use this approach
  const texts = validChunks.map(({ doc }) => doc.pageContent.trim());
  
  try {
    // Assuming you have a batch embedding function
    const embeddings = await embedTextBatch(texts);
    
    const successful = validChunks
      .map(({ doc, index }, i) => {
        if (!embeddings[i] || embeddings[i].length === 0) return null;
        
        return {
          id: `chunk-${Date.now()}-${Math.random().toString(36).substring(2)}-${index}`,
          document: doc.pageContent.trim(),
          embedding: embeddings[i],
          metadata: flattenMetadata(doc.metadata ?? {}, { index }),
        };
      })
      .filter((r): r is ChunkWithEmbedding => r !== null);
    
    if (successful.length > 0) {
      await col.add({
        ids: successful.map((r) => r.id),
        documents: successful.map((r) => r.document),
        embeddings: successful.map((r) => r.embedding),
        metadatas: successful.map((r) => r.metadata),
      });
    }
    
    return { 
      success: successful.length, 
      failed: validChunks.length - successful.length 
    };
    
  } catch (error) {
    console.error('Batch embedding failed:', error);
    // Fallback to individual processing
    return await upsertChunks(chunks);
  }
}

export async function upsertChunksWithProgress(
  chunks: Document[],
  onProgress: (progress: { processed: number; total: number; success: number; failed: number }) => void
): Promise<{ success: number; failed: number }> {
  const col = await chroma.getOrCreateCollection({ name: "pdf-chunks-v2" });

  const validChunks = chunks
    .map((doc, index) => ({ doc, index }))
    .filter(({ doc }) => doc.pageContent?.trim() && doc.pageContent.trim().length > 20);

  const total = validChunks.length;
  const BATCH_SIZE = 10;
  let processed = 0;
  let totalSuccess = 0;
  let totalFailed = 0;

  for (let i = 0; i < total; i += BATCH_SIZE) {
    const batch = validChunks.slice(i, i + BATCH_SIZE);

    try {
      const successful = await processChunkBatch(batch);

      if (successful.length > 0) {
        await col.add({
          ids: successful.map((r) => r.id),
          documents: successful.map((r) => r.document),
          embeddings: successful.map((r) => r.embedding),
          metadatas: successful.map((r) => r.metadata),
        });
        totalSuccess += successful.length;
      }

      totalFailed += batch.length - successful.length;
    } catch (error) {
      console.error(`Failed to process batch starting at index ${i}:`, error);
      totalFailed += batch.length;
    }

    processed += batch.length;

    onProgress({
      processed,
      total,
      success: totalSuccess,
      failed: totalFailed,
    });

    if (i + BATCH_SIZE < total) {
      await delay(100); // Slight pause between batches
    }
  }

  return { success: totalSuccess, failed: totalFailed };
}

export async function querySimilar(question: string) {
  if (!question?.trim()) {
    console.warn("Empty question passed to querySimilar");
    return "";
  }

  const col = await chroma.getOrCreateCollection({ name: "pdf-chunks-v2" });

  const qv = await embedText(question);

  if (!qv.length) {
    console.warn("Query embedding failed — empty array returned.");
    return "⚠️ Sorry, we couldn't understand your question. Please try rephrasing it.";
  }

  const res = await col.query({
    queryEmbeddings: [qv],
    nResults: 5,
  });

  return res.documents?.[0]?.join("\n\n") ?? "No relevant content found.";
}
