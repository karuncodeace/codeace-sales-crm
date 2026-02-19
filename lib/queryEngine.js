import OpenAI from "openai";
import { queryWithTimeout } from "./db";
import { SQL_GENERATION_PROMPT } from "./schema";

/**
 * Normalizes SQL by decoding HTML entities and unescaping characters.
 */
function normalizeSQL(sql) {
    return sql
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&amp;/g, "&")
        .replace(/\\n/g, "\n")
        .replace(/\\t/g, "\t")
        .replace(/\\"/g, '"')
        .replace(/\\'/g, "'")
        .trim();
}

/**
 * Validates that a SQL string is a safe, read-only SELECT query.
 */
function validateSQL(sql) {
    // Remove single-line and multi-line comments to check the actual command
    const cleanSQL = sql
        .replace(/--.*$/gm, "")
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .trim();

    console.log("[SQL Debug] Cleaned SQL for validation:", cleanSQL);

    // Must start with SELECT or WITH (CTE)
    // Use a regex that allows leading whitespace/newlines
    if (!/^\s*(SELECT|WITH)\b/i.test(cleanSQL)) {
        return { valid: false, error: "Only SELECT queries are allowed." };
    }

    // Block dangerous keywords (case-insensitive)
    const forbidden =
        /\b(INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|TRUNCATE|GRANT|REVOKE|EXECUTE|EXEC|COPY|pg_|SET\s+ROLE)\b/i;
    if (forbidden.test(cleanSQL)) {
        return {
            valid: false,
            error: "Query contains forbidden operations. Only read-only queries are allowed.",
        };
    }

    return { valid: true };
}

/**
 * Extracts SQL from the model response.
 */
function extractSQL(response) {
    console.log("[SQL Debug] Raw model response:", response);

    // 1. Strip <content> tags if present
    let cleanResponse = response.replace(/<content[^>]*>([\s\S]*?)<\/content>/i, "$1").trim();

    // 2. If it's a JSON object (GenUI response), try to find SQL in nested text fields
    if (cleanResponse.startsWith("{") && cleanResponse.endsWith("}")) {
        try {
            // Look for a markdown block inside the raw string first
            const inJsonMatch = cleanResponse.match(/```(?:sql)?\s*\n?([\s\S]*?)\n?```/i);
            if (inJsonMatch) {
                const extracted = inJsonMatch[1].trim();
                console.log("[SQL Debug] Extracted from code block inside JSON:", extracted);
                return extracted;
            }
        } catch (e) {
            // Ignore parse errors
        }
    }

    // 3. Normal extraction from markdown code fence 
    const codeBlockMatch = cleanResponse.match(/```(?:sql)?\s*\n?([\s\S]*?)\n?```/i);
    if (codeBlockMatch) {
        const extracted = codeBlockMatch[1].trim();
        console.log("[SQL Debug] Extracted from code block:", extracted);
        return extracted;
    }

    // 4. Fallback: search for the first occurrence of SELECT or WITH
    const sqlStartMatch = cleanResponse.match(/\b(SELECT|WITH)\b[\s\S]+/i);
    if (sqlStartMatch) {
        const extracted = sqlStartMatch[0].split("```")[0].trim();
        console.log("[SQL Debug] Extracted using fallback regex:", extracted);
        return extracted;
    }

    console.log("[SQL Debug] No SQL patterns found, returning trimmed response.");
    return cleanResponse;
}

/**
 * Takes a natural language question, generates SQL via C1, executes it,
 * and returns the results.
 */
export async function generateAndExecuteQuery(
    userQuestion,
    conversationHistory
) {
    const client = new OpenAI({
        baseURL: "https://api.thesys.dev/v1/embed/",
        apiKey: process.env.THESYS_API_KEY,
    });

    // Pass 1: Generate SQL
    const sqlResponse = await client.chat.completions.create({
        model: "c1/openai/gpt-5/v-20251130",
        messages: [
            { role: "system", content: SQL_GENERATION_PROMPT },
            ...conversationHistory.slice(-8).map((m) => ({
                role: m.role,
                content: m.content,
            })),
            { role: "user", content: userQuestion },
        ],
        stream: false,
    });

    const rawSQL = sqlResponse.choices?.[0]?.message?.content ?? "";
    const extractedSQL = extractSQL(rawSQL);
    const sql = normalizeSQL(extractedSQL);

    // Validate
    const validation = validateSQL(sql);
    if (!validation.valid) {
        console.error("[SQL Debug] Validation failed:", validation.error);
        throw new Error(validation.error);
    }

    // Execute with 5s timeout
    console.log("[SQL Debug] Executing SQL...");
    const result = await queryWithTimeout(sql, 5000);
    console.log("[SQL Debug] Query executed successfully. Rows returned:", result.rowCount);

    return {
        sql,
        columns: result.fields.map((f) => f.name),
        rows: result.rows,
        rowCount: result.rowCount ?? 0,
    };
}
