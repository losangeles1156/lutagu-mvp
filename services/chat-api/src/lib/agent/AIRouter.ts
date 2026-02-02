import { LanguageModel } from 'ai';
import {
    geminiFlashLite,
    geminiBrain,
    deepseekChat,
    geminiFlashFull
} from './providers';

export enum TaskType {
    REALTIME_INTERACTION = 'REALTIME_INTERACTION',
    LITERARY_GEN = 'LITERARY_GEN',
    CONSISTENT_TRANSLATION = 'CONSISTENT_TRANSLATION',
    ROUTING_LOGIC = 'ROUTING_LOGIC'
}

export interface ModelRoute {
    primary: LanguageModel;
    fallback: LanguageModel;
    description: string;
}

const ROUTES: Record<TaskType, ModelRoute> = {
    [TaskType.REALTIME_INTERACTION]: {
        primary: geminiFlashLite,
        fallback: geminiFlashFull,
        description: '極速交互型任務，優先使用 Flash Lite'
    },
    [TaskType.LITERARY_GEN]: {
        primary: deepseekChat,
        fallback: geminiBrain,
        description: '文學性/推理性背景生成任務，優先使用 DeepSeek V3'
    },
    [TaskType.CONSISTENT_TRANSLATION]: {
        primary: geminiFlashFull,
        fallback: geminiBrain,
        description: '高品質翻譯任務，優先使用 Gemini Flash'
    },
    [TaskType.ROUTING_LOGIC]: {
        primary: geminiBrain,
        fallback: geminiFlashFull,
        description: '複雜邏輯與工具調用任務'
    }
};

export class AIRouter {
    /**
     * 根據任務類型取得對應的模型路由
     */
    static getRoute(task: TaskType): ModelRoute {
        return ROUTES[task] || ROUTES[TaskType.REALTIME_INTERACTION];
    }

    /**
     * 檢查當前模型是否為 DeepSeek (用於監控)
     */
    static isDeepSeek(model: LanguageModel): boolean {
        // 透過 modelId 判斷，使用型別斷言規避 SDK 型別限制
        const m = model as any;
        return m.modelId === 'deepseek-v3' || (typeof m.modelId === 'string' && m.modelId.includes('deepseek'));
    }
}
