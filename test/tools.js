import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import { tool } from "@langchain/core/tools";

export const calculate = tool(
  async ({ input }) => {
    return eval(input);
  },
  {
    name: "calculate",
    description: "Runs a calculation and returns the number.",
    schema: z.object({
      input: z.string(),
    }),
  }
);
export const average_dog_weight = tool(
  async ({ input }) => {
    if (input === "Scottish Terrier") {
      return "Scottish Terriers average 20 lbs";
    } else if (input === "Border Collie") {
      return "a Border Collies average weight is 37 lbs";
    } else {
      return "An average dog weights 50 lbs";
    }
  },
  {
    name: "average_dog_weight",
    description: "returns average weight of a dog when given the breed",
    schema: z.object({
      input: z.string(),
    }),
  }
);
export const getWeather = tool(
  async (input) => {
    console.log("called with input", input);
    if (input.city === "nyc") {
      return "It might be cloudy in nyc";
    } else if (input.city === "sf") {
      return "It's always sunny in sf";
    } else {
      throw new Error("Unknown city");
    }
  },
  {
    name: "get_weather",
    description: "Use this to get weather information.",
    schema: z.object({
      city: z.enum(["sf", "nyc"]),
    }),
  }
);
export const describeTool = (tool) => {
  const { name, description, schema } = tool;
  const text =
    `Tool Name: \`${name}\`\n` +
    `Function: ${description}\n` +
    `Input Format (as JSON schema): ${JSON.stringify(
      zodToJsonSchema(schema)
    )}\n`;

  return text + "\n";
};

export const tools = [calculate, average_dog_weight, getWeather];
