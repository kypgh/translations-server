import chalk from "chalk";
import fs from "fs";
import path from "path";

const catchAsyncError = (fn) => async (req, res, next) => {
  try {
    // Custom to merge params into query (compatibility for nextjs migration)
    req.query = { ...req.query, ...req.params };
    await fn(req, res, next);
  } catch (err) {
    next(err);
  }
};

const calcRoutePath = (_path, file, prefix, _originalPath) => {
  let _fileName =
    file === "index.ts" || file === "index.js"
      ? ""
      : file.substring(0, file.length - 3);
  return path
    .join("/", prefix, _path.replace(_originalPath, ""), _fileName)
    .replace(/\\/g, "/")
    .replace(/\[/g, ":")
    .replace(/\]/g, "");
};

async function _folderRouter(
  server,
  _path,
  _originalPath,
  _prefix,
  verbose = false
) {
  const files = fs.readdirSync(path.resolve(_path), { withFileTypes: true });
  const sortedFiles = files.sort((a, b) => (a.name[0] === "[" ? 1 : -1));
  let total = 0;
  for (const file of sortedFiles) {
    if (file.isDirectory()) {
      total += await _folderRouter(
        server,
        path.join(_path, file.name),
        _originalPath,
        _prefix,
        verbose
      );
    } else if (file.name.endsWith(".ts") || file.name.endsWith(".js")) {
      const endpoints = await import(path.resolve(_path, file.name));

      const routePath = calcRoutePath(_path, file.name, _prefix, _originalPath);
      let routePrint = `${chalk.green("-")} '${chalk.bold(
        routePath
      )}'[${chalk.green(endpoints.default?.middleware?.all?.length || 0)}]:`;
      if (endpoints.default?.middleware?.all) {
        server.all(
          routePath,
          ...endpoints.default?.middleware.all.map(catchAsyncError)
        );
      }

      if (endpoints.GET && typeof endpoints.GET === "function") {
        total++;
        let getMiddleware = endpoints.default?.middleware?.get || [];
        server.get(
          routePath,
          ...getMiddleware.map(catchAsyncError),
          catchAsyncError(endpoints.GET)
        );
        routePrint += `[${chalk.green("GET")} ${chalk.blue(
          getMiddleware.length
        )}]`;
      }
      if (endpoints.POST && typeof endpoints.POST === "function") {
        total++;
        let postMiddleware = endpoints.default?.middleware?.post || [];
        server.post(
          routePath,
          ...postMiddleware.map(catchAsyncError),
          catchAsyncError(endpoints.POST)
        );
        routePrint += `[${chalk.green("POST")} ${chalk.blue(
          postMiddleware.length
        )}]`;
      }
      if (endpoints.PUT && typeof endpoints.PUT === "function") {
        total++;
        let putMiddleware = endpoints.default?.middleware?.put || [];
        server.put(
          routePath,
          ...putMiddleware.map(catchAsyncError),
          catchAsyncError(endpoints.PUT)
        );
        routePrint += `[${chalk.green("PUT")} ${chalk.blue(
          putMiddleware.length
        )}]`;
      }
      if (endpoints.PATCH && typeof endpoints.PATCH === "function") {
        total++;
        let patchMiddleware = endpoints.default?.middleware?.patch || [];
        server.patch(
          routePath,
          ...patchMiddleware.map(catchAsyncError),
          catchAsyncError(endpoints.PATCH)
        );
        routePrint += `[${chalk.green("PATCH")} ${chalk.blue(
          patchMiddleware.length
        )}]`;
      }
      if (endpoints.DELETE && typeof endpoints.DELETE === "function") {
        total++;
        let delMiddleware = endpoints.default?.middleware?.delete || [];
        server.delete(
          routePath,
          ...delMiddleware.map(catchAsyncError),
          catchAsyncError(endpoints.DELETE)
        );
        routePrint += `[${chalk.green("DELETE")} ${chalk.blue(
          delMiddleware.length
        )}]`;
      }
      if (verbose) {
        console.info(routePrint);
      }
    }
  }
  return total;
}

export default async function folderRouter(server, _path, _prefix = "") {
  let total = await _folderRouter(
    server,
    path.join(_path, ""),
    path.join(_path, ""),
    _prefix,
    process.env.ENV === "development"
  );
  console.info(`[${chalk.green("API")}] ${chalk.blue(total)} routes loaded`);
  return total;
}
