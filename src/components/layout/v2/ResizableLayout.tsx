'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';

/**
 * ResizableLayout (V2)
 * 
 * A robust two-pane layout with a draggable divider.
 * - Desktop: Sidebar (Right) is resizable via drag handle.
 * - Mobile: Adapts to stack or overlay (handled by children/MainLayout logic).
 * 
 * Features:
 * - Persists width to localStorage
 * - Min/Max width constraints (300px - 50%)
 * - Smooth resizing without layout thrashing (using ref based updates during drag)
 */

interface ResizableLayoutProps {
    leftPanel: React.ReactNode;
    rightPanel: React.ReactNode;
    isMobile: boolean;
    rightPanelVisible: boolean;
    initialWidth?: number;
}

const MIN_WIDTH = 320;
const MAX_WIDTH_PERCENT = 0.5; // 50% screen width
const DEFAULT_WIDTH = 400;

export function ResizableLayout({
    leftPanel,
    rightPanel,
    isMobile,
    rightPanelVisible,
    initialWidth = DEFAULT_WIDTH
}: ResizableLayoutProps) {
    const [sidebarWidth, setSidebarWidth] = useState(initialWidth);
    const containerRef = useRef<HTMLDivElement>(null);
    const isDragging = useRef(false);

    // Load persisted width on mount
    useEffect(() => {
        try {
            const saved = localStorage.getItem('lutagu_sidebar_width');
            if (saved) {
                const w = parseInt(saved, 10);
                if (!isNaN(w) && w >= MIN_WIDTH) setSidebarWidth(w);
            }
        } catch (e) {
            // ignore
        }
    }, []);

    const startResize = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        isDragging.current = true;
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none'; // Prevent text selection during drag

        const handleMouseMove = (mv: MouseEvent) => {
            if (!isDragging.current || !containerRef.current) return;

            const containerRect = containerRef.current.getBoundingClientRect();
            // Calculate new width: Container Right - Mouse X
            let newWidth = containerRect.right - mv.clientX;

            // Constraints
            const maxWidth = containerRect.width * MAX_WIDTH_PERCENT;

            if (newWidth < MIN_WIDTH) newWidth = MIN_WIDTH;
            if (newWidth > maxWidth) newWidth = maxWidth;

            setSidebarWidth(newWidth);
        };

        const handleMouseUp = () => {
            isDragging.current = false;
            document.body.style.cursor = '';
            document.body.style.userSelect = '';

            // Persist
            try {
                // Since state update is async, we use the value from current render cycle 
                // or just rely on next useEffect. Better to persist inside Move or here with ref?
                // Actually setSidebarWidth triggers re-render, so we can persist in useEffect [sidebarWidth]
            } catch (e) { }

            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
    }, []);

    // Persist effect
    useEffect(() => {
        localStorage.setItem('lutagu_sidebar_width', sidebarWidth.toString());
    }, [sidebarWidth]);

    if (isMobile) {
        // Mobile Layout: Just render panels normally (stacked or relative)
        // MainLayout.tsx handles the bottom sheet logic for 'rightPanel' (Chat)
        return (
            <div className="flex-1 relative flex flex-col overflow-hidden">
                {leftPanel}
                {rightPanelVisible && rightPanel} {/* Usually absolute positioned in Mobile */}
            </div>
        );
    }

    return (
        <div ref={containerRef} className="flex-1 flex overflow-hidden relative w-full h-full">
            {/* Left Panel (Map) - Flex Grow */}
            <div className="flex-1 relative overflow-hidden min-w-0">
                {leftPanel}
            </div>

            {/* Divider & Right Panel (Sidebar) */}
            {rightPanelVisible && (
                <>
                    {/* Drag Handle */}
                    <div
                        onMouseDown={startResize}
                        className="w-1.5 hover:w-2 bg-slate-100 hover:bg-indigo-400 cursor-col-resize z-40 transition-colors flex flex-col justify-center items-center group touch-none select-none active:bg-indigo-600"
                        title="Drag to resize"
                    >
                        {/* Visual Grip Indicator */}
                        <div className="h-8 w-0.5 bg-slate-300 group-hover:bg-white rounded-full" />
                    </div>

                    {/* Right Panel (Chat) - Fixed Width */}
                    <div
                        style={{ width: sidebarWidth }}
                        className="h-full border-l border-slate-200 bg-white shadow-xl relative z-30 flex flex-col"
                    >
                        {rightPanel}
                    </div>
                </>
            )}
        </div>
    );
}
