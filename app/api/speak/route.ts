// app/api/speak/route.ts - Fixed streaming version
import { ai } from '@/lib/llm';
import { NextRequest, NextResponse } from 'next/server';

// === CORS Headers ===
const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // In production, restrict this to your domain
  'Access-Control-Allow-Methods': 'POST, OPTIONS, GET',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400', // Cache preflight response for 24 hours
};

// === OPTIONS Handler ===
export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders,
  });
}

// === POST Handler ===
export async function POST(req: NextRequest) {
  console.log('=== TTS Streaming API Route Called ===');

  try {
    // Parse the request body
    const body = await req.json();
    const { text, voiceName = 'Kore' } = body;

    // Validate input
    if (!text || typeof text !== 'string') {
      console.error('Invalid or missing text in request');
      return NextResponse.json(
        { error: 'Valid text is required' },
        { status: 400, headers: corsHeaders }
      );
    }

    if (text.trim().length === 0) {
      console.error('Empty text provided');
      return NextResponse.json(
        { error: 'Text cannot be empty' },
        { status: 400, headers: corsHeaders }
      );
    }

    console.log(`Request received. Text length: ${text.length}, Voice: ${voiceName}`);

    // Check if ai instance is available
    if (!ai || !ai.models) {
      console.error('AI instance not properly initialized');
      return NextResponse.json(
        { error: 'AI service not available' },
        { status: 503, headers: corsHeaders }
      );
    }

    // Call the Gemini API to generate the audio stream
    let result;
    try {
      result = await ai.models.generateContentStream({
        model: 'gemini-2.5-flash-preview-tts',
        contents: [{
          role: 'user',
          parts: [{ text: text }] // Send the full text
        }],
        config: {
          // The response modality must be AUDIO for TTS
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              // Voice names are typically case-sensitive and specific
              prebuiltVoiceConfig: {
                voiceName: voiceName,
              },
            },
          },
        },
      });
    } catch (apiError) {
      console.error('Gemini API error:', apiError);
      return NextResponse.json(
        {
          error: 'Failed to generate audio',
          details: apiError instanceof Error ? apiError.message : 'Unknown API error'
        },
        { status: 502, headers: corsHeaders }
      );
    }

    const audioMimeType = 'audio/L16; rate=24000';
    console.log(`Streaming audio with MIME type: ${audioMimeType}`);

    // Create a ReadableStream to pipe the audio data to the client
    const stream = new ReadableStream({
      async start(controller) {
        let chunkCount = 0;
        let totalBytes = 0;

        try {
          for await (const chunk of result) {
            chunkCount++;

            // Look for audio data in the chunk
            const audioPart = chunk.candidates?.[0]?.content?.parts?.find(
              part => part.inlineData?.mimeType?.startsWith('audio/')
            );

            if (audioPart?.inlineData?.data) {
              try {
                // Decode base64 audio data
                const base64Data = audioPart.inlineData.data;
                const binaryString = atob(base64Data);
                const uint8Array = new Uint8Array(binaryString.length);

                for (let i = 0; i < binaryString.length; i++) {
                  uint8Array[i] = binaryString.charCodeAt(i);
                }

                totalBytes += uint8Array.length;
                controller.enqueue(uint8Array);

                console.log(`Chunk ${chunkCount}: ${uint8Array.length} bytes`);
              } catch (decodeError) {
                console.error('Error decoding audio chunk:', decodeError);
                // Continue processing other chunks
              }
            }
          }

          console.log(`Stream completed. Total chunks: ${chunkCount}, Total bytes: ${totalBytes}`);

          if (totalBytes === 0) {
            console.warn('No audio data was generated');
            controller.error(new Error('No audio data generated'));
            return;
          }

        } catch (streamError) {
          console.error('Error while processing stream from Gemini:', streamError);
          controller.error(streamError);
          return;
        } finally {
          console.log('Closing controller');
          controller.close();
        }
      },

      cancel(reason) {
        console.log('Stream was cancelled:', reason);
      }
    });

    // Set response headers
    const responseHeaders = new Headers(corsHeaders);
    responseHeaders.set('Content-Type', audioMimeType);
    responseHeaders.set('Cache-Control', 'no-cache');
    responseHeaders.set('Connection', 'keep-alive');

    return new NextResponse(stream, {
      status: 200,
      headers: responseHeaders,
    });

  } catch (error) {
    console.error('=== TTS API General Error ===', error);

    // Handle specific error types
    let errorMessage = 'The TTS API failed';
    let statusCode = 500;

    if (error instanceof SyntaxError) {
      errorMessage = 'Invalid JSON in request body';
      statusCode = 400;
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }

    return NextResponse.json(
      {
        error: errorMessage,
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      {
        status: statusCode,
        headers: corsHeaders
      }
    );
  }
}

// === GET Handler ===
export async function GET() {
  return NextResponse.json({
    message: 'TTS Streaming API is running. Use POST to generate audio.',
    timestamp: new Date().toISOString(),
    supportedMethods: ['POST', 'OPTIONS'],
    expectedFormat: {
      text: 'string (required)',
      voiceName: 'string (optional, default: "Kore")'
    }
  }, {
    headers: corsHeaders,
    status: 200
  });
}