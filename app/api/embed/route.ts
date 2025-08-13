import { upsertChunksWithProgress } from "@/lib/chroma";
import { chunkText } from "@/lib/chunk";

export const maxDuration = 300;

export async function POST(req: Request) {
  const encoder = new TextEncoder();
  
  const stream = new ReadableStream({
    async start(controller) {
      const sendUpdate = (data: any) => {
        const message = `data: ${JSON.stringify(data)}\n\n`;
        controller.enqueue(encoder.encode(message));
      };

      try {
        const { text } = await req.json();
        
        if (!text?.trim()) {
          sendUpdate({ error: "Empty text provided" });
          controller.close();
          return;
        }

        const textLength = text.trim().length;
        sendUpdate({ 
          stage: "chunking", 
          message: `Processing ${textLength} characters...` 
        });

        // Step 1: Chunk the text
        const chunks = await chunkText(text);
        sendUpdate({ 
          stage: "chunking_complete", 
          totalChunks: chunks.length,
          message: `Created ${chunks.length} chunks` 
        });

        if (chunks.length === 0) {
          sendUpdate({ error: "No valid chunks created from text" });
          controller.close();
          return;
        }

        // Step 2: Process chunks with progress updates
        sendUpdate({ 
          stage: "embedding_start", 
          message: "Starting embedding process..." 
        });

        // You would modify upsertChunks to accept a progress callback
        const result = await upsertChunksWithProgress(chunks, (progress) => {
          console.log({progress})
          sendUpdate({
            stage: "embedding_progress",
            processed: progress.processed,
            total: progress.total,
            percentage: Math.round((progress.processed / progress.total) * 100),
            message: `Processed ${progress.processed}/${progress.total} chunks`
          });
        });

        // Final success message
        sendUpdate({
          stage: "complete",
          status: "success",
          details: {
            totalChunks: chunks.length,
            successful: result.success,
            failed: result.failed,
          },
          message: "Processing completed successfully"
        });

      } catch (error: any) {
        sendUpdate({
          stage: "error",
          error: error.message || "Processing failed"
        });
      } finally {
        controller.close();
      }
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}