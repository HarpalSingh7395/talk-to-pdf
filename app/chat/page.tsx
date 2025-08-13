"use client";
import { useState, useRef, useEffect } from "react";
import { Bot, Send, FileText, Loader2, Check, X, ChevronLeft, ChevronRight, Upload, User, AlertCircle } from "lucide-react";
import { AvatarSpeaker } from "@/components/AvatarSpeaker";
import { UploadButton } from "@uploadthing/react";
import Header from "@/components/Navbar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useUser } from "@clerk/nextjs";

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
    const { user } = useUser()
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
                        console.log({ line })
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
        <div className="flex flex-col h-screen bg-gray-50">
            {/* Header */}
            <Header />

            {/* Processing Progress Bar */}
            {embedProgress && (
                <div className="bg-white border-b border-gray-200 px-6 py-4 shadow-sm">
                    <div className="max-w-4xl mx-auto">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                                <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                            </div>
                            <div className="flex-1">
                                <p className="text-sm font-medium text-gray-900">
                                    {getProgressMessage(embedProgress)}
                                </p>
                                {embedProgress.percentage !== undefined && (
                                    <p className="text-xs text-gray-500 mt-1">
                                        {embedProgress.percentage}% complete
                                    </p>
                                )}
                            </div>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                                className={`h-2 rounded-full transition-all duration-500 ${getProgressBarColor(embedProgress.stage)}`}
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
                <div className="fixed inset-0 z-50 bg-black/50 lg:hidden">
                    <div className="bg-white h-full flex flex-col">
                        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white">
                            <h2 className="font-semibold text-gray-900">PDF Document</h2>
                            <button
                                onClick={() => setShowMobilePdf(false)}
                                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                <X className="w-5 h-5 text-gray-500" />
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
          hidden lg:flex flex-col bg-white border-r border-gray-200 transition-all duration-300 ease-in-out shadow-sm
          ${isLeftPanelCollapsed ? 'w-0' : 'w-1/2 xl:w-2/5'}
          ${isLeftPanelCollapsed ? 'overflow-hidden' : 'overflow-visible'}
        `}>
                    {!isLeftPanelCollapsed && (
                        <>
                            {/* PDF Panel Header */}
                            <div className="p-4 border-b border-gray-200 bg-gray-50">
                                <div className="flex items-center justify-between">
                                    <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                                        <div className="w-6 h-6 bg-blue-600 rounded-lg flex items-center justify-center">
                                            <FileText className="w-4 h-4 text-white" />
                                        </div>
                                        PDF Document
                                    </h2>
                                    <button
                                        onClick={toggleLeftPanel}
                                        className="p-1.5 hover:bg-gray-200 rounded-lg transition-colors"
                                        title="Hide PDF panel"
                                    >
                                        <ChevronLeft className="w-4 h-4 text-gray-500" />
                                    </button>
                                </div>
                            </div>

                            {/* PDF Content or Upload Area */}
                            <div className="flex-1 flex flex-col">
                                {!pdfUploaded ? (
                                    <div className="flex-1 flex items-center justify-center p-8">
                                        <div className="text-center max-w-sm">
                                            <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                                                <Upload className="w-8 h-8 text-blue-600" />
                                            </div>
                                            <h3 className="text-lg font-semibold text-gray-900 mb-2">
                                                Upload your PDF
                                            </h3>
                                            <p className="text-gray-600 mb-6 text-sm">
                                                Choose a PDF file to start chatting with your document
                                            </p>

                                            <UploadButton
                                                endpoint="pdfUploader"
                                                onClientUploadComplete={(res) => {
                                                    console.log("Files: ", res);
                                                    if (res?.[0]?.serverData?.text) {
                                                        handleFile(res?.[0]?.serverData?.text, res?.[0]?.url)
                                                    }
                                                }}
                                                onUploadError={(error: Error) => {
                                                    alert(`ERROR! ${error.message}`);
                                                }}
                                                appearance={{
                                                    button: "ut-ready:bg-blue-600 ut-uploading:cursor-not-allowed ut-uploading:bg-blue-500 bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-xl transition-colors shadow-sm w-full",
                                                    allowedContent: "text-xs text-gray-500 mt-3"
                                                }}
                                            />

                                            {(uploading || embedProgress) && (
                                                <div className="mt-6 p-4 bg-blue-50 rounded-xl border border-blue-200">
                                                    <div className="flex items-center justify-center gap-2 text-blue-700 mb-3">
                                                        <Loader2 className="w-5 h-5 animate-spin" />
                                                        <span className="text-sm font-medium">
                                                            {embedProgress ? getProgressMessage(embedProgress) : 'Processing PDF...'}
                                                        </span>
                                                    </div>

                                                    {embedProgress && embedProgress.percentage !== undefined && (
                                                        <div className="w-full bg-blue-200 rounded-full h-2">
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
                                    <div className="flex-1 flex items-center justify-center text-gray-500">
                                        <div className="text-center">
                                            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                                <FileText className="w-8 h-8 text-gray-400" />
                                            </div>
                                            <p className="font-medium text-gray-600">PDF processed successfully</p>
                                            <p className="text-sm text-gray-500 mt-1">Preview not available</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </>
                    )}

                    {/* Collapsed panel toggle */}
                    {isLeftPanelCollapsed && pdfUploaded && (
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 z-10">
                            <button
                                onClick={toggleLeftPanel}
                                className="bg-white border border-gray-300 p-2 rounded-r-lg shadow-sm hover:bg-gray-50 transition-colors"
                                title="Show PDF panel"
                            >
                                <ChevronRight className="w-4 h-4 text-gray-600" />
                            </button>
                        </div>
                    )}
                </div>

                {/* Chat Panel */}
                <div className="flex-1 flex flex-col bg-white">
                    {/* Mobile Upload Area */}
                    {isMobile && !pdfUploaded && (
                        <div className="p-6 border-b border-gray-200 bg-white">
                            <div className="text-center">
                                <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                    <Upload className="w-8 h-8 text-blue-600" />
                                </div>
                                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                                    Upload your PDF
                                </h3>
                                <p className="text-gray-600 mb-6 text-sm">
                                    Choose a PDF file to start asking questions
                                </p>

                                <UploadButton
                                    endpoint="pdfUploader"
                                    onClientUploadComplete={(res) => {
                                        console.log("Files: ", res);
                                        if (res?.[0]?.serverData?.text) {
                                            handleFile(res?.[0]?.serverData?.text, res?.[0]?.url)
                                        }
                                    }}
                                    onUploadError={(error: Error) => {
                                        alert(`ERROR! ${error.message}`);
                                    }}
                                    appearance={{
                                        button: "ut-ready:bg-blue-600 ut-uploading:cursor-not-allowed ut-uploading:bg-blue-500 bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-xl transition-colors w-full shadow-sm",
                                        allowedContent: "text-xs text-gray-500 mt-3"
                                    }}
                                />

                                {(uploading || embedProgress) && (
                                    <div className="mt-6 p-4 bg-blue-50 rounded-xl border border-blue-200">
                                        <div className="flex items-center justify-center gap-2 text-blue-700 mb-3">
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                            <span className="text-sm font-medium">
                                                {embedProgress ? getProgressMessage(embedProgress) : 'Processing PDF...'}
                                            </span>
                                        </div>

                                        {embedProgress && embedProgress.percentage !== undefined && (
                                            <div className="w-full bg-blue-200 rounded-full h-2">
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

                    {/* Mobile PDF Toggle */}
                    {isMobile && pdfUploaded && (
                        <div className="p-4 border-b border-gray-200 bg-white lg:hidden">
                            <button
                                onClick={() => setShowMobilePdf(!showMobilePdf)}
                                className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors text-gray-700"
                            >
                                <FileText className="w-4 h-4" />
                                <span className="font-medium">View PDF Document</span>
                            </button>
                        </div>
                    )}

                    {/* Status Indicator */}
                    {pdfUploaded && !embedProgress && (
                        <div className="bg-green-50 border-b border-green-200 p-4">
                            <div className="flex items-center gap-3 max-w-4xl mx-auto">
                                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                                    <Check className="w-5 h-5 text-green-600" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-green-800">PDF ready for questions</p>
                                    <p className="text-xs text-green-600">You can now ask me anything about your document</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Messages Container */}
                    <div className="flex-1 overflow-y-auto bg-gray-50">
                        <div className="p-6 space-y-6 max-w-4xl mx-auto w-full">
                            {/* Welcome Message */}
                            {messages.length === 0 && pdfUploaded && (
                                <div className="text-center py-16">
                                    <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                                        <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
                                            <FileText className="w-6 h-6 text-white" />
                                        </div>
                                    </div>
                                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                                        Ready to help!
                                    </h3>
                                    <p className="text-gray-600 max-w-md mx-auto">
                                        I've analyzed your PDF and I'm ready to answer any questions you have about its content.
                                    </p>
                                </div>
                            )}

                            {/* Messages */}
                            {messages.map((message) => (
                                <div
                                    key={message.id}
                                    className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                                >
                                    {message.type === 'user' ? (
                                        <div className="flex items-end gap-3 max-w-2xl">
                                            <div className="bg-blue-600 text-white rounded-2xl px-6 py-4 shadow-sm">
                                                <p className="whitespace-pre-wrap break-words">{message.content}</p>
                                                <div className="text-xs text-blue-100 mt-2 opacity-75">
                                                    {message.timestamp.toLocaleTimeString([], {
                                                        hour: '2-digit',
                                                        minute: '2-digit'
                                                    })}
                                                </div>
                                            </div>
                                            <Avatar>
                                                <AvatarImage src={user?.imageUrl} alt="Kelly King" />
                                                <AvatarFallback>{user?.fullName}</AvatarFallback>
                                            </Avatar>
                                        </div>
                                    ) : (
                                        <div className="max-w-3xl">
                                            <AvatarSpeaker text={message.content} />
                                            <div className="text-xs text-gray-400 mt-2 ml-14">
                                                {message.timestamp.toLocaleTimeString([], {
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}

                            {/* Current Streaming Response */}
                            {currentResponse && (
                                <div className="flex justify-start">
                                    <div className="max-w-3xl">
                                        <div className="flex items-start gap-4 p-6 bg-white rounded-xl border border-gray-100 shadow-sm">
                                            <div className="relative flex-shrink-0">
                                                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                                                    <div className="w-6 h-6 bg-blue-600 rounded-lg flex items-center justify-center">
                                                        <FileText className="w-4 h-4 text-white" />
                                                    </div>
                                                </div>
                                                <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full">
                                                    <div className="absolute inset-0 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                                </div>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-3">
                                                    <span className="text-sm font-medium text-gray-900">AI Assistant</span>
                                                    {retryCount > 0 && (
                                                        <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-amber-100 text-amber-800 rounded-full">
                                                            Retry {retryCount}/3
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="prose prose-sm max-w-none text-gray-800 leading-relaxed">
                                                    <p>{currentResponse}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Error Banner */}
                            {error && !loading && (
                                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                                    <div className="flex items-start gap-3">
                                        <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                                        <div>
                                            <h4 className="text-sm font-medium text-red-800">Processing Error</h4>
                                            <p className="text-sm text-red-700 mt-1">{error}</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div ref={messagesEndRef} />
                        </div>
                    </div>

                    {/* Input Form */}
                    {pdfUploaded && (
                        <div className="border-t border-gray-200 p-6 bg-white">
                            <div className="max-w-4xl mx-auto">
                                <div className="flex gap-3">
                                    <div className="flex-1 relative">
                                        <input
                                            ref={inputRef}
                                            type="text"
                                            value={input}
                                            onChange={(e) => setInput(e.target.value)}
                                            placeholder="Ask a question about your PDF..."
                                            className="w-full rounded-xl border border-gray-300 px-4 py-3 pr-12 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white shadow-sm placeholder-gray-500"
                                            disabled={loading}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' && !e.shiftKey) {
                                                    e.preventDefault();
                                                    handleSubmit(e);
                                                }
                                            }}
                                        />
                                    </div>
                                    <button
                                        onClick={handleSubmit}
                                        disabled={!input.trim() || loading}
                                        className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors flex-shrink-0 shadow-sm font-medium"
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