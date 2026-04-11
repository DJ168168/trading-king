import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const bundle = require("./_bundle.cjs");
const handler = bundle.default || bundle;
export default handler;
