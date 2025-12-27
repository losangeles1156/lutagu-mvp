'use client';

import { useState, useRef, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { StationUIProfile } from '@/lib/types/stationStandard';
import { Sparkles, Send, User, Bot, Loader2, Clock, Briefcase, Wallet, Armchair, Baby, Compass, MapPin, CheckCircle2 } from 'lucide-react';

interface L4_BambiProps {
    data: StationUIProfile;
}

interface Message {
    role: 'user' | 'assistant';
    content: string;
    isStrategy?: boolean; // New flag for structured response
}

export function L4_Bambi({ data }: L4_BambiProps) {
    const tL4 = useTranslations('l4');
    const { id: stationId, name } = data || {};

    // Robust Name Resolution
    const displayName = (name?.zh && name?.zh !== '車站' && name?.zh !== 'Station')
        ? name.zh
        : (name?.en || name?.ja || (stationId?.split(':').pop()?.split('.').pop()) || '車站');

    useEffect(() => {
        console.log('[L4_Bambi] Data:', data);
        console.log('[L4_Bambi] DisplayName:', displayName);
    }, [data, displayName]);

    // Chat State
    const [messages, setMessages] = useState<Message[]>([]);

    // Initialize greeting ONLY once when displayName becomes available
    const [hasGreeted, setHasGreeted] = useState(false);
    useEffect(() => {
        if (displayName && !hasGreeted) {
            setMessages([{ role: 'assistant', content: tL4('initialMessage', { station: displayName }) }]);
            setHasGreeted(true);
        }
    }, [displayName, hasGreeted, tL4]);

    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // Cognitive State Visualization
    const [thinkingStep, setThinkingStep] = useState<string>('');

    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Hybrid UI State
    const [destination, setDestination] = useState('');
    const [selectedDemands, setSelectedDemands] = useState<string[]>([]);

    // Scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, thinkingStep]);

    // Send Message Logic
    const handleSend = async (text: string, contextOverride?: string) => {
        if (!text.trim() || isLoading) return;

        const userMsg = { role: 'user' as const, content: text };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsLoading(true);
        setThinkingStep(tL4('thinking.initializing'));

        // Fake "Thinking Steps" to visualize the 4 Dimensions
        const steps = [
            tL4('thinking.l2'),
            tL4('thinking.l3'),
            tL4('thinking.kb'),
            tL4('thinking.synthesizing')
        ];

        let stepIdx = 0;
        const stepInterval = setInterval(() => {
            if (stepIdx < steps.length) {
                setThinkingStep(steps[stepIdx]);
                stepIdx++;
            }
        }, 1500);

        try {
            // Force Chinese response in instructions
            const prompt = contextOverride || text;

            const response = await fetch('/api/agent/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: [...messages, userMsg],
                    nodeId: stationId,
                    inputs: {
                        user_context: `[SYSTEM: ROLE_DEFINITION] You are a station guide for ${displayName}. DO NOT ask for the user's starting location. Assume they are already at or near ${displayName}. Provide specific advice for this station directly. Requirement: ${text}`
                    }
                })
            });

            clearInterval(stepInterval);

            if (!response.ok) throw new Error('Network error');
            if (!response.body) throw new Error('No body');

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let accumulatedResponse = '';

            // Add an empty assistant message to stream into
            setMessages(prev => [...prev, { role: 'assistant', content: '' }]);
            setThinkingStep('');

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value);
                const lines = chunk.split('\n');

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            const data = JSON.parse(line.slice(6));
                            if (data.event === 'message') {
                                accumulatedResponse += data.answer;
                                setMessages(prev => {
                                    const newMsgs = [...prev];
                                    newMsgs[newMsgs.length - 1].content = accumulatedResponse;
                                    return newMsgs;
                                });
                            }
                        } catch (e) {
                            // Partials or heartbeat
                        }
                    }
                }
            }

        } catch (error) {
            console.error('Chat Error:', error);
            setMessages(prev => [...prev, { role: 'assistant', content: '抱歉，連線發生錯誤。' }]);
            clearInterval(stepInterval);
        } finally {
            setIsLoading(false);
            setThinkingStep('');
        }
    };

    const demands = [
        { id: 'speed', icon: Clock, label: tL4('demands.speed') },
        { id: 'luggage', icon: Briefcase, label: tL4('demands.luggage') },
        { id: 'budget', icon: Wallet, label: tL4('demands.budget') },
        { id: 'comfort', icon: Armchair, label: tL4('demands.comfort') },
        { id: 'family', icon: Baby, label: tL4('demands.family') },
        { id: 'accessibility', icon: Compass, label: tL4('demands.accessibility') }
    ];

    return (
        <div className="flex flex-col h-full bg-slate-50 relative overflow-hidden">
            {/* Header Area */}
            <div className="bg-white px-6 py-4 border-b border-gray-100 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-2">
                    <div className="p-2 bg-indigo-600 rounded-xl text-white">
                        <Sparkles size={18} />
                    </div>
                    <div>
                        <h3 className="font-black text-slate-800 tracking-tight">{tL4('bambiStrategy')}</h3>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{tL4('subtitle')}</p>
                    </div>
                </div>
            </div>

            {/* Message Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide">
                {messages.map((msg, idx) => (
                    <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] rounded-2xl p-4 shadow-sm ${msg.role === 'user'
                            ? 'bg-indigo-600 text-white rounded-tr-none'
                            : 'bg-white text-slate-700 rounded-tl-none border border-slate-100'
                            }`}>
                            <div className="flex items-center gap-2 mb-1 opacity-50">
                                {msg.role === 'user' ? <User size={12} /> : <Bot size={12} />}
                                <span className="text-[10px] font-black uppercase tracking-tighter">
                                    {msg.role === 'user' ? 'User' : 'BAMBI'}
                                </span>
                            </div>
                            <div className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</div>
                        </div>
                    </div>
                ))}

                {/* Thinking Indicator */}
                {thinkingStep && (
                    <div className="flex justify-start animate-in fade-in slide-in-from-left-2 duration-300">
                        <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm flex items-center gap-3">
                            <Loader2 size={16} className="text-indigo-600 animate-spin" />
                            <span className="text-xs font-bold text-slate-500 animate-pulse">{thinkingStep}</span>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Overlay (Hybrid Strategy) */}
            <div className="p-4 bg-white border-t border-slate-100 shadow-[0_-4px_20px_rgba(0,0,0,0.03)] rounded-t-[32px]">
                <div className="space-y-4 max-w-lg mx-auto">
                    {/* Destination Input */}
                    <div className="relative group">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors">
                            <MapPin size={18} />
                        </div>
                        <input
                            type="text"
                            placeholder={tL4('chips.route') + ' (e.g. 新宿)'}
                            value={destination}
                            onChange={(e) => setDestination(e.target.value)}
                            className="w-full pl-12 pr-4 py-4 bg-slate-50 border-none rounded-2xl text-sm font-bold text-slate-700 focus:ring-2 focus:ring-indigo-600 transition-all"
                        />
                    </div>

                    {/* Demand Chips (Multi-select) */}
                    <div className="flex overflow-x-auto gap-2 pb-1 scrollbar-hide">
                        {demands.map(demand => {
                            const isSelected = selectedDemands.includes(demand.id);
                            return (
                                <button
                                    key={demand.id}
                                    onClick={() => {
                                        if (isSelected) {
                                            setSelectedDemands(prev => prev.filter(id => id !== demand.id));
                                        } else {
                                            setSelectedDemands(prev => [...prev, demand.id]);
                                        }
                                    }}
                                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-xs font-black whitespace-nowrap transition-all ${isSelected
                                        ? 'bg-indigo-600 border-indigo-600 text-white shadow-md scale-105'
                                        : 'bg-white border-slate-100 text-slate-500 hover:border-indigo-200'
                                        }`}
                                >
                                    <demand.icon size={14} />
                                    {demand.label}
                                    {isSelected && <CheckCircle2 size={12} className="ml-1" />}
                                </button>
                            );
                        })}
                    </div>

                    {/* Action Button */}
                    <button
                        onClick={() => {
                            const demandLabels = demands
                                .filter(d => selectedDemands.includes(d.id))
                                .map(d => d.label)
                                .join('、');

                            const combinedText = `我想去「${destination}」。我的需求是「${demandLabels}」。`;
                            handleSend(combinedText, combinedText);
                        }}
                        disabled={!destination || isLoading}
                        className={`w-full py-4 rounded-2xl flex items-center justify-center gap-2 font-black text-sm tracking-widest transition-all ${!destination || isLoading
                            ? 'bg-slate-100 text-slate-300'
                            : 'bg-indigo-600 text-white shadow-[0_8px_20px_rgba(79,70,229,0.3)] hover:scale-[1.02] active:scale-95'
                            }`}
                    >
                        <Sparkles size={18} />
                        {tL4('chips.synthesize')}
                    </button>
                </div>
            </div>
        </div>
    );
}
