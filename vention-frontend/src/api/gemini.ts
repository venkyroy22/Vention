// Gemini AI Service - Isolated AI interactions
// Note: This service is completely separate from user chat messages
// AI cannot access or view ChatPanel messages

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

export interface AIMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface AIResponse {
  content: string;
  model: string;
  timestamp: Date;
}

export interface AIRequestBody {
  contents: Array<{
    role: 'user' | 'model';
    parts: Array<{
      text: string;
    }>;
  }>;
  generationConfig?: {
    temperature?: number;
    maxOutputTokens?: number;
    topP?: number;
    topK?: number;
  };
}

/**
 * Send a message to Google Gemini API for AI suggestions
 * Used in Notes and Tasks sections ONLY
 * This is completely isolated from user-to-user chats
 */
export async function sendAIMessage(
  userMessage: string,
  context?: string,
  conversationHistory?: AIMessage[]
): Promise<AIResponse> {
  try {
    if (!GEMINI_API_KEY) {
      throw new Error('Gemini API key not configured');
    }

    // Build conversation with history if provided
    const contents: AIRequestBody['contents'] = [];

    // Add previous messages for context
    if (conversationHistory && conversationHistory.length > 0) {
      conversationHistory.forEach((msg) => {
        contents.push({
          role: msg.role === 'user' ? 'user' : 'model',
          parts: [{ text: msg.content }],
        });
      });
    }

    // Add current message with context
    const contextPrefix = context ? `Context: ${context}\n\n` : '';
    contents.push({
      role: 'user',
      parts: [{ text: `${contextPrefix}${userMessage}` }],
    });

    const requestBody: AIRequestBody = {
      contents,
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 2048,
        topP: 0.95,
        topK: 64,
      },
    };

    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Gemini API Error:', error);
      throw new Error(`Gemini API error: ${error.error?.message || response.statusText}`);
    }

    const data = await response.json();

    // Extract the generated content
    const aiContent =
      data.candidates?.[0]?.content?.parts?.[0]?.text ||
      'Unable to generate a response. Please try again.';

    return {
      content: aiContent,
      model: data.model || 'gemini-2.5-flash',
      timestamp: new Date(),
    };
  } catch (error) {
    console.error('AI Message Error:', error);
    throw error;
  }
}

/**
 * Generate suggestions for notes
 */
export async function generateNoteSuggestions(
  noteContent: string,
  noteTitle?: string
): Promise<AIResponse> {
  const prompt = `You are a helpful assistant suggesting ideas and improvements for notes. 
Current note title: ${noteTitle || 'Untitled'}
Current note content: ${noteContent}

Please provide:
1. Key points to expand on
2. Related ideas or connections
3. Suggestions for better organization
4. Questions to deepen the content

Keep suggestions concise and actionable.`;

  return sendAIMessage(prompt);
}

/**
 * Generate task ideas based on context
 */
export async function generateTaskIdeas(context: string): Promise<AIResponse> {
  const prompt = `You are a productivity assistant. Based on this context: "${context}"

Please suggest:
1. Specific tasks to accomplish
2. Subtasks or steps
3. Priority recommendations
4. Time estimates

Format as a clear, organized list.`;

  return sendAIMessage(prompt);
}

/**
 * Suggest improvements or next steps for tasks
 */
export async function suggestTaskImprovements(
  taskTitle: string,
  taskDescription?: string,
  completionStatus?: string
): Promise<AIResponse> {
  const prompt = `You are a task management assistant.
Task: ${taskTitle}
${taskDescription ? `Description: ${taskDescription}` : ''}
${completionStatus ? `Status: ${completionStatus}` : ''}

Please suggest:
1. Ways to make this task more achievable
2. Potential challenges and solutions
3. Next steps or related tasks
4. Optimization ideas

Keep suggestions practical and specific.`;

  return sendAIMessage(prompt);
}

/**
 * Ask AI for brainstorming help on a topic
 */
export async function brainstormWithAI(topic: string, context?: string): Promise<AIResponse> {
  const prompt = `You are a creative brainstorming partner. Help me generate ideas about: "${topic}"
${context ? `Additional context: ${context}` : ''}

Please provide:
1. 5-7 creative ideas
2. How to implement each idea
3. Potential benefits
4. Related concepts to explore

Be imaginative but practical.`;

  return sendAIMessage(prompt);
}
