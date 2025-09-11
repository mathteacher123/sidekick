import { z } from "zod";
import { tool } from "@langchain/core/tools";
import OpenAPIParser from '@apidevtools/swagger-parser';
import "dotenv/config";

import { createModel, loadJSONFile, extractMinimalSpec, saveFile,loadFile, callWpApi } from "./utils.js";
import { get_openapi_spec, run_api} from "./tools.js";

let dereferenced1 = await OpenAPIParser.dereference('./data/wp-v2.json');
let t=extractMinimalSpec(dereferenced1, [
  {path:"/wp/v2/posts", method:null},
  {path:"/wp/v2/posts/{id}", method:null},
  {path:"/wp/v2/tags", method:null},
]);
t=JSON.stringify(t,null,2);
saveFile("./data/wp-v2-posts.json",t);
process.exit(0);

(async () => {
  const posts = await run_api.invoke({route:'/wp/v2/posts',method:'get', data:{}});
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