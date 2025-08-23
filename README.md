# Talk To PDF

Talk To PDF is a web application that allows you to have conversations with your PDF documents. Upload a PDF and start asking questions, getting summaries, and finding information instantly. This project leverages the power of Large Language Models (LLMs) and Retrieval-Augmented Generation (RAG) to provide a seamless and interactive experience.

## Features

*   **Interactive Chat Interface:** Ask questions in natural language and get intelligent, context-aware answers.
*   **PDF Upload and Processing:** Easily upload your PDF files. The application processes the text and prepares it for analysis.
*   **Secure and Private:** Your documents are processed securely. (Note: Add details about your privacy policy if applicable).
*   **User Authentication:** Secure sign-in and user management powered by Clerk.
*   **Streaming Responses:** Get real-time answers from the AI, character by character.
*   **Text-to-Speech:** Listen to the AI's responses with integrated text-to-speech functionality.

## Tech Stack

This project is built with a modern, robust technology stack:

*   **Framework:** [Next.js](https://nextjs.org/) – The React framework for production.
*   **Authentication:** [Clerk](https://clerk.com/) – For easy and secure user authentication.
*   **File Uploads:** [UploadThing](https://uploadthing.com/) – For handling file uploads and storage.
*   **AI & LLM:** [Google Gemini](https://ai.google.dev/) via [AI SDK](https://sdk.vercel.ai/) – Powering the conversational AI.
*   **Vector Database:** [ChromaDB](https://www.trychroma.com/) – For efficient similarity search on PDF content.
*   **Text Splitting & Processing:** [LangChain](https://www.langchain.com/) – Used for text splitting and document processing.
*   **Text-to-Speech:** [ElevenLabs](https://elevenlabs.io/) – For generating high-quality audio from text.
*   **Styling:** [Tailwind CSS](https://tailwindcss.com/) – A utility-first CSS framework.

## Getting Started

Follow these instructions to get a local copy of the project up and running.

### Prerequisites

*   Node.js (v18 or later)
*   pnpm (or npm/yarn)

### Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/talk-to-pdf.git
    cd talk-to-pdf
    ```

2.  **Install dependencies:**
    ```bash
    pnpm install
    ```

3.  **Set up environment variables:**

    Create a `.env.local` file in the root of your project and add the necessary environment variables. You will need API keys from Clerk, UploadThing, Google AI, and ElevenLabs.

    ```env
    # Clerk Authentication
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
    CLERK_SECRET_KEY=

    # UploadThing
    UPLOADTHING_SECRET=
    UPLOADTHING_APP_ID=

    # Google AI (Gemini)
    GOOGLE_API_KEY=

    # ElevenLabs API Key
    ELEVENLABS_API_KEY=
    ```

4.  **Run the development server:**
    ```bash
    pnpm dev
    ```

Open [http://localhost:3000](http://localhost:3000) in your browser to see the application.

## How It Works

The application follows a Retrieval-Augmented Generation (RAG) architecture:

1.  **Upload:** The user uploads a PDF file.
2.  **Processing:** The backend extracts the text from the PDF.
3.  **Chunking:** The text is split into smaller, manageable chunks.
4.  **Embedding:** Each chunk is converted into a vector embedding using an AI model.
5.  **Storage:** The embeddings are stored in a ChromaDB vector database.
6.  **Querying:** When a user asks a question, the question is also embedded.
7.  **Retrieval:** The application performs a similarity search in ChromaDB to find the most relevant text chunks from the PDF.
8.  **Generation:** The retrieved chunks are passed to the Google Gemini model along with the user's question. The model uses this context to generate a relevant and accurate answer.
9.  **Streaming:** The answer is streamed back to the user in real-time.

## Deployment

The easiest way to deploy this Next.js application is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme).

Check out the [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## License

This project is licensed under the MIT License. See the `LICENSE` file for details.
