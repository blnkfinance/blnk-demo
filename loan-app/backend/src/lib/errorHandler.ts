import type { ErrorRequestHandler } from "express";
import { logger, newRequestId } from "./logger.js";

function isJsonSyntaxError(err: unknown): err is SyntaxError & { status: number } {
  return (
    err instanceof SyntaxError &&
    typeof err === "object" &&
    err !== null &&
    "status" in err &&
    (err as { status: unknown }).status === 400
  );
}

export const errorHandler: ErrorRequestHandler = (err, _req, res, next) => {
  if (res.headersSent) {
    next(err);
    return;
  }

  const requestId = newRequestId();

  if (isJsonSyntaxError(err)) {
    logger.warn("request.invalid_json", { request_id: requestId });
    res.status(400).json({
      ok: false,
      error: "The request couldn't be read. Check your data and try again.",
    });
    return;
  }

  logger.error("request.unhandled_error", {
    request_id: requestId,
    error: err instanceof Error ? err.message : String(err),
  });

  res.status(500).json({
    ok: false,
    error: "Something went wrong on our side. Try again in a moment.",
  });
};
