import dotenv from "dotenv";
import { env } from "../../config/env";

// Load environment variables for tests
dotenv.config();

// Set GITHUB_TOKEN to "test" if it's not already set
const githubToken = env.GITHUB_TOKEN || "test";
process.env.GITHUB_TOKEN = githubToken;
