import { querySimilar } from "@/lib/chroma";
import { google } from "@ai-sdk/google";
import { streamText } from "ai";

const MODEL_NAME = "gemini-2.0-flash-exp";

export async function POST(req: Request) {
  try {
    const { question } = await req.json();
    
    if (!question || typeof question !== 'string') {
      return new Response(JSON.stringify({ error: "Question is required and must be a string" }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Get context from vector database
    const context = await querySimilar(question);
    
    const prompt = `You are a helpful assistant. Use the following context to answer the question accurately and concisely.

Context:
${context}

Question: ${question}

Instructions:
- Answer based on the provided context
- If the context doesn't contain relevant information, say so clearly
- Be accurate and helpful
- Keep your response focused and relevant

Answer:`;

    const result = streamText({
      model: google(MODEL_NAME),
      prompt,
      temperature: 0.1, // Lower temperature for more consistent responses
      maxOutputTokens: 2000,
    });

    // Return the streaming response with proper headers
    return result.toTextStreamResponse();

  } catch (error) {
    console.error("Error generating answer:", error);
    
    // Return a proper error response
    return new Response(
      JSON.stringify({ 
        error: "Internal server error. Please try again.",
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      }), 
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}