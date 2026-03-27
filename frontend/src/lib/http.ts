import axios from "axios";

const apiUrl = process.env.NEXT_PUBLIC_API_URL;

if (!apiUrl) {
  throw new Error("Missing API URL.");
}

export const api = axios.create({
  baseURL: apiUrl,
  validateStatus: () => true
});

export const withAuth = (accessToken: string) => ({
  headers: {
    Authorization: `Bearer ${accessToken}`
  }
});
