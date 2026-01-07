'use client';

import { useEffect, useState, useRef, useCallback, ReactNode } from 'react';
import { useAppStore } from '@/stores/appStore';

interface MainLayoutProps {
    mapPanel: ReactNode;
    chatPanel: ReactNode;
    bottomBar?: ReactNode;
    header?: ReactNode;
}

// Constants for panel sizing
const MIN_LEFT_WIDTH = 300;
const MIN_RIGHT_WIDTH = 320;
const DEFAULT_LEFT_RATIO = 0.6;
const MOBILE_BREAKPOINT = 1024;

// Local storage key for user preference
const PANEL_RATIO_KEY = 'lutagu_panel_ratio';

export function MainLayout({ mapPanel, chatPanel, bottomBar, header }: MainLayoutProps) {
    const isChatOpen = useAppStore((s) => s.isChatOpen);
    const setChatOpen = useAppStore((s) => s.setChatOpen);

    // Panel sizing state
    const [leftRatio, setLeftRatio] = useState(DEFAULT_LEFT_RATIO);
    const [isMobile, setIsMobile] = useState(false);
    const [isDragging, setIsDragging] = useState(false);

    const containerRef = useRef<HTMLDivElement>(null);
    const dragStartX = useRef(0);
    const dragStartRatio = useRef(DEFAULT_LEFT_RATIO);

    // Load saved preference
    useEffect(() => {
        const saved = localStorage.getItem(PANEL_RATIO_KEY);
        if (saved) {
            const ratio = parseFloat(saved);
            if (!isNaN(ratio) && ratio >= 0.3 && ratio <= 0.8) {
                setLeftRatio(ratio);
            }
        }
    }, []);

    // Handle responsive breakpoint
    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
        };

        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Save preference when ratio changes
    useEffect(() => {
        if (!isDragging) {
            localStorage.setItem(PANEL_RATIO_KEY, leftRatio.toString());
        }
    }, [leftRatio, isDragging]);

    // Handle drag for resizing (mouse)
    const handleDragStart = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        setIsDragging(true);
        dragStartX.current = e.clientX;
        dragStartRatio.current = leftRatio;
    }, [leftRatio]);

    // Handle drag for resizing (touch)
    const handleTouchStart = useCallback((e: React.TouchEvent) => {
        if (e.touches.length !== 1) return;
        setIsDragging(true);
        dragStartX.current = e.touches[0].clientX;
        dragStartRatio.current = leftRatio;
    }, [leftRatio]);

    useEffect(() => {
        if (!isDragging) return;

        const handleMove = (clientX: number) => {
            if (!containerRef.current) return;

            const containerWidth = containerRef.current.offsetWidth;
            const deltaX = clientX - dragStartX.current;
            const deltaRatio = deltaX / containerWidth;
            const newRatio = dragStartRatio.current + deltaRatio;

            // Clamp to valid range
            const minRatio = MIN_LEFT_WIDTH / containerWidth;
            const maxRatio = 1 - (MIN_RIGHT_WIDTH / containerWidth);
            setLeftRatio(Math.max(minRatio, Math.min(maxRatio, newRatio)));
        };

        const handleMouseMove = (e: MouseEvent) => handleMove(e.clientX);
        const handleTouchMove = (e: TouchEvent) => {
            if (e.touches.length === 1) handleMove(e.touches[0].clientX);
        };

        const handleEnd = () => {
            setIsDragging(false);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleEnd);
        document.addEventListener('touchmove', handleTouchMove, { passive: true });
        document.addEventListener('touchend', handleEnd);
        document.addEventListener('touchcancel', handleEnd);

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleEnd);
            document.removeEventListener('touchmove', handleTouchMove);
            document.removeEventListener('touchend', handleEnd);
            document.removeEventListener('touchcancel', handleEnd);
        };
    }, [isDragging]);

    // Calculate panel width
    const getLeftWidth = () => `${leftRatio * 100}%`;
    const getRightWidth = () => `${(1 - leftRatio) * 100}%`;

    // Mobile Layout
    if (isMobile) {
        return (
            <div className="flex flex-col h-screen bg-white">
                {/* Header */}
                {header && (
                    <div className="shrink-0 z-20">
                        {header}
                    </div>
                )}

                {/* Map Panel - Collapsible on mobile */}
                <div
                    className={`relative transition-all duration-300 ${isChatOpen ? 'h-[35vh] min-h-[240px]' : 'flex-1'
                        }`}
                >
                    {mapPanel}

                    {/* Quick toggle to chat */}
                    {!isChatOpen && (
                        <button
                            onClick={() => setChatOpen(true)}
                            className="absolute bottom-4 right-4 z-10 px-5 py-4 
                                bg-gradient-to-br from-indigo-600 to-indigo-800 
                                text-white rounded-2xl shadow-xl shadow-indigo-200
                                flex items-center gap-2 font-bold text-sm
                                active:scale-95 transition-all min-h-[52px]"
                        >
                            <span className="text-lg">💬</span>
                            <span>問 LUTAGU AI</span>
                        </button>
                    )}
                </div>

                {/* Chat Panel - Expandable on mobile */}
                {isChatOpen && (
                    <div className="flex-1 flex flex-col border-t border-slate-100 bg-white animate-in slide-in-from-bottom-4 duration-300">
                        {chatPanel}
                    </div>
                )}

                {/* Bottom Bar */}
                {bottomBar && !isChatOpen && (
                    <div className="shrink-0 z-20">
                        {bottomBar}
                    </div>
                )}
            </div>
        );
    }

    // Desktop Layout
    return (
        <div ref={containerRef} className="flex flex-col h-screen bg-white overflow-hidden">
            {/* Header */}
            {header && (
                <div className="shrink-0 z-20 border-b border-slate-100/50">
                    {header}
                </div>
            )}

            {/* Main Content Area */}
            <div className="flex-1 flex overflow-hidden relative">
                {/* Left Panel - Map */}
                <div
                    className="h-full overflow-hidden transition-all duration-200 ease-out"
                    style={{ width: getLeftWidth() }}
                >
                    {mapPanel}
                </div>

                {/* Resizable Divider */}
                <div
                    onMouseDown={handleDragStart}
                    onTouchStart={handleTouchStart}
                    className={`
                        w-1.5 h-full cursor-col-resize flex items-center justify-center
                        group hover:bg-indigo-100 transition-colors touch-none
                        ${isDragging ? 'bg-indigo-200' : 'bg-slate-100'}
                    `}
                >
                    <div className={`
                        w-1 h-16 rounded-full transition-colors
                        ${isDragging ? 'bg-indigo-500' : 'bg-slate-300 group-hover:bg-indigo-400'}
                    `} />
                </div>

                {/* Right Panel - Chat */}
                <div
                    className="h-full flex flex-col bg-white border-l border-slate-100 overflow-hidden transition-all duration-200 ease-out"
                    style={{ width: getRightWidth() }}
                >
                    {chatPanel}
                </div>
            </div>

            {/* Bottom Bar */}
            {bottomBar && (
                <div className="shrink-0 z-20 border-t border-slate-100/50">
                    {bottomBar}
                </div>
            )}
        </div>
    );
}

export default MainLayout;
