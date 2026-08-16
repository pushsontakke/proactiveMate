import { realApi } from "./client";
import { mockApi } from "./mock";

export * from "./types";

export const api =
  process.env.NEXT_PUBLIC_USE_MOCKS === "false" ? realApi : mockApi;
