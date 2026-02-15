import { generateText } from "ai";
import { gateway } from "@ai-sdk/gateway";

export const maxDuration = 60;

const MODEL = "openai/gpt-4o";

const SYSTEM_PROMPT = `You are a UI expert. The user wants to modify a JSON UI spec.
You will receive the original spec and a request describing the desired changes.
You must return ONLY the modified JSON spec.
Do not wrap it in markdown. Do not add explanations.
The output must be valid JSON.
Preserve the overall structure and existing data unless asked to change it.
For "style" props, use React-style camelCase keys (e.g. "backgroundColor", not "background-color").
For layout, spacing, and sizing, use Tailwind CSS classes in "className" (e.g. "p-4", "flex", "w-full").
IMPORTANT: Tailwind classes for COLORS (e.g. "bg-red-500", "text-blue-500", "border-red-500") will form Dynamic Class names and WILL NOT work.
INSTEAD, YOU MUST USE THE "style" PROP FOR ALL COLORS.
Example:
CORRECT: { "type": "Stack", "props": { "className": "p-4 border", "style": { "borderColor": "red", "backgroundColor": "#f3f4f6" } } }
WRONG: { "type": "Stack", "props": { "className": "p-4 border border-red-500 bg-gray-100" } }
IMPORTANT: "className" and "style" MUST be inside the "props" object.
`;

export async function POST(req: Request) {
    try {
        const { originalSpec, prompt } = await req.json();

        if (!originalSpec || !prompt) {
            return Response.json(
                { error: "Missing originalSpec or prompt" },
                { status: 400 }
            );
        }

        const { text } = await generateText({
            model: gateway(MODEL),
            system: SYSTEM_PROMPT,
            prompt: `Original Spec:\n${JSON.stringify(originalSpec, null, 2)}\n\nUser Request: ${prompt}\n\nModified Spec:`,
        });

        console.log("Model Output:", text);

        // Attempt to parse to ensure validity, or extract JSON if the model added text
        let modifiedSpec;
        try {
            // 1. Try direct parse
            modifiedSpec = JSON.parse(text);
        } catch (e) {
            // 2. Try to extract from code block if present
            const match = text.match(/```json\n([\s\S]*?)\n```/) || text.match(/```\n([\s\S]*?)\n```/);
            if (match) {
                try {
                    modifiedSpec = JSON.parse(match[1]);
                } catch (inner) {
                    console.error("Failed to parse code block JSON", inner);
                }
            }

            // 3. Last resort: Find first { and last }
            if (!modifiedSpec) {
                const start = text.indexOf('{');
                const end = text.lastIndexOf('}');
                if (start !== -1 && end !== -1 && end > start) {
                    try {
                        modifiedSpec = JSON.parse(text.substring(start, end + 1));
                    } catch (inner) {
                        console.error("Failed to parse substring JSON", inner);
                    }
                }
            }

            if (!modifiedSpec) {
                throw new Error("Invalid structure returned by model");
            }
        }

        return Response.json(modifiedSpec);
    } catch (error) {
        console.error("Edit UI Error:", error);
        if (error instanceof Error) {
            console.error(error.stack);
            return Response.json({ error: "Failed to edit UI", details: error.toString() }, { status: 500 });
        }
        return Response.json(
            { error: "Failed to edit UI", details: String(error) },
            { status: 500 }
        );
    }
}
