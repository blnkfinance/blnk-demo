import "dotenv/config";
import axios from "axios";

if (!process.env.BLNK_API_KEY) {
    throw new Error("BLNK_API_KEY is required");
}

export const blnk = axios.create({
    baseURL: process.env.BLNK_BASE_URL || "http://localhost:5001",
    headers: {
        "X-blnk-key": process.env.BLNK_API_KEY,
        "Content-Type": "application/json",
    },
});
