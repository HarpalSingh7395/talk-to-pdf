import { Chroma } from "@langchain/community/vectorstores/chroma";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";

let chroma: Chroma;

export async function getVectorStore() {
    if (!chroma) {
        const chromaUrl = process.env.CHROMA_URL || "https://api.trychroma.com";
        chroma = await Chroma.fromDocuments([], new GoogleGenerativeAIEmbeddings(), {
            collectionName: 'pdf-data',
            url: chromaUrl,
            collectionMetadata: {
                description: "PDF document embeddings"
            },
            clientParams: {
                // For Chroma Cloud, authentication might use different header format
                headers: {
                    "X-Chroma-Token": process.env.CHROMA_API_KEY, // Try this instead of Bearer
                    "Content-Type": "application/json",
                },
                auth: {
                    provider: "token",
                    credentials: process.env.CHROMA_API_KEY,
                    tokenHeaderType: "AUTHORIZATION",
                },
                // Add tenant and database if using Chroma Cloud
                tenant: process.env.CHROMA_TENANT || "default_tenant",
                database: process.env.CHROMA_DATABASE || "default_database",
            }
        });
    }
    return chroma;
}