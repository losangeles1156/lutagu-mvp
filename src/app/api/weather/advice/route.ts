import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { generateLLMResponse } from '@/lib/ai/llmClient';

// Cache TTL
const NORMAL_TTL_HOURS = 1;
const EMERGENCY_TTL_MINUTES = 30;

// Severity-aware prompt templates
const PROMPT_TEMPLATES: Record<string, {
    maxWords: number;
    tone: string;
    systemPrompt: string;
    userPrompt: string;
}> = {
    critical: {
        maxWords: 30,
        tone: '嚴肅謹慎',
        systemPrompt: '你是東京旅遊緊急顧問。JMA發布緊急警報。提供清晰、務實的建議，不要恐慌放大。',
        userPrompt: '緊急警報：${summary}（${lang}）\n\n請用一句話說明：1. 當前狀況 2. 建議行動\n禁止使用「危險！」等誇張詞彙。'
    },
    warning: {
        maxWords: 35,
        tone: '提醒注意',
        systemPrompt: '你是東京旅遊安全顧問。JMA發布警報，請提供實用的防範建議。',
        userPrompt: '警報：${summary}（${lang}）\n\n請用一句話說明天氣影響和建議措施。語氣冷靜專業。'
    },
    advisory: {
        maxWords: 25,
        tone: '溫和提醒',
        systemPrompt: '你是東京旅遊助手。提供輕鬆實用的天氣建議。',
        userPrompt: '天氣提醒：${summary}（${lang}）\n\n請用一句話提供實用建議。語氣溫暖友善。'
    },
    info: {
        maxWords: 20,
        tone: '中性資訊',
        systemPrompt: '你是東京旅遊資訊助手。提供簡潔的天氣資訊。',
        userPrompt: '天氣：${condition}，氣溫${temp}°C（${lang}）\n\n請用一句話提供穿著/出行建議。'
    }
};

// User profile adjustments
const PROFILE_ADJUSTMENTS: Record<string, {
    multiplier: number;
    focus: string;
    extraPrompt: string;
}> = {
    wheelchair: {
        multiplier: 1.5,
        focus: '無障礙設施',
        extraPrompt: '（輪椅使用者：建議優先使用室內通道，確認電梯運作）'
    },
    stroller: {
        multiplier: 1.2,
        focus: '嬰兒車友好',
        extraPrompt: '（攜帶幼兒：注意地面濕滑，建議使用室內通道）'
    },
    large_luggage: {
        multiplier: 1.1,
        focus: '行李處理',
        extraPrompt: '（大型行李：建議利用寄物櫃，優先選擇電梯）'
    },
    general: {
        multiplier: 1.0,
        focus: '一般出行',
        extraPrompt: ''
    }
};

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const temp = searchParams.get('temp');
    const condition = searchParams.get('condition');
    const wind = searchParams.get('wind');
    const humidity = searchParams.get('humidity');
    const precipProb = searchParams.get('precipProb');
    const locale = searchParams.get('locale') || 'en';
    const userProfile = searchParams.get('user_profile') || 'general';

    const isEmergency = searchParams.get('emergency') === 'true';
    const severity = (searchParams.get('severity') as 'info' | 'advisory' | 'warning' | 'critical') || 'info';
    const jmaSummary = searchParams.get('jmaSummary') || '';

    if (!temp || !condition) {
        return NextResponse.json({ error: 'Missing temp or condition' }, { status: 400 });
    }

    const mode = isEmergency ? 'emergency' : 'normal';
    const currentTemp = parseFloat(temp);

    // Check Cache
    try {
        const now = new Date();
        const { data: cached } = await supabase
            .from('weather_advice_cache')
            .select('advice, jma_link, weather_data, expires_at')
            .eq('mode', mode)
            .eq('locale', locale)
            .eq('user_profile', userProfile)
            .gt('expires_at', now.toISOString())
            .order('created_at', { ascending: false })
            .limit(5);

        if (cached && cached.length > 0) {
            const closeMatch = cached.find(c => {
                const cachedTemp = c.weather_data?.temp;
                return cachedTemp !== undefined && Math.abs(cachedTemp - currentTemp) <= 2;
            });

            if (closeMatch) {
                return NextResponse.json({
                    advice: closeMatch.advice,
                    jma_link: closeMatch.jma_link,
                    mode,
                    locale,
                    user_profile: userProfile,
                    severity,
                    cached: true,
                    expires_at: closeMatch.expires_at
                });
            }
        }
    } catch (e) {
        console.warn('[Advice Cache] Read failed.');
    }

    // Generate New Advice
    const langMap: Record<string, string> = {
        'zh-TW': '繁體中文', 'zh': '繁體中文', 'ja': '日本語', 'en': 'English'
    };
    const lang = langMap[locale] || 'English';
    const profileConfig = PROFILE_ADJUSTMENTS[userProfile] || PROFILE_ADJUSTMENTS.general;
    const template = PROMPT_TEMPLATES[isEmergency ? severity : 'info'] || PROMPT_TEMPLATES.info;

    let prompt = template.userPrompt
        .replace('\${summary}', jmaSummary)
        .replace('\${temp}', String(currentTemp))
        .replace('\${condition}', condition)
        .replace('\${lang}', lang);

    prompt += profileConfig.extraPrompt;

    // Add weather notes
    let weatherNotes = '';
    if (precipProb && parseFloat(precipProb) > 50) {
        weatherNotes = '降雨機率較高，請攜帶雨具。';
    }
    if (wind && parseFloat(wind) > 10) {
        weatherNotes += '風速較強，請注意安全。';
    }
    if (weatherNotes) {
        prompt += `\n\n額外提醒：${weatherNotes}`;
    }

    try {
        const adviceContent = await generateLLMResponse({
            systemPrompt: template.systemPrompt,
            userPrompt: prompt,
            taskType: 'reasoning', // Use MiniMax-M2.1
            temperature: 0.2
        });

        let advice = (adviceContent || '').trim();
        advice = advice.replace(/^["']|["']$/g, '').replace(/^以下是.*?:/, '').trim();

        if (!advice) {
            throw new Error('Empty response from LLM');
        }

        const expiresAt = new Date();
        if (isEmergency) {
            expiresAt.setMinutes(expiresAt.getMinutes() + EMERGENCY_TTL_MINUTES);
        } else {
            expiresAt.setHours(expiresAt.getHours() + NORMAL_TTL_HOURS);
        }

        try {
            await supabase.from('weather_advice_cache').insert({
                mode,
                locale,
                user_profile: userProfile,
                advice,
                jma_link: isEmergency ? 'https://www.jma.go.jp/bosai/warning/' : null,
                weather_data: { temp: currentTemp, condition, wind, humidity, precipProb },
                severity,
                expires_at: expiresAt.toISOString()
            });
        } catch (e) {
            console.warn('[Advice Cache] Write failed.');
        }

        return NextResponse.json({
            advice,
            jma_link: isEmergency ? 'https://www.jma.go.jp/bosai/warning/' : null,
            mode,
            locale,
            user_profile: userProfile,
            severity,
            generated_at: new Date().toISOString()
        });

    } catch (error: any) {
        console.error('Weather Advice LLM Error:', error.message);

        const fallbacks: Record<string, Record<string, string>> = {
            critical: { 'zh-TW': '請關注官方警報，確保安全。', 'zh': '请关注官方警报，确保安全。', 'ja': '公式警報に注意してください。', 'en': 'Please follow official advisories.' },
            warning: { 'zh-TW': '請留意天氣變化。', 'zh': '请留意天气变化。', 'ja': '天候の変化に注意してください。', 'en': 'Please be aware of weather.' },
            advisory: { 'zh-TW': '祝您出行順利！', 'zh': '祝您出行顺利！', 'ja': '良い一日を！', 'en': 'Have a great day!' },
            info: { 'zh-TW': '祝您在東京度過愉快的一天！', 'zh': '祝您在东京度过愉快的一天！', 'ja': '東京で楽しい一日を！', 'en': 'Have a pleasant day in Tokyo!' }
        };

        const fallbackKey = isEmergency ? severity : 'info';
        const fallbackAdvice = fallbacks[fallbackKey]?.[locale] || fallbacks[fallbackKey]?.['en'] || 'Have a great day!';

        return NextResponse.json({
            advice: fallbackAdvice,
            jma_link: isEmergency ? 'https://www.jma.go.jp/bosai/warning/' : null,
            mode,
            locale,
            user_profile: userProfile,
            severity,
            fallback: true
        });
    }
}
