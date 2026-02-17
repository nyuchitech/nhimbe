/**
 * mukoko-nhimbe-container — Cloudflare Container Worker Entry Point
 *
 * This worker proxies all incoming requests to the Hono app
 * running inside the Cloudflare Container (Docker).
 */

import { Container, getContainer } from "cloudflare:container";

interface Env {
  NHIMBE_CONTAINER: DurableObjectNamespace<NhimbeContainer>;
}

export class NhimbeContainer extends Container<Env> {
  override defaultPort = 8080;

  // Keep container alive for 2 minutes after last request
  override sleepAfter = "2m" as const;

  // Pass environment variables into the container
  override getEnvironment(): Record<string, string> {
    return {
      MONGODB_URI: this.env.MONGODB_URI ?? "",
      CF_ACCOUNT_ID: this.env.CF_ACCOUNT_ID ?? "",
      CF_API_TOKEN: this.env.CF_API_TOKEN ?? "",
      CF_DATABASE_ID: this.env.CF_DATABASE_ID ?? "",
      STYTCH_PROJECT_ID: this.env.STYTCH_PROJECT_ID ?? "",
      STYTCH_SECRET: this.env.STYTCH_SECRET ?? "",
      STYTCH_B2B_PROJECT_ID: this.env.STYTCH_B2B_PROJECT_ID ?? "",
      STYTCH_B2B_SECRET: this.env.STYTCH_B2B_SECRET ?? "",
      MUKOKO_ORG_ID: this.env.MUKOKO_ORG_ID ?? "",
      API_KEY: this.env.API_KEY ?? "",
      ENVIRONMENT: this.env.ENVIRONMENT ?? "development",
      ALLOWED_ORIGIN: this.env.ALLOWED_ORIGIN ?? "http://localhost:3000",
      PORT: "8080",
    };
  }

  override onStart(): void {
    console.log("mukoko-nhimbe-container started");
  }

  override onStop(): void {
    console.log("mukoko-nhimbe-container stopped");
  }

  override onError(error: unknown): void {
    console.error("mukoko-nhimbe-container error:", error);
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // Route all requests to a singleton container instance
    const container = getContainer(env.NHIMBE_CONTAINER, "nhimbe-singleton");
    return container.fetch(request);
  },
};
