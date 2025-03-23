import { config } from "dotenv";
import fs from "fs";
import path from "path";
import elizaLogger from "./logger.ts";

elizaLogger.info("Loading embedding settings:", {
    USE_OPENAI_EMBEDDING: process.env.USE_OPENAI_EMBEDDING,
    USE_OLLAMA_EMBEDDING: process.env.USE_OLLAMA_EMBEDDING,
    OLLAMA_EMBEDDING_MODEL:
        process.env.OLLAMA_EMBEDDING_MODEL || "mxbai-embed-large",
});

// Add this logging block
elizaLogger.debug("Loading character settings:", {
    CHARACTER_PATH: process.env.CHARACTER_PATH,
    ARGV: process.argv,
    CHARACTER_ARG: process.argv.find((arg) => arg.startsWith("--character=")),
    CWD: process.cwd(),
});

interface Settings {
    [key: string]: string | undefined;
    // Model settings
    OPENAI_API_KEY?: string;
    OPENAI_API_URL?: string;
    ANTHROPIC_API_KEY?: string;
    ANTHROPIC_API_URL?: string;
    GOOGLE_API_KEY?: string;
    MISTRAL_API_KEY?: string;
    BEDROCK_REGION?: string;
    BEDROCK_ACCESS_KEY?: string;
    BEDROCK_SECRET_KEY?: string;

    // OpenAI models
    SMALL_OPENAI_MODEL?: string;
    MEDIUM_OPENAI_MODEL?: string;
    LARGE_OPENAI_MODEL?: string;
    EMBEDDING_OPENAI_MODEL?: string;
    IMAGE_OPENAI_MODEL?: string;

    // Anthropic models
    SMALL_ANTHROPIC_MODEL?: string;
    MEDIUM_ANTHROPIC_MODEL?: string;
    LARGE_ANTHROPIC_MODEL?: string;

    // Mistral models
    SMALL_MISTRAL_MODEL?: string;
    MEDIUM_MISTRAL_MODEL?: string;
    LARGE_MISTRAL_MODEL?: string;

    // PortKey models and settings
    PORTKEY_API_KEY?: string;
    PORTKEY_API_URL?: string;
    SMALL_PORTKEY_MODEL?: string;
    MEDIUM_PORTKEY_MODEL?: string;
    LARGE_PORTKEY_MODEL?: string;
    EMBEDDING_PORTKEY_MODEL?: string;

    // Other settings
    SYSTEM_PROMPT?: string;
    // ... other properties
}

interface NamespacedSettings {
    [namespace: string]: Settings;
}

let environmentSettings: Settings = {};

/**
 * Determines if code is running in a browser environment
 * @returns {boolean} True if in browser environment
 */
const isBrowser = (): boolean => {
    return (
        typeof window !== "undefined" && typeof window.document !== "undefined"
    );
};

/**
 * Recursively searches for a .env file starting from the current directory
 * and moving up through parent directories (Node.js only)
 * @param {string} [startDir=process.cwd()] - Starting directory for the search
 * @returns {string|null} Path to the nearest .env file or null if not found
 */
export function findNearestEnvFile(startDir = process.cwd()) {
    if (isBrowser()) return null;

    let currentDir = startDir;

    // Continue searching until we reach the root directory
    while (currentDir !== path.parse(currentDir).root) {
        const envPath = path.join(currentDir, ".env");

        if (fs.existsSync(envPath)) {
            return envPath;
        }

        // Move up to parent directory
        currentDir = path.dirname(currentDir);
    }

    // Check root directory as well
    const rootEnvPath = path.join(path.parse(currentDir).root, ".env");
    return fs.existsSync(rootEnvPath) ? rootEnvPath : null;
}

/**
 * Configures environment settings for browser usage
 * @param {Settings} settings - Object containing environment variables
 */
export function configureSettings(settings: Settings) {
    environmentSettings = { ...settings };
}

/**
 * Loads environment variables from the nearest .env file in Node.js
 * or returns configured settings in browser
 * @returns {Settings} Environment variables object
 * @throws {Error} If no .env file is found in Node.js environment
 */
export function loadEnvConfig(): Settings {
    // For browser environments, return the configured settings
    if (isBrowser()) {
        return environmentSettings;
    }

    // Node.js environment: load from .env file
    const envPath = findNearestEnvFile();

    // attempt to Load the .env file into process.env
    const result = config(envPath ? { path: envPath } : {});

    if (!result.error) {
        elizaLogger.log(`Loaded .env file from: ${envPath}`);
    }

    // Parse namespaced settings
    const namespacedSettings = parseNamespacedSettings(process.env as Settings);

    // Attach to process.env for backward compatibility
    Object.entries(namespacedSettings).forEach(([namespace, settings]) => {
        process.env[`__namespaced_${namespace}`] = JSON.stringify(settings);
    });

    return process.env as Settings;
}

/**
 * Gets a specific environment variable
 * @param {string} key - The environment variable key
 * @param {string} [defaultValue] - Optional default value if key doesn't exist
 * @returns {string|undefined} The environment variable value or default value
 */
export function getEnvVariable(
    key: string,
    defaultValue?: string
): string | undefined {
    if (isBrowser()) {
        return environmentSettings[key] || defaultValue;
    }
    return process.env[key] || defaultValue;
}

/**
 * Checks if a specific environment variable exists
 * @param {string} key - The environment variable key
 * @returns {boolean} True if the environment variable exists
 */
export function hasEnvVariable(key: string): boolean {
    if (isBrowser()) {
        return key in environmentSettings;
    }
    return key in process.env;
}

// Initialize settings based on environment
export const settings = isBrowser() ? environmentSettings : loadEnvConfig();

elizaLogger.info("Parsed settings:", {
    USE_OPENAI_EMBEDDING: settings.USE_OPENAI_EMBEDDING,
    USE_OPENAI_EMBEDDING_TYPE: typeof settings.USE_OPENAI_EMBEDDING,
    USE_OLLAMA_EMBEDDING: settings.USE_OLLAMA_EMBEDDING,
    USE_OLLAMA_EMBEDDING_TYPE: typeof settings.USE_OLLAMA_EMBEDDING,
    OLLAMA_EMBEDDING_MODEL:
        settings.OLLAMA_EMBEDDING_MODEL || "mxbai-embed-large",
});

export default settings;

// Add this function to parse namespaced settings
function parseNamespacedSettings(env: Settings): NamespacedSettings {
    const namespaced: NamespacedSettings = {};

    for (const [key, value] of Object.entries(env)) {
        if (!value) continue;

        const [namespace, ...rest] = key.split(".");
        if (!namespace || rest.length === 0) continue;

        const settingKey = rest.join(".");
        namespaced[namespace] = namespaced[namespace] || {};
        namespaced[namespace][settingKey] = value;
    }

    return namespaced;
}
