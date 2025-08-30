import { Client } from "@modelcontextprotocol/sdk/client";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import dotenv from "dotenv";
// Load environment variables from .env file
dotenv.config();
// Replace with your MCP server's HTTP endpoint
const transport = new StreamableHTTPClientTransport(
  "http://wps.zya.me/wp-json/wp/v2/wpmcp/streamable",
  {
    requestInit: {
      headers: {
        Authorization: `Bearer ${process.env.WP_MCP_TOKEN}`,
      },
    },
  }
);

const client = new Client({
  name: "example-client",
  version: "1.0.0",
});

await client.connect(transport);

// List prompts
const a = await client.listTools();
console.log("Prompts:", JSON.stringify(a.tools[1]));

/*
// Get a prompt
const prompt = await client.getPrompt({
  name: "example-prompt",
  arguments: {
    arg1: "value",
  },
});
console.log("Prompt result:", prompt);

// List resources
const resources = await client.listResources();
console.log("Resources:", resources);
/*
// Read a resource
const resource = await client.readResource({
  uri: "file:///example.txt",
});
console.log("Resource content:", resource);

// Call a tool
const result = await client.callTool({
  name: "example-tool",
  arguments: {
    arg1: "value",
  },
});
console.log("Tool result:", result);
*/
