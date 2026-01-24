"use node";
import { action } from "../_generated/server";
import { v } from "convex/values";

async function callOpenAI(
  messages: Array<{ role: string; content: string }>,
  options: { responseFormat?: "json_object" } = {}
): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY not configured");
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages,
      ...(options.responseFormat && {
        response_format: { type: options.responseFormat },
      }),
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.statusText}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "";
}

export const extractFacts = action({
  args: {
    topic: v.string(),
    searchResults: v.array(
      v.object({
        title: v.string(),
        url: v.string(),
        content: v.string(),
      })
    ),
    answer: v.optional(v.string()),
  },
  handler: async (ctx, { topic, searchResults, answer }) => {
    const prompt = `Analyze these search results about "${topic}":

${answer ? `Summary: ${answer}\n\n` : ""}
Sources:
${searchResults.map((r) => `[${r.title}]\n${r.content}`).join("\n\n---\n\n")}

Extract and return JSON:
{
  "keyFacts": [
    { "fact": "...", "confidence": "high|medium|low" }
  ],
  "identifiedParties": [
    { "name": "...", "role": "...", "stance": "..." }
  ],
  "coreTensions": ["..."],
  "currentStatus": "1-2 sentence summary of current situation"
}`;

    const result = await callOpenAI(
      [{ role: "user", content: prompt }],
      { responseFormat: "json_object" }
    );

    return JSON.parse(result);
  },
});
