import fs from "node:fs";
import path from "node:path";

const outDir = path.resolve("out");
const repo = process.env.GITHUB_REPOSITORY?.split("/")[1] || "";
const basePath = (process.env.NEXT_PUBLIC_BASE_PATH || (repo ? `/${repo}` : "")).replace(/\/$/, "");

if (!fs.existsSync(outDir)) throw new Error("Next export directory 'out' was not created.");

const source404 = path.join(outDir, "404.html");
const redirect = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="robots" content="noindex"><script>try{sessionStorage.setItem('sheko-pending-path',location.pathname+location.search+location.hash)}catch(e){}location.replace(${JSON.stringify(basePath + "/")});</script></head><body></body></html>`;
fs.writeFileSync(source404, redirect);

const manifest = path.join(outDir, "manifest.json");
if (fs.existsSync(manifest)) {
  let json = JSON.parse(fs.readFileSync(manifest, "utf8"));
  json.start_url = `${basePath || ""}/`;
  json.icons = (json.icons || []).map((icon) => ({ ...icon, src: `${basePath || ""}/${String(icon.src).replace(/^\.\//, "")}` }));
  fs.writeFileSync(manifest, JSON.stringify(json, null, 2) + "\n");
}

const index = path.join(outDir, "index.html");
if (fs.existsSync(index)) {
  let html = fs.readFileSync(index, "utf8");
  html = html.replace(/<body([^>]*)>/i, `<body$1><script>(function(){try{var p=sessionStorage.getItem('sheko-pending-path');if(p){sessionStorage.removeItem('sheko-pending-path');history.replaceState({},'',p)}}catch(e){}})();</script>`);
  fs.writeFileSync(index, html);
}

console.log(`GitHub Pages prepared. basePath=${basePath || "/"}`);
