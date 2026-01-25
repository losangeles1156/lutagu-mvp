export const FARE_RULES_SKILL = {
    name: 'check-fare-rules',
    keywords: ['票', '錢', 'suica', 'pasmo', '優惠', 'fare', 'cost', 'price', 'ticket', 'ic card', 'pass', 'jr pass', 'tokyo subway ticket', 'day pass'],
    content: `
# Check Fare Rules Skill (Active)
> **MIGRATED**: Content has been moved to \`.agent/skills/tokyo-expert-knowledge/reference/fare-rules.md\`.
> Please read that file or query the Knowledge Base.
`
};

export const MEDICAL_SKILL = {
    name: 'find-medical-care',
    keywords: ['不舒服', '生病', '看醫生', '醫院', '診所', '發燒', '痛', '掛號', '急診', '救護車', '呼吸困難', '喘', '難過', 'sick', 'doctor', 'hospital', 'pain', 'fever', 'clinic', 'medicine', '藥'],
    content: `
# Find Medical Care Skill (Active)
> **MIGRATED**: Content has been moved to \`.agent/skills/tokyo-expert-knowledge/reference/medical-guide.md\`.
> Please read that file or query the Knowledge Base.
`
};

export const VIBE_MATCHER_SKILL = {
    name: 'vibe-matcher',
    keywords: ['crowded', 'people', 'busy', 'quiet', 'calm', 'vibe', 'atmosphere', 'similar', 'like', '人多', '擁擠', '吵', '安靜', '氣氛', '類似', '像', '人潮'],
    content: `
# Vibe Matcher Skill (Deep Research)
> **MIGRATED**: Content has been moved to \`.agent/skills/strategies/deep-research/vibe-matcher.md\`.
> Please read that file or query the Knowledge Base.
`
};

export const SPATIAL_REASONER_SKILL = {
    name: 'spatial-reasoner',
    keywords: ['delay', 'stopped', 'late', 'accident', 'suspended', 'alternative', 'detour', 'walk', 'route', '延遲', '停駛', '事故', '見合', '替代', '繞路', '走過去', '怎麼去'],
    content: `
# Spatial Reasoner Skill (Deep Research)
> **MIGRATED**: Content has been moved to \`.agent/skills/strategies/deep-research/spatial-reasoner.md\`.
> Please read that file or query the Knowledge Base.
`
};

export const FACILITY_PATHFINDER_SKILL = {
    name: 'facility-pathfinder',
    keywords: ['stroller', 'wheelchair', 'elevator', 'lift', 'ramp', 'stairs', 'heavy', 'luggage', 'baby', 'accessible', '嬰兒車', '輪椅', '電梯', '行李', '無障礙', '寶寶'],
    content: `
# Facility Pathfinder Skill (Deep Research)
> **MIGRATED**: Content has been moved to \`.agent/skills/strategies/deep-research/facility-pathfinder.md\`.
> Please read that file or query the Knowledge Base.
`
};

export const LAST_MILE_CONNECTOR_SKILL = {
    name: 'last-mile-connector',
    keywords: ['far', 'walk', 'bus', 'remote', 'taxi', 'luup', 'scooter', '遠', '走路', '公車', '巴士', '交通不便', '難去', '計程車', '電動滑板車', 'last mile'],
    content: `
# Last Mile Connector Skill (Deep Research)
> **MIGRATED**: Content has been moved to \`.agent/skills/strategies/deep-research/last-mile-connector.md\`.
> Please read that file or query the Knowledge Base.
`
};

export const CROWD_DISPATCHER_SKILL = {
    name: 'crowd-dispatcher', // Renamed from vibe-matcher
    keywords: ['crowded', 'people', 'busy', 'quiet', 'calm', 'vibe', 'atmosphere', 'similar', 'like', '人多', '擁擠', '吵', '安靜', '氣氛', '類似', '像', '人潮', 'overtourism'],
    content: `
# Crowd Dispatcher Skill (Deep Research)
> **MIGRATED**: Content has been moved to \`.agent/skills/strategies/deep-research/vibe-matcher.md\`.
> Please read that file or query the Knowledge Base.
`
};

export const LUGGAGE_LOGISTICS_SKILL = {
    name: 'luggage-logistics',
    keywords: ['locker', 'coin locker', 'baggage', 'luggage', 'heavy', 'store', 'keep', 'yamato', 'sagawa', 'hands-free', '寄物', '置物櫃', '行李', '重', '寄放', '宅急便'],
    content: `
# Luggage Logistics Skill (Deep Research)
> **MIGRATED**: Content has been moved to \`.agent/skills/strategies/deep-research/luggage-logistics.md\`.
> Please read that file or query the Knowledge Base.
`
};

export const ACCESSIBILITY_MASTER_SKILL = {
    name: 'accessibility-master', // Enhanced from facility-pathfinder
    keywords: ['stroller', 'wheelchair', 'elevator', 'lift', 'ramp', 'stairs', 'barrier-free', 'baby', 'accessible', '嬰兒車', '輪椅', '電梯', '行李', '無障礙', '寶寶', '斜坡'],
    content: `
# Accessibility Master Skill (Deep Research)
> **MIGRATED**: Content has been moved to \`.agent/skills/strategies/deep-research/facility-pathfinder.md\`.
> Please read that file or query the Knowledge Base.
`
};
// ... existing code ...

export const EXIT_STRATEGIST_SKILL = {
    name: 'exit-strategist',
    keywords: ['exit', 'way out', 'direction', 'where is', 'which exit', '出口', '幾號出口', '怎麼走', '去哪', '哪个出口'],
    content: `
# Exit Strategist Skill
> Helps users find the best exit for a specific POI.
`
};

export const LOCAL_GUIDE_SKILL = {
    name: 'local-guide',
    keywords: ['eat', 'food', 'restaurant', 'shop', 'recommend', 'lunch', 'dinner', 'cafe', '吃', '美食', '餐廳', '好玩', '景點', '推薦', '午餐', '晚餐', '伴手禮'],
    content: `
# Local Guide Skill
> Provides personalized recommendations using DeepSeek V3 (Creative).
`
};

export const STANDARD_ROUTING_SKILL = {
    name: 'standard-routing',
    keywords: ['route', 'go to', 'directions', 'transfer', 'way to', 'how to get', 'train to', '去', '到', '怎麼去', '路線', '轉乘', '前往', '交通', '乘換'],
    content: `
# Standard Routing Skill
> Standard navigation engine.
`
};
