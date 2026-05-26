// src/workers/search.worker.ts

import {
  env,
  AutoTokenizer,
  AutoProcessor,
  SiglipTextModel,
  SiglipVisionModel,
  RawImage,
} from "@huggingface/transformers";

env.allowLocalModels = false;
env.allowRemoteModels = true;

const MODEL_ID = "Xenova/siglip-base-patch16-224";

// Заменяем ClipItem на ModeItem
type ModeItem = { id: number; description: string }; // теперь item - это режим (mode)

class SiglipService {
  static tokenizer: Awaited<ReturnType<typeof AutoTokenizer.from_pretrained>> | null = null;
  static processor: Awaited<ReturnType<typeof AutoProcessor.from_pretrained>> | null = null;
  static textModel: Awaited<ReturnType<typeof SiglipTextModel.from_pretrained>> | null = null;
  static visionModel: Awaited<ReturnType<typeof SiglipVisionModel.from_pretrained>> | null = null;

  static async init(progress_callback?: (data: unknown) => void) {
    if (!this.tokenizer) {
      const options = { device: "wasm", dtype: "q8" } as const;

      this.tokenizer = await AutoTokenizer.from_pretrained(MODEL_ID, { progress_callback });
      this.processor = await AutoProcessor.from_pretrained(MODEL_ID, { progress_callback });
      this.textModel = await SiglipTextModel.from_pretrained(MODEL_ID, {
        ...options,
        progress_callback,
      });
      this.visionModel = await SiglipVisionModel.from_pretrained(MODEL_ID, {
        ...options,
        progress_callback,
      });
    }
  }
}

self.addEventListener(
    "message",
    async (event: MessageEvent<{ type: string; data: unknown }>) => {
      const { type, data } = event.data;

      try {
        if (type === "init") {
          await SiglipService.init((msg) => {
            self.postMessage({ type: "progress", data: msg });
          });

          // Теперь data - это ModeItem[]
          const items = data as ModeItem[];
          const embeddings: Record<number, number[]> = {}; // id -> embedding

          const descriptions = items.map((item) => item.description);
          const text_inputs = await SiglipService.tokenizer!(descriptions, {
            padding: "max_length",
            truncation: true,
          });

          const { pooler_output: textOutput } = await SiglipService.textModel!(text_inputs);

          const embeddingSize = 768;

          for (let i = 0; i < items.length; i++) {
            const start = i * embeddingSize;
            const end = start + embeddingSize;
            const textVector = textOutput.data.slice(start, end);

            const itemId = items[i].id; // id режима
            embeddings[itemId] = Array.from(textVector);
          }

          self.postMessage({ type: "text_embeddings_ready", data: embeddings });
        } else if (type === "image") {
          const imageUrl = URL.createObjectURL(data as Blob);
          const image = await RawImage.read(imageUrl);

          const imageInputs = await SiglipService.processor!(image);
          const { pooler_output } = await SiglipService.visionModel!(imageInputs);

          self.postMessage({
            type: "image_embedding_ready",
            data: Array.from(pooler_output.data),
          });

          URL.revokeObjectURL(imageUrl);
        }
      } catch (error) {
        console.error(error);
        const message = error instanceof Error ? error.message : String(error);
        self.postMessage({ type: "error", data: message });
      }
    },
);

export {};