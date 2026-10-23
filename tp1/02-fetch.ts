
import { config, requireKey } from "../src/config.js";

const question =
  process.argv.slice(2).join(" ") ||
  "Donne trois usages d'un LLM dans une application métier.";

const t0 = performance.now();

// 1. Envoyer la requête POST
const res: Response = await fetch(`${config.baseURL}/chat/completions`, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${requireKey()}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    model: config.model,
    messages: [
      {
        role: "system",
        content: "Tu es un assistant utile. Réponds en français.",
      },
      {
        role: "user",
        content: question,
      },
    ],
    temperature: 0.7,
    max_tokens: 300,
  }),
});

// 2. Gérer les erreurs HTTP
if (!res.ok) {
  const errorBody = await res.text();
  console.error(`Erreur HTTP ${res.status}`);
  console.error(errorBody);
  process.exit(1);
}

// 3. Récupérer la réponse JSON
const data = (await res.json()) as {
  model: string;
  choices: {
    message: { content: string | null };
    finish_reason: string;
  }[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
};

// 4. Calculer la latence
const ms = Math.round(performance.now() - t0);

// 5. Afficher les résultats
console.log("Réponse :", data.choices[0]?.message.content);
console.log("Modèle :", data.model);
console.log("Raison d'arrêt :", data.choices[0]?.finish_reason);

console.log("Tokens envoyés :", data.usage.prompt_tokens);
console.log("Tokens générés :", data.usage.completion_tokens);
console.log("Total tokens :", data.usage.total_tokens);

console.log("Latence :", ms, "ms");

console.log(
  "Requêtes restantes :",
  res.headers.get("x-ratelimit-remaining-requests") ?? "Non communiqué"
);
