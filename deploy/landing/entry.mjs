import * as page from "./.build/page.mjs";
import { handleRequest } from "./worker.mjs";

const worker = {
  fetch(request) {
    return handleRequest(request, page);
  },
};

export default worker;
