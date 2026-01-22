
import { GoogleGenAI } from "@google/genai";
import { Challenge, SubmissionResult, ContextSource, AiModelId } from '../types';

let aiClient: GoogleGenAI | null = null;

export const initSkillForgeService = (apiKey: string) => {
    aiClient = new GoogleGenAI({ apiKey });
};

// Helper to clean Markdown code blocks from JSON strings
const cleanJson = (text: string) => {
    return text.replace(/```json\n?|\n?```/g, '').trim();
};

const CHALLENGE_SYSTEM_PROMPT = `
You are "SkillForge", an advanced AI Technical Mentor.
Your goal is to generate "Active Learning" challenges based on the provided context (Code or Video Transcript).

**Modes:**
1. If context is **Code**: Create a 'CODE_FIX' (find the bug) or 'IMPLEMENTATION' (optimize/refactor) challenge.
2. If context is **Transcript**: Create a 'QUIZ' (conceptual check) or 'IMPLEMENTATION' (write code based on the theory explained).

**Output Format:**
Return ONLY a JSON object matching this structure:
{
  "type": "QUIZ|CODE_FIX|IMPLEMENTATION",
  "difficulty": "Novice|Intermediate|Expert",
  "question": "Short title of the challenge",
  "description": "Detailed instructions on what to do.",
  "startingSnippet": "Code to start with (if applicable, otherwise null)",
  "options": ["Option A", "Option B", "Option C"] (Only for QUIZ),
  "relatedTags": ["React", "Security", "Algorithms"],
  "xpPoints": 50
}
`;

const EVALUATION_SYSTEM_PROMPT = `
You are a Code Judge. Evaluate the user's submission against the challenge.

**Input:**
- Challenge Details
- User's Solution (Code or Selected Option)

**Output Format:**
Return ONLY a JSON object:
{
  "isCorrect": boolean,
  "feedback": "Short encouraging feedback.",
  "codeReview": "Technical critique if applicable (clean code, performance).",
  "explanation": "Why is it correct/incorrect? Reference the concept.",
  "xpEarned": number (If correct, return full points. If partially correct, return partial points)
}
`;

export const generateContextualChallenge = async (
    context: string,
    source: ContextSource,
    modelId: AiModelId
): Promise<Challenge> => {
    if (!aiClient) throw new Error("SkillForge AI not initialized");

    const prompt = `
    Analyze this context from a ${source.type} (Timestamp/Line: ${source.timestampOrLine || 'N/A'}):
    
    """
    ${context.slice(0, 3000)}
    """

    Generate a single active learning challenge.
    `;

    try {
        const response = await aiClient.models.generateContent({
            model: modelId,
            config: {
                systemInstruction: CHALLENGE_SYSTEM_PROMPT,
                responseMimeType: "application/json",
            },
            contents: { parts: [{ text: prompt }] }
        });

        const raw = JSON.parse(cleanJson(response.text || "{}"));
        
        return {
            id: Date.now().toString(),
            source,
            ...raw
        };
    } catch (e) {
        console.error("SkillForge Generation Failed", e);
        throw new Error("Failed to generate challenge. Please try again.");
    }
};

export const evaluateSubmission = async (
    challenge: Challenge,
    userSubmission: string,
    modelId: AiModelId
): Promise<SubmissionResult> => {
    if (!aiClient) throw new Error("SkillForge AI not initialized");

    const prompt = `
    **Challenge:**
    ${challenge.question}
    ${challenge.description}

    **User Submission:**
    ${userSubmission}

    **Max Points:** ${challenge.xpPoints}

    Evaluate this.
    `;

    try {
        const response = await aiClient.models.generateContent({
            model: modelId,
            config: {
                systemInstruction: EVALUATION_SYSTEM_PROMPT,
                responseMimeType: "application/json",
            },
            contents: { parts: [{ text: prompt }] }
        });

        const result = JSON.parse(cleanJson(response.text || "{}"));
        return result as SubmissionResult;

    } catch (e) {
        console.error("Evaluation Failed", e);
        // Fallback result
        return {
            isCorrect: false,
            feedback: "Error evaluating submission.",
            explanation: "AI service failed.",
            xpEarned: 0
        };
    }
};
