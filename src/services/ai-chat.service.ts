import OpenAI from "openai";
import { DRAFT_WARNING, DEADLINE_WARNING } from "@/lib/constants";

export type LawpetChatMessage = {
  role: "user" | "assistant";
  content: string;
};

function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return null;
  }

  return new OpenAI({ apiKey });
}

export function buildLawpetSystemPrompt(input: {
  attorneyName?: string;
  lawFirmName?: string;
  mascot: "bear" | "cat" | "dog";
  pathname?: string;
}) {
  const mascotTone =
    input.mascot === "dog" ? "playful puppy" : input.mascot === "bear" ? "steady courtroom bear" : "calm cat";

  return [
    `You are Lawpet, a ${mascotTone} AI assistant embedded inside a U.S. law firm workflow app called Lawpel.`,
    input.attorneyName ? `You are currently helping ${input.attorneyName}.` : "You are helping a law firm user.",
    input.lawFirmName ? `The firm context is ${input.lawFirmName}.` : "",
    input.pathname ? `The user is currently viewing the page ${input.pathname}.` : "",
    "Your job is to help the user understand the app, summarize workflow steps, draft safe next actions, and answer product questions.",
    "Never present legal advice, legal conclusions, final deadlines, or court-ready language as final.",
    `If discussing deadlines, include this safety idea in natural language: ${DEADLINE_WARNING}`,
    `If discussing drafted documents, include this safety idea in natural language: ${DRAFT_WARNING}`,
    "Always remind the user that anything AI-generated remains subject to attorney review before filing, service, calendaring, or court use.",
    "Be concise, warm, and practical.",
    "If the user asks something outside the app context, still answer helpfully but do not imply the answer is a final legal conclusion."
  ]
    .filter(Boolean)
    .join("\n");
}

function buildResponsesInput(messages: LawpetChatMessage[]) {
  return messages.map((message) => ({
    role: message.role,
    content: [
      {
        type: "input_text" as const,
        text: message.content
      }
    ]
  }));
}

export async function generateLawpetReply(input: {
  attorneyName?: string;
  lawFirmName?: string;
  mascot: "bear" | "cat" | "dog";
  pathname?: string;
  messages: LawpetChatMessage[];
}) {
  const client = getOpenAIClient();

  if (!client) {
    return {
      reply:
        "Lawpet is ready, but the OpenAI API key is not configured yet. Add OPENAI_API_KEY to enable live AI chat. Draft outputs still require attorney review."
    };
  }

  const response = await client.responses.create({
    model: process.env.OPENAI_CHAT_MODEL ?? "gpt-4.1-mini",
    instructions: buildLawpetSystemPrompt(input),
    input: buildResponsesInput(input.messages),
    temperature: 0.6
  });

  return {
    reply:
      response.output_text?.trim() ||
      "Lawpet could not generate a reply just now. Anything AI-generated still requires attorney review."
  };
}
