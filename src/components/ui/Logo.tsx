import React from 'react';

interface LogoProps {
    className?: string;
    size?: number;
    color?: string;
}

export function Logo({ className, size = 32, color = 'currentColor' }: LogoProps) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 32 32"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={className}
        >
            <defs>
                <linearGradient id="lutagu-gradient" x1="4" y1="4" x2="28" y2="28" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#4F46E5" />
                    <stop offset="0.5" stopColor="#8B5CF6" />
                    <stop offset="1" stopColor="#EC4899" />
                </linearGradient>
            </defs>

            {/* LUTAGU Brand Icon: The "Navigator's Tag" */}
            {/* A continuous path forming an abstract 'L' with a tag-like terminus */}

            {/* Main Body */}
            <path
                d="M8 6C6.89543 6 6 6.89543 6 8V24C6 26.2091 7.79086 28 10 28H22C24.2091 28 26 26.2091 26 24V20C26 18.8954 25.1046 18 24 18H14C12.8954 18 12 17.1046 12 16V10C12 8.89543 11.1046 8 10 8H8Z"
                fill={color === 'currentColor' ? 'url(#lutagu-gradient)' : color}
            />

            {/* The "Tag" Element (Top Right floating) */}
            <path
                d="M16 6H24C25.1046 6 26 6.89543 26 8V14C26 15.1046 25.1046 16 24 16H16C14.8954 16 14 15.1046 14 14V8C14 6.89543 14.8954 6 16 6Z"
                fill={color === 'currentColor' ? '#4F46E5' : color}
                fillOpacity="0.15"
            />
             <path
                d="M18 8H22C23.1046 8 24 8.89543 24 10V12C24 13.1046 23.1046 14 22 14H18C16.8954 14 16 13.1046 16 12V10C16 8.89543 16.8954 8 18 8Z"
                fill={color === 'currentColor' ? '#4F46E5' : color}
            />

            {/* Connection Dot */}
            <circle cx="21" cy="11" r="1.5" fill="white" />
        </svg>
    );
}
