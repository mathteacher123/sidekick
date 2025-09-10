import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import { tool } from "@langchain/core/tools";
import { createModel, loadJSONFile, extractMinimalSpec, saveFile,loadFile, callWpApi } from "./utils.js";

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
  let aaa = "";
  try {
    aaa = zodToJsonSchema(schema);
  } catch (ex) {
    console.dir(schema);
    aaa = schema;
  }
  const text =
    `Tool Name: \`${name}\`\n` +
    `Function: ${description}\n` +
    `Input Format (as JSON schema): ${JSON.stringify(aaa)}\n`;

  return text + "\n";
};

export const get_openapi_spec = tool(
  async ({route,method}) => {
    route = route.toLowerCase();
    method = method.toLowerCase();
    const json = await loadJSONFile('./data/wp-v2-posts.json');
    if (json['paths'] && json['paths'][route] && json.paths[route][method] ) return json.paths[route][method];
    throw new Error(`There is no OpenAPI spec for endpoint: {route: '${route}', method: '${method}'}`)
  },
  {
    name: "get_openapi_spec",
    description: "given an endpoint (route and http method) of wp rest api, returns the json schema for the request body an query string paramters of that endpoint",
    schema:z.object({
          route: z.string().describe('route of wp rest api endpoint'),
          method: z.string().describe('http method (get,post, put etc) of wp rest api endpint'),
        })
  }
);

export const run_api = tool(
  async ({route, method, data}) => {
    return JSON.stringify(await callWpApi({route, method, data}));
  },
  {
    name: "run_api",
    description: "given a wp rest api request, execute it and returns the results",
    schema: z.object({
      route: z.string().describe('route of wp rest api endpoint'),
      method: z.string().describe('http method (get,post, put etc) of wp rest api endpint'),
      data: z.record(z.any()).describe('plain javascript object. used either to make json body for POST, PUT, PATCH http request, or query string for the GET http request'),
    })
  }
);

export const llm = tool(
  async ({query}) => {
    return createModel().pipe(new StringOutputParser()).invoke(query);
  },
  {
    name: "llm",
    description: "generates a response directly using the LLM.",
    schema: z.object({
      query: z.string().describe('query for llm'),
    })
  }
);

export const get_site_info = tool(
  async () => {
    return JSON.stringify({plugins:[{name:'a1'},{name:"b1"}]});
  },
  {
    name: "get_site_info",
    description: "Provides detailed information about the WordPress site like site name, url, description, admin email, plugins, themes, users, and more",
    schema: z.object({}),
  }
);

export const tools = [calculate, average_dog_weight, getWeather];
