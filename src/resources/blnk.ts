import axios from "axios";
import type { AxiosInstance } from "axios";

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
