import { swarmGraph } from "./graph";
import { initSwarmBuffer, setSwarmStatus, appendSwarmLog, getSwarmBuffer } from "./buffers";
import { HumanMessage, BaseMessage } from "@langchain/core/messages";

// Simple in-memory history for the hackathon "Single Swarm"
// Map<sessionId, BaseMessage[]>
const sessionHistories = new Map<string, BaseMessage[]>();

/**
 * Fire-and-forget runner for the Swarm.
 * This function returns immediately after starting the graph execution in the background.
 */
export function startSwarm(sessionId: string, query: string) {

    // FORCE SINGLE SESSION for this demo
    const FIXED_SESSION_ID = "demo-heng-yang";
    sessionId = FIXED_SESSION_ID;

    // 1. Initialize or Update Buffer
    let buffer = getSwarmBuffer(sessionId);
    if (!buffer) {
        initSwarmBuffer(sessionId);
        buffer = getSwarmBuffer(sessionId);
    }

    setSwarmStatus(sessionId, "running");
    appendSwarmLog(sessionId, `[USER REQUEST] "${query}"`);

    // 2. Manage History
    let history = sessionHistories.get(sessionId) || [];
    const newMessage = new HumanMessage(query);
    history.push(newMessage);
    sessionHistories.set(sessionId, history);

    // 3. Start Execution
    // Return the promise so the caller can wait if they want (POC mode)
    const executionPromise = (async () => {
        try {
            // We pass the FULL history + new message to the graph
            const inputs = {
                messages: [newMessage],
                sessionId: sessionId,
            };

            // Logs
            console.log(`[SwarmRunner] Starting swarm for ${sessionId} with query: ${query}`);

            // Configuration for the run
            const config = { configurable: { thread_id: sessionId, sessionId: sessionId } };

            // Execute
            await swarmGraph.invoke(inputs, config);

            setSwarmStatus(sessionId, "completed");
            appendSwarmLog(sessionId, "Swarm execution step completed.");

        } catch (error: any) {
            console.error(`[SwarmRunner] Error in session ${sessionId}:`, error);
            setSwarmStatus(sessionId, "failed");
            appendSwarmLog(sessionId, `CRITICAL ERROR: ${error.message}`);
        }
    })();

    return { sessionId, status: "started", executionPromise };
}
