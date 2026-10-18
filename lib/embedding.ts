import { pipeline } from '@xenova/transformers';

type PipelineType = any;

const globalForEmbedding = globalThis as unknown as {
  embeddingPipelinePromise?: Promise<PipelineType>;
};

async function getEmbeddingPipeline(): Promise<PipelineType> {
  if (!globalForEmbedding.embeddingPipelinePromise) {
    globalForEmbedding.embeddingPipelinePromise = pipeline(
      'feature-extraction',
      'Xenova/all-MiniLM-L6-v2'
    );
  }
  return globalForEmbedding.embeddingPipelinePromise;
}

/**
 * Generates a 384-element float array (normalized for cosine distance)
 * using the Xenova/all-MiniLM-L6-v2 model.
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const pipe = await getEmbeddingPipeline();
  const output = await pipe(text, { pooling: 'mean', normalize: true });
  return Array.from(output.data);
}
