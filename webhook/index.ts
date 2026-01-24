import { createHmac, timingSafeEqual } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const secret = process.env.BLNK_SECRET;
if (!secret) {
    throw new Error(
        "BLNK_SECRET environment variable is required. " +
            "Create webhook/.env from webhook/.env.example and set BLNK_SECRET to match your Blnk server secret."
    );
}

const port = parseInt(process.env.PORT || "3000", 10);
const webhookPathRaw = process.env.WEBHOOK_PATH || "/webhook";
const webhookPath = webhookPathRaw.startsWith("/") ? webhookPathRaw : `/${webhookPathRaw}`;
const maxSkewSeconds = Number.isFinite(Number(process.env.MAX_SKEW_SECONDS))
    ? parseInt(process.env.MAX_SKEW_SECONDS as string, 10)
    : 300;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const outputDir = join(__dirname, "output");
mkdirSync(outputDir, { recursive: true });

function safeName(input: string): string {
    const cleaned = input.trim().replace(/[^a-zA-Z0-9._-]+/g, "_");
    return cleaned.length > 0 ? cleaned : "unknown";
}

function parseTimestampToMs(tsHeader: string): number | null {
    // Common patterns: seconds (10 digits) or ms (13 digits). If it's not numeric, skip freshness checks.
    const tsNum = Number(tsHeader);
    if (!Number.isFinite(tsNum)) return null;

    const digitsOnly = tsHeader.trim().replace(/[^0-9]/g, "");
    if (digitsOnly.length >= 13) return tsNum;
    return tsNum * 1000;
}

function constantTimeEqualsHex(a: string, b: string): boolean {
    // timingSafeEqual throws if lengths differ.
    if (a.length !== b.length) return false;
    return timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

function jsonResponse(status: number, body: unknown): Response {
    return new Response(JSON.stringify(body), {
        status,
        headers: { "Content-Type": "application/json" },
    });
}

const server = Bun.serve({
    port,
    async fetch(req) {
        const url = new URL(req.url);

        if (req.method === "GET" && url.pathname === "/health") {
            return jsonResponse(200, { ok: true });
        }

        if (req.method !== "POST" || url.pathname !== webhookPath) {
            return jsonResponse(404, { error: "Not found" });
        }

        const signature = req.headers.get("x-blnk-signature");
        const timestamp = req.headers.get("x-blnk-timestamp");
        if (!signature || !timestamp) {
            return jsonResponse(400, {
                error: "Missing required headers",
                required: ["x-blnk-signature", "x-blnk-timestamp"],
            });
        }

        const rawBytes = Buffer.from(await req.arrayBuffer());
        const rawBody = rawBytes.toString("utf8");

        const signed = `${timestamp}.${rawBody}`;
        const expectedSignature = createHmac("sha256", secret).update(signed).digest("hex");

        const tsMs = parseTimestampToMs(timestamp);
        if (tsMs !== null && maxSkewSeconds > 0) {
            const skewMs = Math.abs(Date.now() - tsMs);
            if (skewMs > maxSkewSeconds * 1000) {
                return jsonResponse(401, { error: "Stale timestamp" });
            }
        }

        const ok = constantTimeEqualsHex(signature, expectedSignature);
        if (!ok) {
            return jsonResponse(401, { error: "Invalid signature" });
        }

        let payload: unknown = rawBody;
        let eventName = "unknown";
        try {
            payload = JSON.parse(rawBody);
            if (payload && typeof payload === "object" && "event" in payload) {
                const maybeEvent = (payload as any).event;
                if (typeof maybeEvent === "string") eventName = maybeEvent;
            }
        } catch {
            // Keep rawBody as payload if it's not valid JSON
        }

        const nowIso = new Date().toISOString().replace(/[:.]/g, "-");
        const fileName = `${nowIso}_${safeName(eventName)}.json`;
        const filePath = join(outputDir, fileName);

        const toWrite =
            typeof payload === "string" ? { raw: payload } : payload;

        writeFileSync(filePath, JSON.stringify(toWrite, null, 2));

        console.log(`[webhook] verified event=${eventName} saved=output/${fileName}`);
        return jsonResponse(200, { ok: true, event: eventName, saved_to: `output/${fileName}` });
    },
});

console.log(`Listening on http://localhost:${server.port}${webhookPath}`);
console.log("Health check at GET /health");

