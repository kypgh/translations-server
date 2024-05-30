// import { Logtail } from "@logtail/node";
// import { LogtailTransport } from "@logtail/winston";
import expressWinston from "express-winston";
import winston from "winston";
// Create a Logtail client
// const logtail = new Logtail("yBnHfGJzvzEdBkY5GtGhmFqN");
// Create a Winston logger - passing in the Logtail transport
export const logger = expressWinston.logger({
  responseWhitelist: ["statusCode", "body"],
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        // Add the message timestamp with the preferred format
        winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss:ms" }),
        // Tell Winston that the logs must be colored
        winston.format.colorize({ all: true }),
        // Define the format of the message showing the timestamp, the level and the message
        winston.format.printf((info) => {
          return `${info.timestamp} [${info.meta?.res?.statusCode}]: ${info.message}`;
        })
      ),
    }),
    // new LogtailTransport(logtail),
  ],
});
