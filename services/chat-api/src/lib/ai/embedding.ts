
/**
 * Embedding Generation Utility
 * Switched to Mistral Embeddings as Zeabur/Gemini Tokyo node lacks embedding support
 */

export async function generateEmbedding(text: string, inputType?: 'query' | 'document'): Promise<number[]> {
  const apiKey = process.env.VOYAGE_API_KEY;

  if (!apiKey) {
    console.warn('VOYAGE_API_KEY not found, using fallback embedding');
    return fallbackEmbedding(text);
  }

  try {
    const response = await fetch('https://api.voyageai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'voyage-4',
        input: [text],
        input_type: inputType
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: response.statusText }));
      console.error('Voyage Embedding API Error:', response.status, errorData);
      throw new Error(`Embedding API error: ${response.status}`);
    }

    const data: any = await response.json();
    if (!data.data?.[0]?.embedding) {
      console.error('Invalid embedding response format:', data);
      return fallbackEmbedding(text);
    }

    return data.data[0].embedding;
  } catch (error: any) {
    if (error.message?.includes('429')) {
      throw error;
    }
    console.error('Error generating embedding:', error);
    return fallbackEmbedding(text);
  }
}


function fallbackEmbedding(text: string): number[] {
  // Simple deterministic fallback for testing
  const dim = 1024; // Mistral embed is 1024 dim
  const result = new Array(dim).fill(0);
  for (let i = 0; i < text.length && i < dim; i++) {
    result[i] = text.charCodeAt(i) / 255;
  }
  return result;
}
