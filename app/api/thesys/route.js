import { NextResponse } from "next/server";
import OpenAI from "openai";
import { transformStream } from "@crayonai/stream";
import { getMessageStore } from "../chat/messageStore";
import { generateAndExecuteQuery } from "../../../lib/queryEngine";
import { UI_GENERATION_PROMPT } from "../../../lib/schema";

export async function POST(req) {
    const { prompt, threadId, responseId } = await req.json();

    const client = new OpenAI({
        baseURL: "https://api.thesys.dev/v1/embed/",
        apiKey: process.env.THESYS_API_KEY,
    });

    const messageStore = getMessageStore(threadId);
    messageStore.addMessage(prompt);

    const userContent =
        typeof prompt.content === "string" ? prompt.content : "";

    // ── Two-Pass Flow ───────────────────────────────────
    let dataContext = "";

    try {
        const history = messageStore.messageList
            .filter((m) => m.role === "user" || m.role === "assistant")
            .map((m) => ({
                role: m.role,
                content: typeof m.content === "string" ? m.content : "",
            }));

        const queryResult = await generateAndExecuteQuery(userContent, history);

        if (queryResult.rows.length > 0) {
            dataContext =
                `\n\n[QUERY EXECUTED]\nSQL: ${queryResult.sql}\n` +
                `Rows returned: ${queryResult.rowCount}\n` +
                `Columns: ${queryResult.columns.join(", ")}\n\n` +
                `[DATA]\n${JSON.stringify(queryResult.rows, null, 2)}`;
        } else {
            dataContext =
                `\n\n[QUERY EXECUTED]\nSQL: ${queryResult.sql}\n` +
                `Result: No rows returned.`;
        }
    } catch (error) {
        const errMsg = error instanceof Error ? error.message : "Unknown error";
        console.error("Query engine error:", errMsg);
        dataContext =
            `\n\n[DATABASE QUERY FAILED]\nError: ${errMsg}\n` +
            `Please answer the question conversationally or ask the user to rephrase.`;
    }

    // ── Pass 2: Stream UI generation ────────────────────
    const storeMessages = messageStore.getOpenAICompatibleMessageList();
    const enrichedMessages = [
        { role: "system", content: UI_GENERATION_PROMPT },
        ...storeMessages.slice(0, -1),
        {
            role: "user",
            content: userContent + dataContext,
        },
    ];

    const llmStream = await client.chat.completions.create({
        model: "c1/openai/gpt-5/v-20251130",
        messages: enrichedMessages,
        stream: true,
    });

    const responseStream = transformStream(
        llmStream,
        (chunk) => {
            return chunk.choices?.[0]?.delta?.content ?? "";
        },
        {
            onEnd: ({ accumulated }) => {
                const message = accumulated.filter((m) => m).join("");
                messageStore.addMessage({
                    role: "assistant",
                    content: message,
                    id: responseId,
                });
            },
        }
    );

    return new NextResponse(responseStream, {
        headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache, no-transform",
            Connection: "keep-alive",
        },
    });
}
