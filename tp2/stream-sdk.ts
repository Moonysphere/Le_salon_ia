// TP 2.3 — Le même flux avec le SDK : il fait le parsing SSE pour vous.
import { config, openai } from "../src/config.js";

const client = openai();
const t0 = performance.now();
let first: number | null = null;

// TODO : Appeler client.chat.completions.create avec stream: true, itérer sur les morceaux (chunk.choices[0].delta.content) et afficher le texte au fil de l'eau. Mesurer le TTFT. Demandez l'usage avec stream_options : il arrive dans un dernier morceau sans choices.
throw new Error("À implémenter : voir la consigne ci-dessus");
console.log(`TTFT ${Math.round(first ?? 0)} ms · total ${Math.round(performance.now() - t0)} ms`);
