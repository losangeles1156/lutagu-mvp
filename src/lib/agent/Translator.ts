import { generateText } from 'ai';
import { AIRouter, TaskType } from './AIRouter';
import { getDictionaryPrompt } from '../i18n/Dictionary';

export class Translator {
    /**
     * 高品質翻譯任務（針對日本交通背景）
     */
    static async translate(text: string, targetLocale: string): Promise<string> {
        const route = AIRouter.getRoute(TaskType.CONSISTENT_TRANSLATION);
        const dictionary = getDictionaryPrompt();

        const systemPrompt = `
You are an expert translator specializing in Tokyo's public transport system.
Your task is to translate the given text into ${targetLocale} while maintaining technical accuracy and terminology consistency.

CRITICAL INSTRUCTIONS:
1. USE the following terminology dictionary for consistency:
${dictionary}

2. Keep station names and operator names recognizable (provide both original and translated if applicable).
3. Do not translate technical codes or IDs.
4. If a term is not in the dictionary, ensure it follows standard transport terminology.
        `;

        try {
            const { text: translated } = await generateText({
                model: route.primary,
                system: systemPrompt,
                prompt: `Translate this: ${text}`
            });

            return translated;
        } catch (error) {
            console.error('[Translator] Primary translation failed, using fallback:', error);

            // Fallback to secondary model
            const { text: fallbackTranslated } = await generateText({
                model: route.fallback,
                system: systemPrompt,
                prompt: `Translate this: ${text}`
            });

            return fallbackTranslated;
        }
    }
}
