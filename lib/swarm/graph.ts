import { StateGraph, END, Annotation } from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { exaSearchTool, stagehandActTool } from "./tools";
import { appendSwarmLog, addSwarmArtifact, setSwarmStatus } from "./buffers";

/**
 * Define the State for the Swarm
 */
const SwarmState = Annotation.Root({
    messages: Annotation<any[]>({
        reducer: (x, y) => x.concat(y),
    }),
    sessionId: Annotation<string>({
        reducer: (x, y) => y ?? x,
    }),
});

// Tools available to the Swarm
const tools = [exaSearchTool, stagehandActTool];
const toolNode = new ToolNode(tools);

// Model
const model = new ChatOpenAI({
    model: "gpt-4o",
    temperature: 0,
    // apiKey: process.env.OPENAI_API_KEY // Optional, defaults to env
}).bindTools(tools);

/**
 * Nodes
 */

// 1. Agent Node (The Brain)
async function agentNode(state: typeof SwarmState.State) {
    const { messages, sessionId } = state;
    console.log(`[Swarm:${sessionId}] Agent thinking...`);

    // Log the thought process
    appendSwarmLog(sessionId, "Thinking about next steps...");

    const systemPrompt = new SystemMessage(
    `You are an Advanced Autonomous Agent capable of performing any task a human can do in a web browser. Your goal is not just to find information, but to COMPLETE tasks intelligently and thoroughly.

CORE CAPABILITIES:
1. **Deep Semantic Research**: You utilize advanced search tools to aggregate knowledge, compare options, and synthesize answers without needing to visit every single link manually.
2. **Browser Interaction**: You can click, type, scroll, and navigate complex UI flows (e.g., login portals, settings menus, checkout flows).
3. **Authenticated Actions**: You have access to user cookies. You can manage accounts, send messages, or retrieve private data.

----------------------------------------------------------------
CRITICAL INSTRUCTION: DO NOT BE LAZY.
- Never return a generic "Search Results" page as the final answer.
- If the user asks for "The Best X", you must:
    1. RESEARCH candidates deeply to find the consensus winner.
    2. VERIFY the specifics (price, availability) on the target site.
    3. RETURN the specific direct link or perform the final action.
----------------------------------------------------------------

EXECUTION PROTOCOL (The "OODA" Loop):

1. **OBSERVE (Plan)**:
    - Before calling ANY tool, output a thought process.
    - Define "Done" clearly (e.g., "User wants the item added to cart, not just a link").
    - Differentiate between "I need knowledge" (Exa) and "I need to do something" (Stagehand).

2. **ORIENT (Strategic Intelligence)**:
    - Use 'exa_search' as your primary research engine.
    - Do not just look for URLs. Use Exa to find *answers*, summaries, and comparisons.
    - If the user wants "The best headphones," use Exa to find the consensus top model across multiple review sites *before* you ever open a browser.

3. **DECIDE (Tactical Action)**:
       - Once you know *what* to target, use 'stagehand_browser' to execute.
       - **CRITICAL**: The browser tool is STATELESS. It closes after every call.
       - You MUST use the \`current_url\` returned by the previous step as the \`url\` for the next step.
       - Use 'action="extract"' to grab structured data that requires rendering.
       - Use 'action="act"' to navigate (Login, Add to Cart, Fill Form).

4. **ACT (Verify & Return)**:
    - Before returning the final answer, ask: "Did I actually do what was asked, or did I just point to where it *could* be done?"
    - If you just pointed, you are not finished. Go back and do the work.

TOOL USAGE GUIDELINES:
- **exa_search**:
    - Use for **Research & Strategy**.
    - Capable of deep filtering (e.g., "reviews published in last month").
    - Use this to narrow down *what* you need to do before you engage the browser.
- **stagehand_browser**:
    - Use for **Execution & Interaction**.
    - REQUIRED for any task involving clicking, logging in, or handling dynamic DOM elements.
    - Use 'extract' when you are on the specific target page and need 100% accurate data from the rendered HTML.

Example Scenario:
    User: "Find best headphones under $200."
    BAD Response: Returns link to amazon.com/s?k=headphones.
    GOOD Response:
      1. **exa_search**: Query "best headphones under 200 reviews 2024 consensus" to identify the "Sony WH-CH720N" as the winner.
      2. **stagehand_browser** (model_name="gpt-4o"): Navigate to Amazon.
      3. **stagehand_browser** (action="act"): Search for "Sony WH-CH720N" and click the specific product page.
          -> Returns \`current_url\`: "https://amazon.../dp/..."
      4. **stagehand_browser** (action="extract", url="https://amazon.../dp/..."): Verify current price is < $200 and in stock.
      5. **Final Output**: Return direct link to product page.`
    );

    const result = await model.invoke([systemPrompt, ...messages]);

    // If the agent decided to call a tool, log it
    if (result.tool_calls && result.tool_calls.length > 0) {
        const toolNames = result.tool_calls.map(tc => tc.name).join(", ");
        appendSwarmLog(sessionId, `Decided to use tool(s): ${toolNames}`);
    } else {
        appendSwarmLog(sessionId, `Finished thinking. Final response: ${result.content}`);
    }

    return { messages: [result] };
}

// 2. Tool Output Processor (Intercepts tool results to save artifacts)
// LangGraph's ToolNode automatically executes tools. 
// We want to capture the output *after* ToolNode runs, but ToolNode returns ToolMessages.
// So we can insert a node *after* tools to process the latest ToolMessages.

async function artifactNode(state: typeof SwarmState.State) {
    const { messages, sessionId } = state;
    const lastMessage = messages[messages.length - 1];

    // If the last message was a ToolMessage (or array of them), extract data
    // Note: ToolNode returns an array of messages if multiple tools were called, or a single one. 
    // But in the state generic, it might be flattened. Let's assume standard behavior.

    // Check if the last few messages are ToolMessages
    // We only care about the *new* ones.
    // For simplicity in this demo, we just look at the last message.

    // In LangGraph, the 'tools' node output is appended to messages.
    // We can assume the last message is a ToolMessage if we just came from 'tools'.

    if (lastMessage.getType() === "tool") {
        try {
            const content = JSON.parse(lastMessage.content as string);
            // Heuristic: Is this a "result" worth saving?
            // If it's from Stagehand or Exa, yes.

            // Log success
            appendSwarmLog(sessionId, `Tool execution completed. Saving results.`);

            addSwarmArtifact(sessionId, {
                type: "json",
                title: `Tool Output (${lastMessage.name})`,
                content: content,
                source: lastMessage.name as any
            });

        } catch (e) {
            // Content wasn't JSON, probably just a string message.
            appendSwarmLog(sessionId, `Tool returned text: ${lastMessage.content.slice(0, 50)}...`);
        }
    }

    return {};
}

/**
 * Conditional Edge Logic
 */
function shouldContinue(state: typeof SwarmState.State) {
    const messages = state.messages;
    const lastMessage = messages[messages.length - 1];

    // If the LLM made a tool call, go to 'tools'
    if (lastMessage.tool_calls?.length) {
        return "tools";
    }
    // Otherwise, end
    return END;
}

/**
 * Build the Graph
 */
const workflow = new StateGraph(SwarmState)
    .addNode("agent", agentNode)
    .addNode("tools", toolNode)
    .addNode("process_artifacts", artifactNode) // Add artifact processing
    .addEdge("__start__", "agent")
    .addConditionalEdges("agent", shouldContinue)
    .addEdge("tools", "process_artifacts") // After tools, process artifacts
    .addEdge("process_artifacts", "agent"); // Loop back to agent

export const swarmGraph = workflow.compile();
