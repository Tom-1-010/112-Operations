import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer, createLogger } from "vite";
import { type Server } from "http";
import { nanoid } from "nanoid";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const viteLogger = createLogger();

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

export async function setupVite(app: Express, server: Server) {
  try {
    const serverOptions = {
      middlewareMode: true,
      hmr: { server },
      allowedHosts: true,
    };

    // Load config from vite.config.ts
    const configPath = path.resolve(__dirname, '..', 'vite.config.ts');
    console.log('[Vite] Loading config from:', configPath);
    
    const vite = await createViteServer({
      configFile: configPath,
      customLogger: {
        ...viteLogger,
        error: (msg, options) => {
          viteLogger.error(msg, options);
          // Don't exit on error, just log it
          console.error('[Vite] Error:', msg, options);
        },
      },
      server: serverOptions,
      appType: "custom",
    });
    
    console.log('[Vite] Server initialized successfully');

  app.use(vite.middlewares);
  
  // Catch-all route for client-side routing - must be last
  // Only handle requests that look like HTML page requests (not assets)
  app.use("*", async (req, res, next) => {
    // Skip if response was already sent by Vite middleware
    if (res.headersSent) {
      return;
    }

    const url = req.originalUrl;

    // Skip API routes and static assets - let Vite handle everything else
    if (
      url.startsWith("/api") || 
      url.startsWith("/attached_assets") || 
      url.startsWith("/data")
    ) {
      return next();
    }

    // Skip if it's an asset request (has file extension or is a Vite asset)
    // Vite middleware should handle these
    if (
      url.startsWith("/src/") ||
      url.startsWith("/node_modules/") ||
      url.startsWith("/@") ||
      /\.(js|ts|tsx|jsx|css|json|map|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$/i.test(url)
    ) {
      return next();
    }

    try {
      const clientTemplate = path.resolve(
        __dirname,
        "..",
        "client",
        "index.html",
      );

      // Check if file exists
      if (!fs.existsSync(clientTemplate)) {
        console.error(`Client template not found: ${clientTemplate}`);
        return res.status(500).send(`Client template not found: ${clientTemplate}`);
      }

      // always reload the index.html file from disk incase it changes
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`,
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      console.error("Error serving client:", e);
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
  } catch (error) {
    console.error("Failed to setup Vite:", error);
    if (error instanceof Error) {
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
    }
    throw error;
  }
}

export function serveStatic(app: Express) {
  const distPath = path.resolve(__dirname, "public");

  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  app.use(express.static(distPath));

  // fall through to index.html if the file doesn't exist
  app.use("*", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
