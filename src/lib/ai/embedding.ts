
/**
 * Embedding Generation Utility
 */

export async function generateEmbedding(text: string): Promise<number[]> {
  const apiKey = process.env.GOOGLE_API_KEY;

  if (!apiKey) {
    console.warn('GOOGLE_API_KEY not found, using fallback embedding');
    return fallbackEmbedding(text);
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'models/text-embedding-004',
          content: { parts: [{ text }] }
        })
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Google Embedding API Error:', errorData);
      throw new Error(`Embedding API error: ${response.statusText}`);
    }

    const data: any = await response.json();
    if (!data.embedding || !data.embedding.values) {
      console.error('Invalid embedding response format:', data);
      return fallbackEmbedding(text);
    }
    
    return data.embedding.values;
  } catch (error) {
    console.error('Error generating embedding:', error);
    return fallbackEmbedding(text);
  }
}

function fallbackEmbedding(text: string): number[] {
  // Simple deterministic fallback for testing
  const dim = 768;
  const result = new Array(dim).fill(0);
  for (let i = 0; i < text.length && i < dim; i++) {
    result[i] = text.charCodeAt(i) / 255;
  }
  return result;
}
