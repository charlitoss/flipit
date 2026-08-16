import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

/**
 * Serves the /api serverless functions during `npm run dev`.
 *
 * In production Vercel builds `api/*.ts` itself; locally Vite doesn't know about
 * them, so this mounts the same handler as middleware. That keeps a single
 * `npm run dev` process (no `vercel dev`, no second port, no CLI login).
 */
function apiDev(): Plugin {
  const ROUTE = "/api/calendar";
  return {
    name: "flipit-api-dev",
    apply: "serve",

    // The api sources use NodeNext, so relative imports carry .js extensions.
    // Vite's dev resolver doesn't map those back to .ts — do it here.
    resolveId(source, importer) {
      if (!importer || !source.startsWith(".") || !source.endsWith(".js")) return null;
      if (!importer.includes(`${path.sep}api${path.sep}`)) return null;
      return path.resolve(path.dirname(importer), source.replace(/\.js$/, ".ts"));
    },

    configureServer(server) {
      server.middlewares.use(ROUTE, async (req, res) => {
        try {
          const mod = (await server.ssrLoadModule("/api/calendar.ts")) as {
            POST: (r: Request) => Promise<Response>;
          };
          if (req.method !== "POST") {
            res.statusCode = 405;
            res.end();
            return;
          }
          const chunks: Buffer[] = [];
          for await (const c of req) chunks.push(c as Buffer);

          const headers = new Headers();
          for (const [k, v] of Object.entries(req.headers)) {
            if (typeof v === "string") headers.set(k, v);
            else if (Array.isArray(v)) headers.set(k, v.join(", "));
          }

          const out = await mod.POST(
            new Request(`http://localhost${ROUTE}`, {
              method: "POST",
              headers,
              body: chunks.length ? Buffer.concat(chunks) : undefined,
            })
          );

          res.statusCode = out.status;
          out.headers.forEach((value, key) => res.setHeader(key, value));
          res.end(Buffer.from(await out.arrayBuffer()));
        } catch (err) {
          server.config.logger.error(`[api-dev] ${(err as Error).message}`);
          res.statusCode = 500;
          res.setHeader("content-type", "application/json");
          res.end(
            JSON.stringify({
              ok: false,
              error: { code: "server_error", message: "The dev API handler failed." },
            })
          );
        }
      });
    },
  };
}

// Relative base so the build works locally, from file://, and when served
// from a sub-path like GitHub Pages (https://user.github.io/flipit/).
export default defineConfig({
  base: "./",
  plugins: [react(), apiDev()],
});
