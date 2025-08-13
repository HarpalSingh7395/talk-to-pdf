"use client";
import { useState, useRef, useEffect } from "react";
import { Bot, Volume2, VolumeX, FileText } from "lucide-react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

/**
 * Converts raw PCM audio data into a playable WAV format.
 * @param {Int16Array} pcmData - The raw 16-bit PCM audio data.
 * @param {number} sampleRate - The sample rate of the audio (e.g., 24000).
 * @returns {Blob} A Blob object representing the WAV file.
 */
const pcmToWav = (pcmData: Int16Array, sampleRate: number): Blob => {
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
  const blockAlign = numChannels * (bitsPerSample / 8);
  const dataSize = pcmData.length * 2; // 2 bytes per sample (16-bit)

  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  // RIFF header
  view.setUint32(0, 0x52494646, false); // "RIFF"
  view.setUint32(4, 36 + dataSize, true);
  view.setUint32(8, 0x57415645, false); // "WAVE"

  // "fmt " sub-chunk
  view.setUint32(12, 0x666d7420, false); // "fmt "
  view.setUint32(16, 16, true); // Sub-chunk size
  view.setUint16(20, 1, true); // Audio format (1 for PCM)
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);

  // "data" sub-chunk
  view.setUint32(36, 0x64617461, false); // "data"
  view.setUint32(40, dataSize, true);

  // Write PCM data as little-endian 16-bit integers
  let offset = 44;
  for (let i = 0; i < pcmData.length; i++) {
    view.setInt16(offset, pcmData[i], true); // true for little-endian
    offset += 2;
  }

  return new Blob([buffer], { type: "audio/wav" });
};

interface AvatarSpeakerProps {
  text: string;
}

export function AvatarSpeaker({ text }: AvatarSpeakerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [speechEnabled, setSpeechEnabled] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const speakText = async () => {
    if (!text || !speechEnabled || isLoading) return;

    // Stop any currently playing audio
    if (audioRef.current) {
      stopSpeaking();
    }

    try {
      setIsLoading(true);
      abortControllerRef.current = new AbortController();
      
      console.log('Starting TTS request...');
      
      const res = await fetch("/api/speak", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Accept": "audio/L16, application/json",
        },
        body: JSON.stringify({ text }),
        signal: abortControllerRef.current.signal,
      });

      console.log('Response status:', res.status);
      console.log('Response headers:', Object.fromEntries(res.headers.entries()));

      if (!res.ok) {
        let errorData;
        try {
          errorData = await res.json();
        } catch {
          errorData = { error: `HTTP ${res.status}: ${res.statusText}` };
        }
        throw new Error(`Server error: ${res.status} - ${errorData.error || res.statusText}`);
      }

      const contentType = res.headers.get('content-type');
      console.log('Content-Type:', contentType);
      
      if (contentType?.includes('application/json')) {
        // This means we got an error response as JSON
        const errorData = await res.json();
        throw new Error(`API error: ${errorData.error || 'Unknown error'}`);
      }

      if (!res.body) {
        throw new Error('No response body received');
      }

      if (!contentType?.includes('audio/')) {
        throw new Error(`Unexpected content type: ${contentType}`);
      }
      
      // Process the stream of PCM data
      const reader = res.body.getReader();
      const chunks: Uint8Array[] = [];
      
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (value && value.length > 0) {
            chunks.push(value);
          }
        }
      } finally {
        reader.releaseLock();
      }

      if (chunks.length === 0) {
        throw new Error('No audio data received from stream');
      }

      // Concatenate all chunks into a single Uint8Array
      const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
      const concatenatedChunks = new Uint8Array(totalLength);
      let offset = 0;
      for (const chunk of chunks) {
        concatenatedChunks.set(chunk, offset);
        offset += chunk.length;
      }
      
      // Ensure we have an even number of bytes for 16-bit samples
      const evenLength = concatenatedChunks.length - (concatenatedChunks.length % 2);
      const trimmedData = concatenatedChunks.slice(0, evenLength);
      
      // Convert the raw bytes to 16-bit signed integers (little-endian)
      const pcmData = new Int16Array(trimmedData.buffer, trimmedData.byteOffset, trimmedData.length / 2);

      // Convert the PCM data to a playable WAV blob
      const sampleRate = 24000; // This must match the rate from the API
      const wavBlob = pcmToWav(pcmData, sampleRate);
      
      if (wavBlob.size === 0) {
        throw new Error('Generated WAV blob is empty');
      }
      
      const url = URL.createObjectURL(wavBlob);
      
      const audio = new Audio(url);
      audioRef.current = audio;
      
      audio.onloadstart = () => {
        setIsLoading(false);
        setIsPlaying(true);
      };
      
      audio.onended = () => {
        setIsPlaying(false);
        URL.revokeObjectURL(url);
        audioRef.current = null;
      };
      
      audio.onerror = (e) => {
        console.error('Audio playback error:', e);
        setIsPlaying(false);
        setIsLoading(false);
        URL.revokeObjectURL(url);
        audioRef.current = null;
      };

      // Start playing the audio
      await audio.play();

    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        console.log('Audio generation aborted.');
      } else {
        console.error("Audio generation/playback failed:", err);
        alert(`An error occurred while trying to play audio: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
      setIsPlaying(false);
      setIsLoading(false);
    }
  };

  const stopSpeaking = () => {
    // Abort the fetch request if it's in progress
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    
    // Stop and clean up the audio element
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      if (audioRef.current.src) {
        URL.revokeObjectURL(audioRef.current.src);
      }
      audioRef.current = null;
    }
    
    setIsPlaying(false);
    setIsLoading(false);
  };

  // Cleanup on component unmount
  useEffect(() => {
    return () => {
      stopSpeaking();
    };
  }, []);

  const toggleSpeech = () => {
    if (isPlaying || isLoading) {
      stopSpeaking();
    } else {
      speakText();
    }
  };

  if (!text) return null;

  return (
    <div className="flex items-start gap-4 p-6 bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow duration-200">
      {/* AI Avatar */}
      <div className="relative flex-shrink-0">
        <div className={`w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center transition-all duration-300 ${
          (isPlaying || isLoading) ? "bg-blue-200 scale-105" : ""
        }`}>
          <div className="w-6 h-6 bg-blue-600 rounded-lg flex items-center justify-center">
            <FileText className="w-4 h-4 text-white" />
          </div>
        </div>
        
        {/* Status indicators */}
        {isPlaying && (
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse">
            <div className="absolute inset-0 bg-green-500 rounded-full animate-ping"></div>
          </div>
        )}
        {isLoading && (
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full">
            <div className="absolute inset-0 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* AI Response */}
        <div className="mb-4">
          <div className="prose prose-sm max-w-none text-gray-800 leading-relaxed">
            <Markdown 
              remarkPlugins={[remarkGfm]}
              components={{
                p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,
                h1: ({ children }) => <h1 className="text-lg font-semibold text-gray-900 mb-2">{children}</h1>,
                h2: ({ children }) => <h2 className="text-base font-semibold text-gray-900 mb-2">{children}</h2>,
                h3: ({ children }) => <h3 className="text-sm font-semibold text-gray-900 mb-2">{children}</h3>,
                ul: ({ children }) => <ul className="mb-3 pl-4 space-y-1">{children}</ul>,
                ol: ({ children }) => <ol className="mb-3 pl-4 space-y-1">{children}</ol>,
                li: ({ children }) => <li className="text-gray-700">{children}</li>,
                blockquote: ({ children }) => (
                  <blockquote className="border-l-4 border-blue-200 pl-4 py-2 bg-blue-50 rounded-r-lg mb-3">
                    {children}
                  </blockquote>
                ),
                code: ({ children, className }) => {
                  const isInline = !className;
                  if (isInline) {
                    return (
                      <code className="bg-gray-100 text-gray-800 px-1.5 py-0.5 rounded text-sm font-mono">
                        {children}
                      </code>
                    );
                  }
                  return (
                    <pre className="bg-gray-100 p-3 rounded-lg overflow-x-auto mb-3">
                      <code className="text-sm font-mono text-gray-800">{children}</code>
                    </pre>
                  );
                },
                strong: ({ children }) => <strong className="font-semibold text-gray-900">{children}</strong>,
              }}
            >
              {text}
            </Markdown>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <button
            onClick={toggleSpeech}
            className={`inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
              isPlaying || isLoading
                ? 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200'
                : 'bg-gray-50 text-gray-700 hover:bg-blue-50 hover:text-blue-700 border border-gray-200 hover:border-blue-200'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
            disabled={!speechEnabled}
          >
            {isPlaying || isLoading ? (
              <>
                <VolumeX className="w-4 h-4" />
                <span>{isLoading ? 'Generating...' : 'Stop'}</span>
              </>
            ) : (
              <>
                <Volume2 className="w-4 h-4" />
                <span>Listen</span>
              </>
            )}
          </button>

          <button
            onClick={() => setSpeechEnabled(!speechEnabled)}
            className={`inline-flex items-center px-2.5 py-1.5 text-xs font-medium rounded-md transition-all duration-200 ${
              speechEnabled 
                ? "bg-green-50 text-green-700 border border-green-200 hover:bg-green-100" 
                : "bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100"
            }`}
          >
            <div className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
              speechEnabled ? 'bg-green-500' : 'bg-gray-400'
            }`} />
            {speechEnabled ? "Speech enabled" : "Speech disabled"}
          </button>
        </div>
      </div>
    </div>
  );
}