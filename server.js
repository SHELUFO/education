const http = require("http");
const fs = require("fs");
const path = require("path");

const publicDir = path.resolve(__dirname, "public");
const port = Number(process.env.PORT || 5188);

const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml; charset=utf-8"
};

function sendText(res, status, body) {
  res.writeHead(status, { "Content-Type": "text/plain; charset=utf-8" });
  res.end(body);
}

function resolvePublicPath(reqUrl) {
  let pathname;
  try {
    pathname = decodeURIComponent((reqUrl || "/").split("?")[0]);
  } catch (error) {
    return null;
  }

  const normalized = pathname === "/" ? "/index.html" : pathname;
  const file = path.resolve(publicDir, `.${normalized}`);
  const relative = path.relative(publicDir, file);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    return null;
  }
  return file;
}

function createServer() {
  return http.createServer((req, res) => {
    const file = resolvePublicPath(req.url);
    if (!file) {
      sendText(res, 403, "Forbidden");
      return;
    }

    fs.readFile(file, (error, data) => {
      if (error) {
        sendText(res, 404, "Not found");
        return;
      }
      res.writeHead(200, {
        "Content-Type": contentTypes[path.extname(file)] || "application/octet-stream",
        "Cache-Control": "no-store",
        "X-Robots-Tag": "noindex, nofollow, noarchive"
      });
      res.end(data);
    });
  });
}

if (require.main === module) {
  createServer().listen(port, () => {
    console.log(`Chem Web: http://localhost:${port}/`);
  });
}

module.exports = {
  createServer,
  resolvePublicPath
};
