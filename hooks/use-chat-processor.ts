import { useState, useCallback } from "react";

type Message = {
  id: string;
  type: "user" | "assistant";
  content: string;
  timestamp: Date;
};

export function useChatProcessor() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentResponse, setCurrentResponse] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  const processQuestion = useCallback(
    async function processQuestion(question: string, attempt = 1) {
      const maxAttempts = 3;
      setLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          body: JSON.stringify({ question }),
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
        let fullResponse = "";

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split("\n");

            for (const line of lines) {
              let textToAdd = "";

              if (line.startsWith("data: ")) {
                try {
                  const jsonStr = line.slice(6);
                  if (jsonStr.trim() === "[DONE]") continue;
                  const parsed = JSON.parse(jsonStr);
                  textToAdd = parsed.text || parsed.content || parsed.delta?.content || "";
                } catch {
                  textToAdd = line.slice(6);
                }
              } else if (line.startsWith("{") && line.endsWith("}")) {
                try {
                  const parsed = JSON.parse(line);
                  textToAdd = parsed.text || parsed.content || parsed.delta?.content || "";
                } catch {
                  textToAdd = line;
                }
              } else if (line.trim()) {
                textToAdd = line;
              }

              if (textToAdd) {
                fullResponse += textToAdd;
                setCurrentResponse((prev) => prev + textToAdd);
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
          error.name === "TypeError";

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
    },
    []
  );

  const askQuestion = useCallback(
    (question: string) => {
      const userMessage: Message = {
        id: Date.now().toString(),
        type: "user",
        content: question,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMessage]);
      processQuestion(question);
    },
    [processQuestion]
  );

  return {
    messages,
    currentResponse,
    error,
    loading,
    retryCount,
    askQuestion,
  };
}
