# ChatGPT V2 - Generative UI Chatbot

A next-generation chatbot built with [Next.js 16](https://nextjs.org) and the [Vercel AI SDK](https://sdk.vercel.ai/docs), featuring **Generative UI** capabilities. This application goes beyond simple text responses by rendering interactive React components, data dashboards, and 3D scenes directly in the chat stream.

## Features

-   **Generative UI**: The AI agent responds with rich, interactive UI components (Cards, Charts, Dashboards, Tables) defined by JSONL specs, not just plain text.
-   **Interactive 3D Scenes**: Built-in support for rendering 3D visualizations using [React Three Fiber](https://r3f.docs.pmnd.rs/) (e.g., Solar System, Molucules).
-   **Integrated Tools**:
    -   **Weather**: Real-time weather data and forecasts.
    -   **GitHub**: Repository stats and pull requests.
    -   **Crypto**: Live cryptocurrency prices and historical data charts.
    -   **Hacker News**: Top stories and trends.
    -   **Web Search**: General knowledge retrieval.
-   **Local Chat History**: Conversations are persisted locally in the browser for privacy and convenience.
-   **Streaming**: Real-time streaming of both text and UI components for a responsive experience.
-   **Modern Tech Stack**: Built with the latest web technologies including React 19, Tailwind CSS v4, and Shadcn UI.

## Tech Stack

-   **Framework**: [Next.js 16 (App Router)](https://nextjs.org)
-   **AI**: [Vercel AI SDK](https://sdk.vercel.ai/docs) (Core, React, Gateway)
-   **UI Library**: [React 19](https://react.dev), [Tailwind CSS v4](https://tailwindcss.com), [Shadcn UI](https://ui.shadcn.com), [Radix UI](https://www.radix-ui.com/)
-   **3D Rendering**: [Three.js](https://threejs.org/), [React Three Fiber](https://r3f.docs.pmnd.rs/), [Drei](https://github.com/pmndrs/drei)
-   **Markdown**: [Streamdown](https://github.com/streamdown/streamdown)
-   **Charts**: [Recharts](https://recharts.org/)
-   **Validation**: [Zod](https://zod.dev/)

## Getting Started

### Prerequisites

-   Node.js 18+ installed
-   `npm`, `pnpm`, or `yarn`

### Installation

1.  Clone the repository:
    ```bash
    git clone https://github.com/yourusername/chatgpt-v2.git
    cd chatgpt-v2
    ```

2.  Install dependencies:
    ```bash
    npm install
    # or
    pnpm install
    # or
    yarn install
    ```

3.  Configure Environment Variables:
    Create a `.env.local` file in the root directory. You may need to configure your AI Gateway or Model provider keys.
    ```env
    # Example
    AI_GATEWAY_MODEL=anthropic/claude-haiku-4.5
    # Add other provider keys if using direct integration instead of gateway
    ```

4.  Run the development server:
    ```bash
    npm run dev
    # or
    pnpm dev
    # or
    yarn dev
    ```

5.  Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Project Structure

-   `app/`: Next.js App Router pages and API routes.
    -   `page.tsx`: Main chat interface.
    -   `api/chat/route.ts`: API route handling AI stream and tool execution.
-   `components/`: Reusable UI components (buttons, inputs, charts, 3D scenes).
-   `lib/`: Utility functions and AI logic.
    -   `agent.ts`: Configuration of the `ToolLoopAgent`, tools, and system instructions.
    -   `tools/`: Implementation of specific tools (Weather, GitHub, etc.).
    -   `render/`: Logic for rendering Generative UI specs.

## Learn More

To learn more about the technologies used in this project:

-   [Next.js Documentation](https://nextjs.org/docs)
-   [Vercel AI SDK Documentation](https://sdk.vercel.ai/docs)
-   [React Three Fiber Documentation](https://r3f.docs.pmnd.rs/getting-started/introduction)

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new).

Check out the [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
