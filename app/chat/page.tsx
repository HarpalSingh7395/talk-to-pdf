"use client";
import { useState, useRef, useEffect } from "react";
import { Bot, Send, FileText, Loader2, Check, X, ChevronLeft, ChevronRight } from "lucide-react";
import { AvatarSpeaker } from "@/components/AvatarSpeaker";
import { UploadButton } from "@uploadthing/react";
import Header from "@/components/Navbar";

interface Message {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface EmbedProgress {
  stage: string;
  message: string;
  percentage?: number;
  processed?: number;
  total?: number;
  totalChunks?: number;
  details?: any;
  error?: string;
}

export default function Page() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [pdfUploaded, setPdfUploaded] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string>("");
  const [currentResponse, setCurrentResponse] = useState("");
  const [retryCount, setRetryCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isLeftPanelCollapsed, setIsLeftPanelCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showMobilePdf, setShowMobilePdf] = useState(false);
  const [embedProgress, setEmbedProgress] = useState<EmbedProgress | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Check for mobile viewport
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
      // Auto-collapse on mobile
      if (window.innerWidth < 1024) {
        setIsLeftPanelCollapsed(true);
      }
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, currentResponse]);

  async function handleFile(text: string, fileUrl?: string) {
    setUploading(true);
    setEmbedProgress(null);
    setError(null);

    try {
      const response = await fetch("/api/embed", {
        method: "POST",
        body: JSON.stringify({ text }),
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      if (!response.body) {
        throw new Error("No response body received");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      try {
        while (true) {
          const { done, value } = await reader.read();
          
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');
          
          for (const line of lines) {
            console.log({line})
            if (line.startsWith('data: ')) {
              try {
                const jsonStr = line.slice(6);
                if (jsonStr.trim() === '[DONE]') continue;
                
                const progressData = JSON.parse(jsonStr);
                setEmbedProgress(progressData);

                // Handle error in stream
                if (progressData.error) {
                  throw new Error(progressData.error);
                }

                // Handle completion
                if (progressData.stage === 'complete') {
                  setPdfUploaded(true);
                  if (fileUrl) {
                    setPdfUrl(fileUrl);
                  }
                  
                  // Show left panel when PDF is uploaded
                  setIsLeftPanelCollapsed(false);
                  
                  setMessages([{
                    id: Date.now().toString(),
                    type: 'assistant',
                    content: `Great! I've processed your PDF with ${progressData.details?.totalChunks || 0} chunks. You can now ask me questions about its content.`,
                    timestamp: new Date()
                  }]);

                  // Clear progress after a delay
                  setTimeout(() => {
                    setEmbedProgress(null);
                  }, 3000);
                }
              } catch (parseError) {
                console.warn('Error parsing progress data:', parseError);
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }

    } catch (error) {
      console.error('Upload error:', error);
      setError(error instanceof Error ? error.message : "Error processing PDF. Please try again.");
      setEmbedProgress(null);
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(e: React.MouseEvent | React.KeyboardEvent) {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const question = input.trim();
    setInput("");
    setLoading(true);
    setError(null);
    setRetryCount(0);

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: question,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setCurrentResponse("");

    await processQuestion(question);
  }

  async function processQuestion(question: string, attempt = 1) {
    const maxAttempts = 3;

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        body: JSON.stringify({ question }),
        headers: { 
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      if (!response.body) {
        throw new Error("No response body received");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullResponse = "";

      try {
        while (true) {
          const { done, value } = await reader.read();
          
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');
          
          for (const line of lines) {
            let textToAdd = '';
            
            if (line.startsWith('data: ')) {
              try {
                const jsonStr = line.slice(6);
                if (jsonStr.trim() === '[DONE]') continue;
                
                const parsed = JSON.parse(jsonStr);
                textToAdd = parsed.text || parsed.content || parsed.delta?.content || '';
              } catch {
                textToAdd = line.slice(6);
              }
            } else if (line.startsWith('{') && line.endsWith('}')) {
              try {
                const parsed = JSON.parse(line);
                textToAdd = parsed.text || parsed.content || parsed.delta?.content || '';
              } catch {
                textToAdd = line;
              }
            } else if (line.trim()) {
              textToAdd = line;
            }
            
            if (textToAdd) {
              fullResponse += textToAdd;
              setCurrentResponse(fullResponse);
            }
          }

          if (
            fullResponse.toLowerCase().includes("overloaded") ||
            fullResponse.toLowerCase().includes("rate limit") ||
            fullResponse.toLowerCase().includes("service unavailable")
          ) {
            throw new Error("Service overloaded");
          }
        }
      } finally {
        reader.releaseLock();
      }

      if (fullResponse.trim()) {
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          type: "assistant",
          content: fullResponse.trim(),
          timestamp: new Date(),
        };

        setMessages((prev) => [...prev, assistantMessage]);
      }
      
      setCurrentResponse("");
      setError(null);

    } catch (error: any) {
      console.error(`Attempt ${attempt} failed:`, error);

      const isRetryableError =
        error.message?.toLowerCase().includes("overloaded") ||
        error.message?.toLowerCase().includes("rate limit") ||
        error.message?.includes("503") ||
        error.message?.includes("429") ||
        error.message?.toLowerCase().includes("unavailable") ||
        error.message?.toLowerCase().includes("network") ||
        error.name === 'TypeError';

      if (isRetryableError && attempt < maxAttempts) {
        setRetryCount(attempt);
        const delay = 1000 * Math.pow(2, attempt - 1);

        setCurrentResponse(`Retrying... (attempt ${attempt}/${maxAttempts})`);

        setTimeout(() => {
          processQuestion(question, attempt + 1);
        }, delay);

        return;
      }

      let errorMessage = "I encountered an error processing your question. ";
      errorMessage += isRetryableError
        ? "The service appears to be overloaded. Please try again in a few minutes."
        : "Please try again.";

      const errorAssistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: "assistant",
        content: errorMessage,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, errorAssistantMessage]);
      setCurrentResponse("");
      setError(errorMessage);

    } finally {
      setLoading(false);
      setRetryCount(0);
    }
  }

  const toggleLeftPanel = () => {
    setIsLeftPanelCollapsed(!isLeftPanelCollapsed);
  };

  const getProgressBarColor = (stage: string) => {
    switch (stage) {
      case 'chunking':
        return 'bg-blue-500';
      case 'embedding_progress':
        return 'bg-green-500';
      case 'complete':
        return 'bg-emerald-500';
      case 'error':
        return 'bg-red-500';
      default:
        return 'bg-blue-500';
    }
  };

  const getProgressMessage = (progress: EmbedProgress) => {
    switch (progress.stage) {
      case 'chunking':
        return 'Analyzing document structure...';
      case 'chunking_complete':
        return `Created ${progress.totalChunks} text chunks`;
      case 'embedding_start':
        return 'Starting AI embedding process...';
      case 'embedding_progress':
        return `Processing chunks: ${progress.processed}/${progress.total}`;
      case 'complete':
        return 'Successfully processed your PDF!';
      default:
        return progress.message || 'Processing...';
    }
  };

  return (
    <div className="flex flex-col h-screen ">
      {/* Header */}
      <Header />
      {/* <header className="bg-white shadow-sm border-b border-slate-200 p-4 flex-shrink-0 relative z-10">
        <div className="flex items-center justify-between max-w-full">
          <div className="flex items-center gap-3">
            <Bot className="w-8 h-8 text-blue-600" />
            <div>
              <h1 className="text-xl lg:text-2xl font-bold text-slate-800">
                PDF Chat Assistant
              </h1>
              <p className="text-slate-600 text-sm hidden sm:block">
                Upload a PDF and ask questions about its content
              </p>
            </div>
          </div>
          
          
          {isMobile && pdfUploaded && (
            <button
              onClick={() => setShowMobilePdf(!showMobilePdf)}
              className="lg:hidden px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <FileText className="w-4 h-4" />
              {showMobilePdf ? 'Hide PDF' : 'View PDF'}
            </button>
          )}
          
          
          {!isMobile && pdfUploaded && (
            <button
              onClick={toggleLeftPanel}
              className="hidden lg:flex items-center gap-2 px-3 py-2 text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
            >
              {isLeftPanelCollapsed ? (
                <>
                  <ChevronRight className="w-4 h-4" />
                  <span className="text-sm">Show PDF</span>
                </>
              ) : (
                <>
                  <ChevronLeft className="w-4 h-4" />
                  <span className="text-sm">Hide PDF</span>
                </>
              )}
            </button>
          )}
        </div>
      </header> */}

      {/* Processing Progress Bar */}
      {embedProgress && (
        <div className="bg-white border-b border-slate-200 px-4 py-3">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-3 mb-2">
              <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
              <span className="text-sm font-medium text-slate-800">
                {getProgressMessage(embedProgress)}
              </span>
              {embedProgress.percentage !== undefined && (
                <span className="text-sm text-slate-600">
                  {embedProgress.percentage}%
                </span>
              )}
            </div>
            <div className="w-full bg-slate-200 rounded-full h-2">
              <div 
                className={`h-2 rounded-full transition-all duration-300 ${getProgressBarColor(embedProgress.stage)}`}
                style={{ 
                  width: `${embedProgress.percentage || (embedProgress.stage === 'complete' ? 100 : 20)}%` 
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Mobile PDF Overlay */}
      {isMobile && showMobilePdf && pdfUrl && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 lg:hidden">
          <div className="bg-white h-full flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="font-semibold">PDF Document</h2>
              <button
                onClick={() => setShowMobilePdf(false)}
                className="p-2 hover:bg-slate-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1">
              <iframe
                src={pdfUrl}
                className="w-full h-full"
                title="PDF Document"
              />
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* PDF Panel - Desktop */}
        <div className={`
          hidden lg:flex flex-col bg-white border-r border-slate-200 transition-all duration-300 ease-in-out
          ${isLeftPanelCollapsed ? 'w-0' : 'w-1/2 xl:w-2/5'}
          ${isLeftPanelCollapsed ? 'overflow-hidden' : 'overflow-visible'}
        `}>
          {!isLeftPanelCollapsed && (
            <>
              {/* PDF Panel Header */}
              <div className="p-4 border-b border-slate-200 bg-slate-50">
                <h2 className="font-semibold text-slate-800 flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  PDF Document
                </h2>
              </div>
              
              {/* PDF Content or Upload Area */}
              <div className="flex-1 flex flex-col">
                {!pdfUploaded ? (
                  <div className="flex-1 flex items-center justify-center p-8">
                    <div className="text-center max-w-sm">
                      <div className="mb-6">
                        <UploadButton
                          endpoint="pdfUploader"
                          onClientUploadComplete={(res) => {
                            console.log("Files: ", res);
                            if(res?.[0]?.serverData?.text) {
                              handleFile(res?.[0]?.serverData?.text, res?.[0]?.url)
                            }
                          }}
                          onUploadError={(error: Error) => {
                            alert(`ERROR! ${error.message}`);
                          }}
                          appearance={{
                            button: "ut-ready:bg-blue-600 ut-uploading:cursor-not-allowed ut-uploading:bg-blue-500 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors",
                            allowedContent: "text-xs text-slate-500 mt-2"
                          }}
                        />
                      </div>
                      
                      {(uploading || embedProgress) && (
                        <div className="text-center">
                          <div className="flex items-center justify-center gap-2 text-blue-600 mb-3">
                            <Loader2 className="w-5 h-5 animate-spin" />
                            <span className="text-sm">
                              {embedProgress ? getProgressMessage(embedProgress) : 'Processing PDF...'}
                            </span>
                          </div>
                          
                          {embedProgress && embedProgress.percentage !== undefined && (
                            <div className="w-full bg-slate-200 rounded-full h-2">
                              <div 
                                className={`h-2 rounded-full transition-all duration-300 ${getProgressBarColor(embedProgress.stage)}`}
                                style={{ width: `${embedProgress.percentage}%` }}
                              />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ) : pdfUrl ? (
                  <div className="flex-1">
                    <iframe
                      src={pdfUrl}
                      className="w-full h-full"
                      title="PDF Document"
                    />
                  </div>
                ) : (
                  <div className="flex-1 flex items-center justify-center text-slate-500">
                    <div className="text-center">
                      <FileText className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                      <p>PDF processed successfully</p>
                      <p className="text-sm">Viewer not available</p>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Chat Panel */}
        <div className="flex-1 flex flex-col bg-white">
          {/* Mobile Upload Area */}
          {isMobile && !pdfUploaded && (
            <div className="p-4 border-b border-slate-200 bg-slate-50">
              <div className="text-center">
                <UploadButton
                  endpoint="pdfUploader"
                  onClientUploadComplete={(res) => {
                    console.log("Files: ", res);
                    if(res?.[0]?.serverData?.text) {
                      handleFile(res?.[0]?.serverData?.text, res?.[0]?.url)
                    }
                  }}
                  onUploadError={(error: Error) => {
                    alert(`ERROR! ${error.message}`);
                  }}
                  appearance={{
                    button: "ut-ready:bg-blue-600 ut-uploading:cursor-not-allowed ut-uploading:bg-blue-500 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors w-full",
                    allowedContent: "text-xs text-slate-500 mt-2"
                  }}
                />
                
                {(uploading || embedProgress) && (
                  <div className="mt-4">
                    <div className="flex items-center justify-center gap-2 text-blue-600 mb-3">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span className="text-sm">
                        {embedProgress ? getProgressMessage(embedProgress) : 'Processing PDF...'}
                      </span>
                    </div>
                    
                    {embedProgress && embedProgress.percentage !== undefined && (
                      <div className="w-full bg-slate-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full transition-all duration-300 ${getProgressBarColor(embedProgress.stage)}`}
                          style={{ width: `${embedProgress.percentage}%` }}
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Status Indicator */}
          {pdfUploaded && !embedProgress && (
            <div className="bg-green-50 border-b border-green-200 p-3">
              <div className="flex items-center gap-2 text-green-700">
                <Check className="w-5 h-5" />
                <span className="text-sm font-medium">PDF uploaded and ready for questions</span>
              </div>
            </div>
          )}

          {/* Messages Container */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-4 space-y-6 max-w-4xl mx-auto w-full">
              {/* Welcome Message */}
              {messages.length === 0 && pdfUploaded && (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Bot className="w-8 h-8 text-blue-600" />
                  </div>
                  <h3 className="text-lg font-medium text-slate-600 mb-2">
                    Ready to answer your questions!
                  </h3>
                  <p className="text-slate-500">
                    Ask me anything about the content of your uploaded PDF.
                  </p>
                </div>
              )}

              {/* Messages */}
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-3xl rounded-2xl px-6 py-4 ${
                      message.type === 'user'
                        ? 'bg-blue-600 text-white ml-12'
                        : 'bg-slate-100 text-slate-800 mr-12'
                    }`}
                  >
                    {message.type === 'assistant' && (
                      <div className="flex items-center gap-2 mb-3">
                        <Bot className="w-5 h-5 text-blue-600" />
                        <span className="text-sm font-medium text-slate-600">Assistant</span>
                      </div>
                    )}
                    <div className="whitespace-pre-wrap break-words">
                      <AvatarSpeaker text={message.content} />
                    </div>
                    <div className={`text-xs opacity-70 mt-2 ${
                      message.type === 'user' ? 'text-blue-100' : 'text-slate-500'
                    }`}>
                      {message.timestamp.toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              ))}

              {/* Current Streaming Response */}
              {currentResponse && (
                <div className="flex justify-start">
                  <div className="max-w-3xl rounded-2xl px-6 py-4 bg-slate-100 text-slate-800 mr-12">
                    <div className="flex items-center gap-2 mb-3">
                      <Bot className="w-5 h-5 text-blue-600" />
                      <span className="text-sm font-medium text-slate-600">Assistant</span>
                      <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
                      {retryCount > 0 && (
                        <span className="text-xs text-amber-600 bg-amber-100 px-2 py-1 rounded">
                          Retry {retryCount}/3
                        </span>
                      )}
                    </div>
                    <div className="whitespace-pre-wrap break-words">
                      <AvatarSpeaker text={currentResponse} />
                    </div>
                  </div>
                </div>
              )}

              {/* Error Banner */}
              {error && !loading && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                  <div className="flex items-center gap-2 text-red-800">
                    <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm font-medium">Processing Error</span>
                  </div>
                  <p className="text-red-700 text-sm mt-1">{error}</p>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Input Form */}
          {pdfUploaded && (
            <div className="border-t border-slate-200 p-4 bg-white">
              <div className="max-w-4xl mx-auto">
                <div className="flex gap-3">
                  <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Ask a question about your PDF..."
                    className="flex-1 rounded-xl border border-slate-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-800 bg-white"
                    disabled={loading}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSubmit(e);
                      }
                    }}
                  />
                  <button
                    onClick={handleSubmit}
                    disabled={!input.trim() || loading}
                    className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors flex-shrink-0"
                  >
                    {loading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Send className="w-5 h-5" />
                    )}
                    <span className="hidden sm:inline">
                      {loading ? 'Thinking...' : 'Send'}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}