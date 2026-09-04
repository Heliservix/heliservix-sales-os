// Lee una factura (foto o PDF) con Claude (visión) y devuelve los ítems,
// cantidades y costos en JSON estructurado — Adolfo (sept 2026) eligió esta
// ruta de pago después de que se le explicara el costo/alternativa (misma
// decisión que ya se le había planteado para AURA y para la Libreta de
// Marino — ver lib/document-vision.ts, que usa OCR gratis porque en esos
// casos él prefirió no pagar; esta vez sí quiere la IA de pago porque el
// resultado directo es dinero real: costo de material por faena).
//
// Requiere la variable de entorno ANTHROPIC_API_KEY configurada en Vercel —
// Claude (yo, dentro de esta conversación) NO puede crear esa cuenta ni
// pegar la clave por ti (manejar API keys es una acción prohibida para el
// agente, ver reglas de seguridad); Adolfo tiene que generarla él mismo en
// console.anthropic.com y pegarla en Vercel → Settings → Environment
// Variables. Si la variable no está configurada, esta función devuelve un
// resultado claro en vez de fallar en silencio, y la factura queda en
// estado "Pending" para carga manual — el resto del flujo (subir el
// archivo, revisar/corregir líneas, confirmar y que suban a inventario)
// funciona igual sin la IA, solo que Adolfo escribe los ítems a mano.
const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-sonnet-5";

export type ExtractedInvoiceLineItem = {
  itemName: string;
  partNumber: string | null;
  quantity: number;
  unitCost: number | null;
};

export type ExtractedInvoice = {
  vendor: string | null;
  invoiceNumber: string | null;
  invoiceDate: string | null; // YYYY-MM-DD
  currency: string;
  totalAmount: number | null;
  lineItems: ExtractedInvoiceLineItem[];
};

export type InvoiceExtractionResult =
  | { ok: true; data: ExtractedInvoice; notes: string | null }
  | { ok: false; error: string };

const PROMPT = `Esta imagen o PDF es una factura de compra de repuestos/materiales/servicios para una empresa de helicópteros. Léela con cuidado y devuelve ÚNICAMENTE un objeto JSON (sin texto antes ni después, sin markdown) con esta forma exacta:

{
  "vendor": string | null,          // nombre del proveedor/vendedor
  "invoiceNumber": string | null,   // número de factura
  "invoiceDate": string | null,     // fecha en formato YYYY-MM-DD, o null si no es clara
  "currency": string,               // código de 3 letras, ej "USD". Si no está claro, usa "USD".
  "totalAmount": number | null,     // monto total de la factura
  "lineItems": [
    {
      "itemName": string,           // descripción del ítem tal como aparece
      "partNumber": string | null,  // número de parte/referencia, si aparece
      "quantity": number,           // cantidad
      "unitCost": number | null     // costo unitario (si solo hay total de línea, divide entre cantidad)
    }
  ]
}

Si un campo no aparece con claridad en el documento, usa null en vez de inventar un valor. Si no puedes leer el documento en absoluto, devuelve lineItems como arreglo vacío y los demás campos en null.`;

function bytesToBase64(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("base64");
}

export async function extractInvoiceWithClaude(fileBytes: Uint8Array, mimeType: string): Promise<InvoiceExtractionResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return {
      ok: false,
      error:
        "La lectura automática de facturas no está activada todavía — falta configurar ANTHROPIC_API_KEY en el servidor. La factura se guardó, completa los ítems a mano abajo."
    };
  }

  const isPdf = mimeType === "application/pdf";
  const content = [
    {
      type: isPdf ? "document" : "image",
      source: { type: "base64", media_type: mimeType, data: bytesToBase64(fileBytes) }
    },
    { type: "text", text: PROMPT }
  ];

  try {
    const response = await fetch(ANTHROPIC_API_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 2000,
        messages: [{ role: "user", content }]
      })
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      return { ok: false, error: `El servicio de lectura de facturas respondió con un error (${response.status}). ${body.slice(0, 300)}` };
    }

    const json = (await response.json()) as { content?: Array<{ type: string; text?: string }> };
    const textBlock = json.content?.find((block) => block.type === "text")?.text;
    if (!textBlock) return { ok: false, error: "La IA no devolvió texto legible para esta factura — completa los ítems a mano." };

    // Claude a veces envuelve el JSON en ```json ... ``` a pesar de la
    // instrucción — se limpia antes de parsear en vez de fallar por eso.
    const cleaned = textBlock.trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "");
    let parsed: unknown;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      return { ok: false, error: "No se pudo interpretar la respuesta de la IA para esta factura — completa los ítems a mano." };
    }

    const data = parsed as Record<string, unknown>;
    const rawLineItems = Array.isArray(data.lineItems) ? (data.lineItems as unknown[]) : [];
    const lineItems: ExtractedInvoiceLineItem[] = rawLineItems
      .filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null)
      .map((item) => ({
        itemName: typeof item.itemName === "string" && item.itemName.trim() ? item.itemName.trim() : "Ítem sin nombre",
        partNumber: typeof item.partNumber === "string" && item.partNumber.trim() ? item.partNumber.trim() : null,
        quantity: typeof item.quantity === "number" && item.quantity > 0 ? item.quantity : 1,
        unitCost: typeof item.unitCost === "number" ? item.unitCost : null
      }));

    return {
      ok: true,
      data: {
        vendor: typeof data.vendor === "string" ? data.vendor : null,
        invoiceNumber: typeof data.invoiceNumber === "string" ? data.invoiceNumber : null,
        invoiceDate: typeof data.invoiceDate === "string" ? data.invoiceDate : null,
        currency: typeof data.currency === "string" && data.currency ? data.currency : "USD",
        totalAmount: typeof data.totalAmount === "number" ? data.totalAmount : null,
        lineItems
      },
      notes: lineItems.length ? null : "La IA no identificó líneas de ítems en esta factura — revisa el archivo y agrégalos a mano si hace falta."
    };
  } catch (err) {
    return { ok: false, error: `No se pudo contactar el servicio de lectura de facturas: ${(err as Error).message}` };
  }
}
