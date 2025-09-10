import { z } from "zod";
import { tool } from "@langchain/core/tools";
import "dotenv/config";

import { createModel, loadJSONFile, extractMinimalSpec, saveFile,loadFile, callWpApi } from "./utils.js";

const get_openapi_spec = tool(
  async ({route,method}) => {
    const json = await loadJSONFile('./data/wp-v2-posts.json');
    return json.paths[route][method];
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
(async () => {
  const posts = await get_openapi_spec.invoke({route:'/wp/v2/posts',method:'get'});
  console.log('📄 Posts:', posts);
})();


/*
(async () => {
  const posts = await callWpApi({
    route: '/wp/v2/posts',
    method: 'GET',
    data: {
      per_page: 5,
      order: 'desc'
    }
  });

  console.log('📄 Posts:', posts);
})();
*/