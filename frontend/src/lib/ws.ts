import { API_BASE } from "./api";

export const WS_URL = `${API_BASE.replace(/^http/, "ws")}/ws`;
