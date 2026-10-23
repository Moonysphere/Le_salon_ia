
/**
 * Transforme un flux d'octets en une suite
 * de charges utiles data: (chaînes).
 */
export async function* parseSSE(
  body: ReadableStream<Uint8Array>
): AsyncGenerator<string> {
  const decoder = new TextDecoder();
  let buffer = "";

  for await (const chunk of body) {
    // Décoder les octets UTF-8
    buffer += decoder.decode(chunk, { stream: true });

    // Normaliser les fins de ligne Windows
    buffer = buffer.replace(/\r\n/g, "\n");

    // Extraire tous les événements complets
    let index: number;

    while ((index = buffer.indexOf("\n\n")) !== -1) {
      const event = buffer.slice(0, index);

      // Retirer l'événement traité du tampon
      buffer = buffer.slice(index + 2);

      // Récupérer les lignes data:
      const data = event
        .split("\n")
        .filter((line) => line.startsWith("data:"))
        .map((line) => line.slice(5).trimStart())
        .join("\n");

      // Ignorer les événements sans données
      if (!data) continue;

      // Fin du streaming
      if (data.trim() === "[DONE]") {
        return;
      }

      // Envoyer les données à chatStream()
      yield data;
    }
  }
}
