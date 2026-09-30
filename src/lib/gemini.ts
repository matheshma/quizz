import { createServerFn } from "@tanstack/react-start";

export interface QuizQuestion {
  question: string;
  options: string[];
  answer: number; // 0, 1, 2, or 3
  explanation?: string;
}

export interface QuizData {
  topic: string;
  questions: QuizQuestion[];
}

export interface GenerateQuizParams {
  topic: string;
  difficulty?: "easy" | "medium" | "hard" | "mixed";
  customApiKey?: string;
}

/**
 * Retrieves the Gemini API key from environment variables or custom override
 */
export function getGeminiApiKey(customApiKey?: string): string | undefined {
  if (customApiKey && customApiKey.trim().length > 0) {
    return customApiKey.trim();
  }

  // Check server-side process.env variations
  if (typeof process !== "undefined" && process.env) {
    const key =
      process.env.GEMINI_API_KEY ||
      process.env.VITE_GEMINI_API_KEY ||
      process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
      process.env.GEMINI_KEY;
    if (key && key.trim().length > 0) {
      return key.trim();
    }
  }

  // Check Vite client-side import.meta.env
  try {
    const metaEnv = (import.meta as any).env;
    if (metaEnv) {
      const key =
        metaEnv.VITE_GEMINI_API_KEY ||
        metaEnv.GEMINI_API_KEY ||
        metaEnv.VITE_GOOGLE_GENERATIVE_AI_API_KEY ||
        metaEnv.GEMINI_KEY;
      if (key && key.trim().length > 0) {
        return key.trim();
      }
    }
  } catch {
    // Ignore meta env errors
  }

  return undefined;
}

/**
 * Directly call Gemini API with model fallback and automatic retry on 503 high-demand spikes
 */
export async function callGeminiApiDirect(
  apiKey: string,
  topic: string,
  difficulty = "mixed"
): Promise<QuizData> {
  const promptText = `You are an expert educator and quiz creator.
Generate a high-quality 10-question multiple-choice quiz strictly on the topic: "${topic}".
Difficulty level: ${difficulty}.

Requirements:
1. Generate EXACTLY 10 distinct, interesting, and clear questions.
2. For each question, provide EXACTLY 4 answer options (highly relevant to the question).
3. The options must be plausible, clear, and distinct.
4. "answer" MUST be an integer from 0 to 3 indicating the index of the correct option in the "options" array.
5. Provide a clear 1-sentence "explanation" of why that answer is correct.

Output ONLY valid JSON matching this structure:
{
  "topic": "${topic}",
  "questions": [
    {
      "question": "Question text?",
      "options": ["Option 0", "Option 1", "Option 2", "Option 3"],
      "answer": 0,
      "explanation": "Brief explanation."
    }
  ]
}`;

  const models = [
    "gemini-3.7-flash",
    "gemini-3.8-flash",
    "gemini-3.6-flash",
    "gemini-3.5-flash",
    "gemini-3.1-flash-lite",
    "gemini-1.5-flash",
    "gemini-flash-latest",
  ];

  let lastError: Error | null = null;
  let rawResult: string | null = null;

  for (const model of models) {
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        const response = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [{ text: promptText }],
              },
            ],
            generationConfig: {
              responseMimeType: "application/json",
              temperature: 0.7,
            },
          }),
        });

        // 503 is temporary high-demand spike - wait 1 sec and retry up to 3 times
        if (response.status === 503) {
          console.warn(`Model ${model} returned 503 (attempt ${attempt}/3). Retrying...`);
          await new Promise((resolve) => setTimeout(resolve, 1000));
          continue;
        }

        if (!response.ok) {
          const errorText = await response.text();
          let errorMsg = `Gemini API error (${response.status})`;
          try {
            const errJson = JSON.parse(errorText);
            if (errJson?.error?.message) {
              errorMsg = errJson.error.message;
            }
          } catch {
            errorMsg = `${errorMsg}: ${errorText}`;
          }
          throw new Error(errorMsg);
        }

        const data = await response.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!text) {
          throw new Error("No text returned from Gemini AI response.");
        }

        rawResult = text;
        break; // Exit retry loop
      } catch (err: any) {
        console.warn(`Attempt ${attempt} with ${model} failed:`, err?.message || err);
        lastError = err;
        if (err.message && !err.message.includes("503")) {
          // If it's 404 or non-retriable, jump to next model
          break;
        }
      }
    }

    if (rawResult) {
      break; // Exit model loop if we got result
    }
  }

  if (!rawResult) {
    throw (
      lastError ||
      new Error("Unable to generate quiz from Gemini API. Please check your API key.")
    );
  }

  // Clean raw JSON result
  let cleaned = rawResult.trim();
  if (cleaned.startsWith("```json")) {
    cleaned = cleaned.replace(/^```json\s*/, "").replace(/\s*```$/, "");
  } else if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```\s*/, "").replace(/\s*```$/, "");
  }

  let parsed: any;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error("Failed to parse JSON response from Gemini API.");
  }

  if (!parsed || !Array.isArray(parsed.questions) || parsed.questions.length === 0) {
    throw new Error("Invalid response format received from Gemini API.");
  }

  // Validate and sanitize 10 questions
  const validatedQuestions: QuizQuestion[] = parsed.questions
    .slice(0, 10)
    .map((q: any, idx: number) => {
      const questionText = q.question || `Question ${idx + 1}`;
      let opts = Array.isArray(q.options) ? q.options.map(String) : [];

      while (opts.length < 4) {
        opts.push(`Option ${opts.length + 1}`);
      }
      if (opts.length > 4) {
        opts = opts.slice(0, 4);
      }

      let ans = typeof q.answer === "number" ? Math.floor(q.answer) : 0;
      if (ans < 0 || ans > 3) ans = 0;

      return {
        question: questionText,
        options: opts,
        answer: ans,
        explanation: q.explanation || `The correct answer is ${opts[ans]}.`,
      };
    });

  return {
    topic: parsed.topic || topic,
    questions: validatedQuestions,
  };
}

export const generateQuizServerFn = createServerFn({ method: "POST" })
  .validator((params: GenerateQuizParams) => params)
  .handler(async ({ data }): Promise<QuizData> => {
    const { topic, difficulty = "mixed", customApiKey } = data;
    const apiKey = getGeminiApiKey(customApiKey);

    if (!apiKey) {
      throw new Error(
        "Gemini API key not found in .env. Please add GEMINI_API_KEY or VITE_GEMINI_API_KEY to your .env file."
      );
    }

    return await callGeminiApiDirect(apiKey, topic, difficulty);
  });

/**
 * Universal quiz generator function (tries server function first, falls back to direct API)
 */
export async function generateQuiz(params: GenerateQuizParams): Promise<QuizData> {
  try {
    return await generateQuizServerFn({ data: params });
  } catch (serverErr: any) {
    console.warn("Server function execution failed, attempting client direct fetch fallback:", serverErr);

    const apiKey = getGeminiApiKey(params.customApiKey);
    if (!apiKey) {
      throw new Error(
        serverErr.message ||
          "Gemini API key not found in .env. Please add GEMINI_API_KEY or VITE_GEMINI_API_KEY to your .env file."
      );
    }

    return await callGeminiApiDirect(apiKey, params.topic, params.difficulty || "mixed");
  }
}
