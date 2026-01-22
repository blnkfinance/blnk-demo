// General utility functions
// Add general utility functions here as needed across multiple demos

import axios from "axios";
import type { AxiosInstance } from "axios";

export { axios, type AxiosInstance };

// Bun automatically loads .env from the project root
const apiKey = process.env.BLNK_API_KEY;
const baseUrl = process.env.BLNK_BASE_URL || "http://localhost:5001";

if (!apiKey) {
    throw new Error(
        "BLNK_API_KEY environment variable is required. " +
        "Please create a .env file in the project root with your Blnk API key. " +
        "See .env.example for the required format."
    );
}

// Initialize axios instance with default headers
export const blnk: AxiosInstance = axios.create({
    baseURL: baseUrl,
    headers: {
        "X-blnk-key": apiKey,
        "Content-Type": "application/json",
    },
});

type LogType = "info" | "error" | "success" | "warning";

/**
 * Centralized logging function with colors
 */
export function log(message: string, type: LogType = "info"): void {
    const colors = {
        info: "\x1b[36m", // Cyan
        error: "\x1b[31m", // Red
        success: "\x1b[32m", // Green
        warning: "\x1b[33m", // Yellow
    };
    const reset = "\x1b[0m";
    const color = colors[type] || colors.info;

    console.log(`${color}[${type.toUpperCase()}]${reset} ${message}`);
}
