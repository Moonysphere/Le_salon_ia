// TP 1.3 — Le SDK officiel d'OpenAI : même requête, typée, avec retries et timeouts.
import { config, openai } from "../src/config.js";

const client = openai();

// TODO : Appeler client.chat.completions.create avec le modèle de config, un message system et un message user, puis afficher le contenu, le modèle qui a répondu et l'usage.
throw new Error("À implémenter : voir la consigne ci-dessus");

// À observer : changez OPENAI_BASE_URL (faux serveur, autre fournisseur compatible) : le code ne bouge pas.
// C'est ça, un standard de fait.
