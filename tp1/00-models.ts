
import { config, requireKey } from "../src/config.js";

type Model = {
  id: string;
  created: number;
  owned_by: string;
};

const filtre = process.argv[2] ?? "";

// 1. Appel HTTP vers l'API
const response = await fetch(`${config.baseURL}/models`, {
  method: "GET",
  headers: {
    Authorization: `Bearer ${requireKey()}`,
  },
});

// 2. Vérification de la réponse
if (!response.ok) {
  throw new Error(`Erreur HTTP : ${response.status}`);
}

// 3. Conversion du JSON en objet TypeScript
const data = (await response.json()) as {
  data: Model[];
};

// 4. Filtrage et tri des identifiants
const models = data.data
  .map((model) => model.id)
  .filter((id) => id.includes(filtre))
  .sort((a, b) => a.localeCompare(b));

// 5. Affichage
models.forEach((id) => console.log(id));

console.log(
  `Modèle configuré dans .env : ${config.model} · temps réel : ${config.realtimeModel}`
);
