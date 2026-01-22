

import { GoogleGenAI, Chat } from "@google/genai";
import { AiModelId, VisualStyle, VisualLanguage, InfographicStyle, Citation, InfographicResult, FileNode } from '../types';
import { SYSTEM_INSTRUCTION, REVIEWER_SYSTEM_INSTRUCTION, EMBEDDING_MODEL } from '../constants';

let chatSession: Chat | null = null;
let ai: GoogleGenAI | null = null;

export const initializeGemini = (apiKey: string) => {
  if (!apiKey) return;
  ai = new GoogleGenAI({ apiKey });
};

export const startChatSession = async (
    modelId: AiModelId, 
    initialContext: string = "", 
    isReviewerMode: boolean = false,
    enableThinking: boolean = false
) => {
  if (!ai) throw new Error("AI not initialized. Please check your API Key.");
  
  // Select instruction based on mode
  const baseInstruction = isReviewerMode ? REVIEWER_SYSTEM_INSTRUCTION : SYSTEM_INSTRUCTION;
  
  // RAG context will be injected per-message, but we can put high-level structure here.
  const fullSystemInstruction = `${baseInstruction}\n\n${initialContext}`;

  // Enable Google Search tool for supported models (Gemini 3 and 2.5 series)
  const tools = (modelId.includes('gemini-3') || modelId.includes('gemini-2.5')) 
    ? [{ googleSearch: {} }] 
    : undefined;

  const config: any = {
      systemInstruction: fullSystemInstruction,
      temperature: isReviewerMode ? 0.3 : 0.5,
      tools: tools,
  };

  // Thinking Mode Configuration
  if (enableThinking && modelId === 'gemini-3-pro-preview') {
      config.thinkingConfig = { thinkingBudget: 32768 };
      // Note: Do NOT set maxOutputTokens when using thinkingConfig
  }

  chatSession = ai.chats.create({
    model: modelId,
    config: config,
  });
};

export const embedTexts = async (texts: string[]): Promise<number[][]> => {
  if (!ai) throw new Error("AI not initialized");
  
  try {
    // Determine batch size (Gemini API limit is usually 100 docs per request for embedContent)
    const BATCH_SIZE = 10; 
    const embeddings: number[][] = [];

    for (let i = 0; i < texts.length; i += BATCH_SIZE) {
      const batch = texts.slice(i, i + BATCH_SIZE);
      
      const batchPromises = batch.map(text => 
        ai!.models.embedContent({
          model: EMBEDDING_MODEL,
          contents: { parts: [{ text }] }
        })
      );

      const responses = await Promise.all(batchPromises);
      
      responses.forEach(response => {
        // Use 'embeddings' array from response (fix for type error)
        const embeddingValues = response.embeddings?.[0]?.values;
        if (embeddingValues) {
           embeddings.push(embeddingValues);
        } else {
           // Push empty array to maintain index alignment if needed, though robust RAG should handle filtering
           embeddings.push([]); 
        }
      });
    }
    return embeddings;
  } catch (error) {
    console.error("Embedding Error:", error);
    throw new Error("فشل في إنشاء Embeddings للنص. يرجى التأكد من صلاحية مفتاح API.");
  }
};

export const sendMessageToGemini = async (
    message: string, 
    context: string = "", 
    image?: { data: string, mimeType: string }
): Promise<string> => {
  if (!chatSession) throw new Error("Chat session not started");

  try {
    // Inject RAG context into the message
    const msgWithContext = context 
      ? `--- Relevant Context ---\n${context}\n\n--- User Question ---\n${message}` 
      : message;

    let messagePayload: any = msgWithContext;

    if (image) {
        messagePayload = [
            { text: msgWithContext },
            {
                inlineData: {
                    mimeType: image.mimeType,
                    data: image.data
                }
            }
        ];
    }

    const response = await chatSession.sendMessage({ message: messagePayload });
    let text = response.text || "لم أتمكن من توليد إجابة نصية.";

    // Handle Search Grounding (Google Search)
    const groundingMetadata = response.candidates?.[0]?.groundingMetadata;
    if (groundingMetadata?.groundingChunks) {
      const uniqueSources = new Map<string, string>();
      
      groundingMetadata.groundingChunks.forEach((chunk: any) => {
        if (chunk.web?.uri && chunk.web?.title) {
          uniqueSources.set(chunk.web.uri, chunk.web.title);
        }
      });

      if (uniqueSources.size > 0) {
        text += "\n\n**المصادر (Google Search):**\n";
        uniqueSources.forEach((title, uri) => {
          text += `- [${title}](${uri})\n`;
        });
      }
    }

    return text;
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    if (error.message?.includes('429')) {
       throw new Error("تم تجاوز حد الطلبات (Rate Limit). يرجى الانتظار قليلاً.");
    }
    throw new Error("حدث خطأ أثناء الاتصال بـ Gemini AI.");
  }
};

// --- Image Generation for Architecture ---

export const generateInfographic = async (
    repoName: string,
    fileTreePaths: string[],
    style: VisualStyle,
    is3D: boolean,
    language: VisualLanguage
): Promise<string> => {
    if (!ai) throw new Error("AI not initialized");

    const structureSummary = fileTreePaths.join('\n');
    
    let visualStylePrompt = "";
    if (is3D) {
        visualStylePrompt = "Visual Style: Photorealistic Miniature Diorama, Isometric view, Tilt-shift depth of field, Volumetric lighting, 3D Render.";
    } else {
        switch (style) {
            case 'Blueprint':
                visualStylePrompt = "Visual Style: Technical architectural blueprint, dark blue background, white hand-drawn lines, technical annotations, grid background.";
                break;
            case 'Neon Cyberpunk':
                visualStylePrompt = "Visual Style: Dark mode, glowing neon nodes, high contrast, futuristic cyberpunk aesthetic, data streams.";
                break;
            case 'Modern':
            default:
                visualStylePrompt = "Visual Style: Modern, clean, flat vector illustration, pastel technical colors, high readability, Infographic style.";
                break;
        }
    }

    const prompt = `
    Generate a high-quality architectural visualization infographic for a software repository named "${repoName}".

    ${visualStylePrompt}

    Content Requirements:
    - The image should visually represent the file structure and module relationships based on the provided file list.
    - Treat folders as containers/buildings and files as components/blocks.
    - Connect related modules with lines or pipes.
    - IMPORTANT: All text labels, titles, and explanations inside the diagram MUST be translated to ${language}.

    Repository Structure Context:
    ${structureSummary}
    `;

    try {
        // Using 'gemini-3-pro-image-preview' for high quality 2K images
        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-image-preview',
            contents: { parts: [{ text: prompt }] },
            config: {
                imageConfig: {
                    aspectRatio: "16:9",
                    imageSize: "2K"
                }
            }
        });

        // Iterate through parts to find the image
        if (response.candidates?.[0]?.content?.parts) {
            for (const part of response.candidates[0].content.parts) {
                if (part.inlineData && part.inlineData.data) {
                    return part.inlineData.data;
                }
            }
        }

        throw new Error("No image data found in response.");
    } catch (error: any) {
        console.error("Image Generation Error:", error);
        throw new Error(`Failed to generate infographic: ${error.message}`);
    }
};

// --- Article to Infographic (Two-Stage) ---

export const generateArticleInfographic = async (
    url: string,
    style: InfographicStyle,
    language: VisualLanguage,
    onProgress: (stage: string) => void
): Promise<{ imageData: string; citations: Citation[]; summary: string }> => {
    if (!ai) throw new Error("AI not initialized");

    // --- Phase 1: The Planner (Analysis & Grounding) ---
    onProgress("Analyzing content & Extracting facts...");

    const plannerPrompt = `
    I need you to analyze the content at the following URL: ${url}
    
    Task:
    1. Extract the Core Headline.
    2. Extract 3-5 Key Takeaways or Steps.
    3. Find specific supporting data points (%, numbers, dates).
    4. Suggest a specific "Visual Metaphor" (e.g., a roadmap, a funnel, a comparison chart, an iceberg).
    
    Output Language: ${language}
    `;

    // Use Gemini 3 Pro for search capabilities
    const plannerResponse = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: { parts: [{ text: plannerPrompt }] },
        config: {
            tools: [{ googleSearch: {} }],
        }
    });

    const plannerText = plannerResponse.text;
    if (!plannerText) throw new Error("Failed to analyze the article content.");

    // Extract Citations from Grounding Metadata
    const citations: Citation[] = [];
    const groundingMetadata = plannerResponse.candidates?.[0]?.groundingMetadata;
    
    if (groundingMetadata?.groundingChunks) {
        groundingMetadata.groundingChunks.forEach((chunk: any) => {
            if (chunk.web?.uri && chunk.web?.title) {
                // Deduplicate based on URI
                if (!citations.some(c => c.uri === chunk.web.uri)) {
                    citations.push({ uri: chunk.web.uri, title: chunk.web.title });
                }
            }
        });
    }

    // --- Phase 2: The Artist (Visual Synthesis) ---
    onProgress("Designing Infographic...");

    let visualStyleInstruction = "";
    switch (style) {
        case 'Modern Editorial':
            visualStyleInstruction = "Visual Style: Flat vector illustration, clean lines, plenty of whitespace, professional magazine aesthetic, pastel color palette with one accent color.";
            break;
        case 'Fun & Playful':
            visualStyleInstruction = "Visual Style: Vibrant colors, rounded organic shapes, 3D clay-style icons, friendly and approachable tone.";
            break;
        case 'Dark Mode Tech':
            visualStyleInstruction = "Visual Style: Dark background (black/slate), glowing neon data points, cyber-security aesthetic, futuristic UI elements.";
            break;
        case 'Minimalist':
            visualStyleInstruction = "Visual Style: Swiss design style, grid-based, high contrast typography, very few colors (black, white, red), abstract geometric shapes.";
            break;
        case 'Sketch Note':
            visualStyleInstruction = "Visual Style: Hand-drawn look, pencil/marker texture, whiteboard background, doodles and arrows.";
            break;
        default:
            visualStyleInstruction = "Visual Style: Professional Infographic, clean and high readability.";
    }

    const artistPrompt = `
    Create a professional educational infographic.
    
    ${visualStyleInstruction}
    Target Language for Text: ${language}
    
    Structure the infographic based on this analysis plan:
    ${plannerText}
    
    Requirements:
    - Title should be prominent at the top.
    - Visualize the key takeaways clearly.
    - Ensure text labels are legible and in ${language}.
    - Do not make the image too cluttered.
    `;

    const imageResponse = await ai.models.generateContent({
        model: 'gemini-3-pro-image-preview',
        contents: { parts: [{ text: artistPrompt }] },
        config: {
            imageConfig: {
                aspectRatio: "3:4", // Portrait for infographics
                imageSize: "2K"
            }
        }
    });

    let imageData = "";
    if (imageResponse.candidates?.[0]?.content?.parts) {
        for (const part of imageResponse.candidates[0].content.parts) {
            if (part.inlineData && part.inlineData.data) {
                imageData = part.inlineData.data;
                break;
            }
        }
    }

    if (!imageData) throw new Error("Failed to generate infographic image.");

    return {
        imageData,
        citations,
        summary: plannerText
    };
};

// --- Dev Studio Context Question ---

export const askNodeSpecificQuestion = async (
    nodeLabel: string,
    question: string,
    fileTree: FileNode[]
): Promise<string> => {
    if (!ai) throw new Error("AI not initialized");

    // Convert file tree slice to string context
    // We filter to keep context minimal but useful (paths only)
    const fileTreeContext = fileTree
        .slice(0, 300) // Limit to avoid massive tokens
        .map(f => f.path)
        .join('\n');

    const prompt = `
    You are a Senior Software Architect assisting a developer in a "Dev Studio" environment.
    
    Context:
    The user is exploring the codebase. They have selected the module/file: "${nodeLabel}".
    
    Project Structure (Partial):
    ${fileTreeContext}
    
    User Question about ${nodeLabel}:
    "${question}"
    
    Task:
    Answer the question specifically regarding this module's likely responsibilities, relationships with other files, and purpose based on the name and project structure.
    If the question is about code content (logic), explain that you are analyzing based on structure and naming conventions unless content was previously provided.
    
    Keep the answer technical, concise, and helpful.
    `;

    const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview', // Strong text model
        contents: { parts: [{ text: prompt }] },
        config: {
            systemInstruction: "You are an expert code architect. Be specific and insightful.",
        }
    });

    return response.text || "Could not generate analysis.";
};
