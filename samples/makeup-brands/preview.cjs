const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "../..");
const types = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "text/javascript",
  ".png": "image/png",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
};
http
  .createServer((request, response) => {
    try {
      const route = decodeURIComponent(
        new URL(request.url, "http://localhost").pathname,
      );
      let file = path.resolve(root, "." + route);
      if (file !== root && !file.startsWith(root + path.sep))
        throw new Error("Outside preview");
      if (fs.statSync(file).isDirectory()) file = path.join(file, "index.html");
      const type = types[path.extname(file)];
      if (!type) throw new Error("Unsupported file");
      const data = fs.readFileSync(file);
      response.writeHead(200, { "Content-Type": type + "; charset=utf-8" });
      response.end(data);
    } catch {
      response.writeHead(404);
      response.end("Not found");
    }
  })
  .listen(4173, "127.0.0.1", () =>
    console.log(
      "Portfolio preview: http://127.0.0.1:4173/samples/makeup-brands/index.html",
    ),
  );
