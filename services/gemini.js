/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { GoogleGenAI, GenerateContentResponse, Modality } from "@google/genai";
import { RagStore, Document, QueryResult, CustomMetadata, supportedLanguages, LanguageCode, DocumentWithStore } from '../types';

/**
 * Creates a new GoogleGenAI instance.
 * This should be called before each API request to ensure the most up-to-date API key is used.
 */
function getAI() {
    return new GoogleGenAI({ apiKey: process.env.API_KEY });
}

export interface ApiError {
    message: string;
    isApiKeyError: boolean;
}

/**
 * Interprets common API errors and returns a structured error object.
 * @param error The error object caught from an API call.
 * @returns A structured error object, or null if the error is not a recognized API key/permission issue.
 */
export function getApiErrorDetails(error: any): ApiError | null {
    const defaultMessage = "Upload failed. This is commonly caused by an invalid API key or one that lacks the necessary permissions (e.g., 'Vertex AI API' not enabled in the Google Cloud project). Please verify your API key and permissions.";

    if (!error) return null;

    const errorMessage = (error instanceof Error ? error.message : String(error)).toLowerCase();

    if (
        errorMessage.includes('api key not valid') ||
        errorMessage.includes('requested entity was not found') ||
        errorMessage.includes('failed to get upload url') ||
        errorMessage.includes('permission denied')
    ) {
        return { message: defaultMessage, isApiKeyError: true };
    }

    return null;
}

async function delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function listRagStores(): Promise<RagStore[]> {
    const ai = getAI();
    const response = await ai.fileSearchStores.list();
    const stores: RagStore[] = [];
    for await (const store of response) {
        if (store.name && store.displayName) {
            stores.push({ name: store.name, displayName: store.displayName });
        }
    }
    return stores;
}

export async function listAllDocuments(): Promise<DocumentWithStore[]> {
    const ai = getAI();

    // 1. Get all stores to map names to display names
    const stores = await listRagStores();
    const storeMap = new Map<string, string>();
    stores.forEach(store => storeMap.set(store.name, store.displayName));

    // 2. Get all files
    const response = await ai.files.list();
    const documents: DocumentWithStore[] = [];

    for await (const doc of response) {
        const docName = doc.name; // e.g., ragStores/store-123/files/file-456
        if (docName) {
            const parts = docName.split('/');
            if (parts.length >= 3 && parts[0] === 'ragStores' && parts[2] === 'files') {
                const storeName = `${parts[0]}/${parts[1]}`;
                const storeDisplayName = storeMap.get(storeName) || parts[1]; // Fallback to ID if not found
                documents.push({
                    ...(doc as Document),
                    storeName: storeName,
                    storeDisplayName: storeDisplayName,
                });
            }
        }
    }
    return documents;
}

// FIX: Add missing 'listDocumentsInStore' function to resolve call in VersionControlView.
export async function listDocumentsInStore(storeName: string): Promise<DocumentWithStore[]> {
    const allDocs = await listAllDocuments();
    return allDocs.filter(doc => doc.storeName === storeName);
}

export async function createRagStore(displayName: string): Promise<string> {
    const ai = getAI();
    const ragStore = await ai.fileSearchStores.create({ config: { displayName } });
    if (!ragStore.name) {
        throw new Error("Failed to create RAG store: name is missing.");
    }
    return ragStore.name;
}

export async function uploadToRagStore(ragStoreName: string, file: File): Promise<void> {
    const ai = getAI();

    // FIX: The 'mimeType' property is not a valid parameter for 'uploadToFileSearchStore'.
    // It should be nested within a 'config' object.
    let op = await ai.fileSearchStores.uploadToFileSearchStore({
        fileSearchStoreName: ragStoreName,
        file: file,
        config: {
            mimeType: file.type
        }
    });

    while (!op.done) {
        await delay(3000);
        op = await ai.operations.get({operation: op});
    }
}

export async function uploadDocument(ragStoreName: string, file: File, metadata: CustomMetadata[]): Promise<void> {
    const ai = getAI();

    // FIX: The 'customMetadata' and 'mimeType' properties are not valid parameters for 'uploadToFileSearchStore'.
    // They should be nested within a 'config' object.
    let op = await ai.fileSearchStores.uploadToFileSearchStore({
        fileSearchStoreName: ragStoreName,
        file: file,
        config: {
            customMetadata: metadata,
            mimeType: file.type,
        }
    });

    while (!op.done) {
        await delay(3000);
        op = await ai.operations.get({operation: op});
    }
}

export async function fileSearch(ragStoreName: string, query: string, language: LanguageCode): Promise<QueryResult> {
    const ai = getAI();
    const languageName = supportedLanguages[language] || 'the user\'s query language';
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `${query}\n\nIMPORTANT: Please respond in ${languageName}. DO NOT ASK THE USER TO READ THE MANUAL, pinpoint the relevant sections in the response itself.`,
        config: {
            tools: [
                    {
                        fileSearch: {
                            fileSearchStoreNames: [ragStoreName],
                        }
                    }
                ]
        }
    });

    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    return {
        text: response.text,
        groundingChunks: groundingChunks,
    };
}

export async function generateExampleQuestions(ragStoreName: string, language: LanguageCode): Promise<string[]> {
    const ai = getAI();
    const languageName = supportedLanguages[language] || 'English';
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `You are provided with Standard Operating Procedure (SOP) documents from a manufacturing environment. For each document, generate 4 short and practical example questions a user might ask about the procedures in ${languageName}. Return the questions as a JSON array of objects. Each object should have a 'product' key (representing the SOP topic, e.g., 'Machine Calibration') and a 'questions' key with an array of 4 question strings. For example: \`\`\`json[{\"product\": \"Machine Calibration SOP\", \"questions\": [\"What is the first step in calibration?\", \"How often should this machine be calibrated?\"]}, {\"product\": \"Assembly Line Safety\", \"questions\": [\"What personal protective equipment is required?\", \"What is the emergency shutdown procedure?\"]}]\`\`\``,
            config: {
                tools: [
                    {
                        fileSearch: {
                            fileSearchStoreNames: [ragStoreName],
                        }
                    }
                ]
            }
        });

        let jsonText = response.text.trim();

        const jsonMatch = jsonText.match(/```json\n([\s\S]*?)\n```/);
        if (jsonMatch && jsonMatch[1]) {
            jsonText = jsonMatch[1];
        } else {
            const firstBracket = jsonText.indexOf('[');
            const lastBracket = jsonText.lastIndexOf(']');
            if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
                jsonText = jsonText.substring(firstBracket, lastBracket + 1);
            }
        }

        const parsedData = JSON.parse(jsonText);

        if (Array.isArray(parsedData)) {
            if (parsedData.length === 0) {
                return [];
            }
            const firstItem = parsedData[0];

            if (typeof firstItem === 'object' && firstItem !== null && 'questions' in firstItem && Array.isArray(firstItem.questions)) {
                return parsedData.flatMap(item => (item.questions || [])).filter(q => typeof q === 'string');
            }

            if (typeof firstItem === 'string') {
                return parsedData.filter(q => typeof q === 'string');
            }
        }

        console.warn("Received unexpected format for example questions:", parsedData);
        return [];
    } catch (error) {
        console.error("Failed to generate or parse example questions:", error);
        return [];
    }
}

export async function generateSpeech(text: string): Promise<string> {
    const ai = getAI();
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-preview-tts",
            contents: [{ parts: [{ text: text }] }],
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: { voiceName: 'Zephyr' },
                    },
                },
            },
        });

        const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (!base64Audio) {
            throw new Error("No audio data received from API.");
        }
        return base64Audio;
    } catch (error) {
        console.error("Error generating speech:", error);
        throw error; // Re-throw to be caught by the caller
    }
}

export async function deleteRagStore(ragStoreName: string): Promise<void> {
    const ai = getAI();
    await ai.fileSearchStores.delete({
        name: ragStoreName,
        config: { force: true },
    });
}


export async function deleteDocument(documentName: string): Promise<void> {
    const ai = getAI();
    await ai.files.delete({ name: documentName });
}