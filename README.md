# Folder router template

This is a template for a folder based router server. It uses the express package to create the server and the folder structure to create the routes.

## Getting Started

The routes follow a file based structure and are created automatically. To create a new route all you have to do is add a file to the `src/routes` directory. anything you add there will follow the same path. For example to create a `GET /api/example` request i can create either a file at `src/routes/api/example.ts` or `src/routes/api/example/index.ts`. The file should export a function called `GET` which will be called when the request is made. The function will be called with the request and response objects from express.

```ts
import { RequestHandler } from "express";

export const GET: RequestHandler = async (req, res) => {
  res.status(200).json({ message: "Dashboard Route" });
};
```

Similar thing applies if you want to use the same route for different http verbs (GET, POST, PUT, DELETE)

## Middleware

Since the project is based on the express package you can create middleware using the same style as express all you need is a function that takes 3 arguments (req, res, next) and returns void. To attach the middleware you can `export default` a config object from the same file as the endpoint and it will be attached to either all the routes. Example:

```ts
import { IEndpointsConfig } from "@interfaces/endpoint.interfaces";
import { RequestHandler } from "express";

export const GET: RequestHandler = async (req, res) => {
  res.status(200).json({ message: "Dashboard Route" });
};

export const POST: RequestHandler = async (req, res) => {
  console.log("post");
  res.status(505).json({ message: "Not imlemented yet" });
};

const config: IEndpointsConfig = {
  middleware: {
    all: [
      (req, res, next) => {
        console.log("Middleware 1");
        next();
      },
    ],
    post: [
      (req, res, next) => {
        console.log("Middleware 2");
        next();
      },
    ],
  },
};
export default config;
```

The above example will log `Middleware 1` for both the `GET` and `POST` requests and will also log `Middleware 2` for the `POST` request only.

## Environment Variables

The environment variables are loaded through a `.env` file located in the root of this project (This file is not tracked by git therefore you need to create it manually). The environment variables are loaded in the `src/config/envs.ts` file which are then automatically exported for easier access to the rest of the project and to configure default values too.
