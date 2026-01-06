
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
    CallToolRequestSchema,
    ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { searchClasses, fetchClassDocs } from "./scraper.js";


const server = new Server(
    {
        name: "tmodloader-docs",
        version: "1.0.0",
    },
    {
        capabilities: {
            tools: {},
        },
    }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
        tools: [
            {
                name: "search_tmodloader_classes",
                description:
                    "Search for tModLoader classes and interfaces from the official documentation. Returns class names, full paths, descriptions, and docs URLs.",
                inputSchema: z.object({
                    query: z
                        .string()
                        .describe("The search query (e.g., 'NPC', 'Item', 'ModPlayer')"),
                }).shape, // Zod shape for JSON schema
            },
            {
                name: "read_class_docs",
                description: "Fetch the detailed documentation (markdown) for a specific tModLoader class URL.",
                inputSchema: z.object({
                    url: z.string().describe("The full URL of the class documentation page (returned by search_tmodloader_classes)."),
                }).shape,
            },
        ],
    };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
    if (request.params.name === "search_tmodloader_classes") {
        // Validate arguments
        const args = request.params.arguments as { query?: string };
        if (!args || typeof args.query !== "string") {
            throw new Error("Invalid arguments: query is required");
        }

        try {
            const results = await searchClasses(args.query);

            // Format results for the user/model
            const formatted = results.map(c => `
### ${c.name} (${c.fullName})
**Description**: ${c.description || "No description"}
**URL**: ${c.url}
`).join('\n');

            if (results.length === 0) {
                return {
                    content: [{ type: "text", text: "No classes found matching your query." }],
                };
            }

            return {
                content: [
                    {
                        type: "text",
                        text: `Found ${results.length} classes:\n${formatted}`,
                    },
                ],
            };

        } catch (error: any) {
            return {
                content: [{ type: "text", text: `Error searching classes: ${error.message}` }],
                isError: true,
            };
        }
    }

    if (request.params.name === "read_class_docs") {
        const args = request.params.arguments as { url?: string };
        if (!args || typeof args.url !== "string") {
            throw new Error("Invalid arguments: url is required");
        }

        try {
            const markdown = await fetchClassDocs(args.url);
            return {
                content: [
                    {
                        type: "text",
                        text: markdown,
                    },
                ],
            };
        } catch (error: any) {
            return {
                content: [{ type: "text", text: `Error fetching docs: ${error.message}` }],
                isError: true,
            };
        }
    }

    throw new Error(`Tool not found: ${request.params.name}`);
});


async function run() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("tModLoader Docs MCP Server running on stdio");
}

run().catch((error) => {
    console.error("Fatal error running server:", error);
    process.exit(1);
});
