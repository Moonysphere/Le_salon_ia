
import { config, requireKey } from "../src/config.js";
import { parseSSE } from "../tp2/sse.js";

export type Role = "system" | "user" | "assistant";
export type Msg = { role: Role; content: string };

export type Usage = {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
};

// ---------------------------------------------------------
// Erreurs HTTP
// ---------------------------------------------------------

export class HttpError extends Error {
  constructor(
    public status: number,
    public body: string,
    public retryAfterMs?: number,
  ) {
    super(`HTTP ${status} : ${body.slice(0, 200)}`);
    this.name = "HttpError";
  }
}

// ---------------------------------------------------------
// Déterminer si une erreur peut être réessayée
// ---------------------------------------------------------

export function isRetryable(e: unknown): boolean {
  if (e instanceof HttpError) {
    if (e.status === 429) {
      return !/insufficient_quota/.test(e.body);
    }

    return e.status === 408 || e.status >= 500;
  }

  if (e instanceof Error) {
    if (e.name === "AbortError" || e.name === "TimeoutError") {
      return false;
    }
  }

  return true;
}

// ---------------------------------------------------------
// Utilitaire d'attente
// ---------------------------------------------------------

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ---------------------------------------------------------
// 1. Limiteur de débit
// ---------------------------------------------------------

export class RateLimiter {
  private last = 0;
  private chain: Promise<unknown> = Promise.resolve();

  pending = 0;

  constructor(private minIntervalMs = 1000) {}

  schedule<T>(task: () => Promise<T>): Promise<T> {
    this.pending++;

    const run = async (): Promise<T> => {
      try {
        const elapsed = Date.now() - this.last;
        const waitMs = Math.max(
          0,
          this.minIntervalMs - elapsed,
        );

        if (waitMs > 0) {
          await sleep(waitMs);
        }

        this.last = Date.now();

        return await task();
      } finally {
        this.pending--;
      }
    };

    const result = this.chain.then(run, run);

    this.chain = result.then(
      () => undefined,
      () => undefined,
    );

    return result;
  }
}

// ---------------------------------------------------------
// 2. Retry avec backoff exponentiel + jitter
// ---------------------------------------------------------

export async function withRetry<T>(
  fn: () => Promise<T>,
  {
    retries = 4,
    baseMs = 500,
    maxMs = 8000,
    onRetry,
  }: {
    retries?: number;
    baseMs?: number;
    maxMs?: number;
    onRetry?: (
      attempt: number,
      waitMs: number,
      e: unknown,
    ) => void;
  } = {},
): Promise<T> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (!isRetryable(error) || attempt >= retries) {
        throw error;
      }

      const exponential = Math.min(
        maxMs,
        baseMs * 2 ** attempt,
      );

      const waitMs =
        error instanceof HttpError &&
        error.retryAfterMs !== undefined
          ? error.retryAfterMs
          : Math.random() * exponential;

      onRetry?.(attempt + 1, waitMs, error);

      await sleep(waitMs);
    }
  }

  throw new Error("Nombre de tentatives dépassé");
}

// ---------------------------------------------------------
// 3. Appel HTTP avec timeout et annulation
// ---------------------------------------------------------

async function post(
  body: object,
  {
    signal,
    timeoutMs = 30_000,
  }: {
    signal?: AbortSignal;
    timeoutMs?: number;
  } = {},
): Promise<Response> {
  requireKey();

  const combinedSignal = signal
    ? AbortSignal.any([
        signal,
        AbortSignal.timeout(timeoutMs),
      ])
    : AbortSignal.timeout(timeoutMs);

  const response = await fetch(
    `${config.baseURL}/chat/completions`,
    {
      method: "POST",

      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
      },

      body: JSON.stringify(body),

      signal: combinedSignal,
    },
  );

  if (!response.ok) {
    const errorBody = await response.text();

    const retryAfter = response.headers.get("retry-after");

    let retryAfterMs: number | undefined;

    if (retryAfter) {
      const seconds = Number(retryAfter);

      if (Number.isFinite(seconds)) {
        retryAfterMs = Math.max(0, seconds * 1000);
      } else {
        const date = Date.parse(retryAfter);

        if (!Number.isNaN(date)) {
          retryAfterMs = Math.max(0, date - Date.now());
        }
      }
    }

    throw new HttpError(
      response.status,
      errorBody,
      retryAfterMs,
    );
  }

  return response;
}

// ---------------------------------------------------------
// Limiteur partagé
// ---------------------------------------------------------

export const limiter = new RateLimiter(
  Number(process.env.MIN_INTERVAL_MS ?? 1000),
);

const log = (
  attempt: number,
  wait: number,
  e: unknown,
) => {
  console.warn(
    `↻ tentative ${attempt} dans ${Math.round(wait)} ms (${
      e instanceof HttpError
        ? e.status
        : e instanceof Error
          ? e.message
          : String(e)
    })`,
  );
};

// ---------------------------------------------------------
// 4. Appel LLM sans streaming
// ---------------------------------------------------------

export async function chat(
  messages: Msg[],
  opts: {
    signal?: AbortSignal;
    temperature?: number;
    maxTokens?: number;
  } = {},
) {
  const res = await withRetry(
    () =>
      limiter.schedule(() =>
        post(
          {
            model: config.model,
            messages,
            temperature: opts.temperature ?? 0.3,
            max_tokens: opts.maxTokens,
          },
          {
            signal: opts.signal,
          },
        ),
      ),
    {
      onRetry: log,
    },
  );

  const data = (await res.json()) as {
    model: string;
    choices: {
      message: {
        content: string;
      };
    }[];
    usage: Usage;
  };

  return {
    text: data.choices[0].message.content,
    usage: data.usage,
    model: data.model,
  };
}

// ---------------------------------------------------------
// 5. Appel LLM avec streaming
// ---------------------------------------------------------

export async function* chatStream(
  messages: Msg[],
  opts: {
    signal?: AbortSignal;
    temperature?: number;
    maxTokens?: number;
  } = {},
): AsyncGenerator<{ delta: string } | { usage: Usage }> {
  const res = await withRetry(
    () =>
      limiter.schedule(() =>
        post(
          {
            model: config.model,
            messages,
            stream: true,
            stream_options: {
              include_usage: true,
            },
            temperature: opts.temperature ?? 0.5,
            max_tokens: opts.maxTokens,
          },
          {
            signal: opts.signal,
            timeoutMs: 120_000,
          },
        ),
      ),
    {
      onRetry: log,
    },
  );

  if (!res.body) {
    throw new Error("La réponse HTTP ne contient aucun flux.");
  }

  for await (const data of parseSSE(res.body)) {
    const chunk = JSON.parse(data);

    // Erreur envoyée pendant le streaming
    if (chunk.error) {
      throw new HttpError(
        500,
        chunk.error.message ?? "Erreur pendant le streaming",
      );
    }

    // Récupérer le texte généré
    const delta: string =
      chunk.choices?.[0]?.delta?.content ?? "";

    if (delta) {
      yield { delta };
    }

    // Récupérer les statistiques de tokens
    if (chunk.usage) {
      yield {
        usage: chunk.usage as Usage,
      };
    }
  }
}
