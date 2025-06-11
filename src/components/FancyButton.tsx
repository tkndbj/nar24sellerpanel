// src/components/FancyButton.tsx
'use client';

import React from 'react';
import Link from 'next/link';

interface FancyButtonProps {
  href?: string;
  onClick?: () => void;
  children: React.ReactNode;
  target?: string;
  className?: string;
}

const FancyButton: React.FC<FancyButtonProps> = ({
  href,
  onClick,
  children,
  target,
  className = '',
}) => {
  const baseClasses = `
    fancy-button
    relative inline-flex items-center justify-start
    py-3 pl-4 pr-12 overflow-hidden
    font-semibold shadow text-indigo-600
    transition-all duration-150 ease-in-out
    rounded hover:pl-10 hover:pr-6
    bg-gray-50 group
    ${className}
  `.trim().replace(/\s+/g, ' ');

  const content = (
    <>
      <span className="absolute bottom-0 left-0 w-full h-1 bg-indigo-600 transition-all duration-150 ease-in-out group-hover:h-full" />
      <span className="absolute right-0 pr-4 duration-200 ease-out group-hover:translate-x-12">
        <svg
          className="w-5 h-5 text-green-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M14 5l7 7m0 0l-7 7m7-7H3"
          />
        </svg>
      </span>
      <span className="absolute left-0 pl-2.5 -translate-x-12 ease-out duration-200 group-hover:translate-x-0">
        <svg
          className="w-5 h-5 text-green-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M14 5l7 7m0 0l-7 7m7-7H3"
          />
        </svg>
      </span>
      <span className="relative w-full text-left transition-colors duration-200 ease-in-out group-hover:text-white">
        {children}
      </span>
    </>
  );

  if (href) {
    return (
      <Link href={href} target={target} className={baseClasses}>
        {content}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} className={baseClasses}>
      {content}
    </button>
  );
};

export default FancyButton;
