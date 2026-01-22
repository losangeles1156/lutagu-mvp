'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MarkdownRendererProps {
    children: string;
}

const MarkdownRenderer = ({ children }: MarkdownRendererProps) => {
    return (
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {children}
        </ReactMarkdown>
    );
};

export default MarkdownRenderer;
