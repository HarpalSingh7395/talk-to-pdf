"use client";
import { useState, useRef, useEffect } from "react";
import { Bot, Volume2, VolumeX } from "lucide-react";
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
    <div className="flex items-start space-x-4 p-6 bg-white rounded-2xl shadow-sm border">
      <div className="relative flex-shrink-0">
        <Bot className={`w-12 h-12 text-blue-600 ${(isPlaying || isLoading) ? "animate-pulse" : ""}`} />
        {isPlaying && (
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full animate-ping"></div>
        )}
        {isLoading && (
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-500 rounded-full animate-spin"></div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="prose prose-sm max-w-none text-gray-800">
          <Markdown remarkPlugins={[remarkGfm]}>{text}</Markdown>
        </div>
        <div className="flex items-center gap-3 mt-4">
          <button
            onClick={toggleSpeech}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
            disabled={!speechEnabled}
          >
            {isPlaying || isLoading ? (
              <>
                <VolumeX className="w-4 h-4" />
                <span>{isLoading ? 'Loading...' : 'Stop'}</span>
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
            className={`text-xs px-2 py-1 rounded transition-colors ${
              speechEnabled ? "text-green-700 bg-green-100" : "text-red-700 bg-red-100"
            }`}
          >
            {speechEnabled ? "Speech On" : "Speech Off"}
          </button>
        </div>
      </div>
    </div>
  );
}