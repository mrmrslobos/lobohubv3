import React from 'react';

type IconProps = React.SVGProps<SVGSVGElement>;

const base: IconProps = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
};

export const IconAsk: React.FC<IconProps> = (props) => (
  <svg {...base} {...props}>
    <path d="M4 5h16a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H9l-4 4v-4H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z" />
    <path d="M7 9h10M7 12h6" />
  </svg>
);

export const IconLibrary: React.FC<IconProps> = (props) => (
  <svg {...base} {...props}>
    <path d="M4 4.5v16M9 4v16.5M14.3 4.7l3.4 15.7M19.5 4v16" />
    <path d="M2.5 20.5h19" />
  </svg>
);

export const IconHistory: React.FC<IconProps> = (props) => (
  <svg {...base} {...props}>
    <path d="M3 12a9 9 0 1 0 3-6.7" />
    <path d="M3 4v4h4" />
    <path d="M12 8v4l3 2" />
  </svg>
);

export const IconAdmin: React.FC<IconProps> = (props) => (
  <svg {...base} {...props}>
    <line x1="4" y1="6" x2="20" y2="6" />
    <circle cx="13" cy="6" r="2" />
    <line x1="4" y1="12" x2="20" y2="12" />
    <circle cx="8" cy="12" r="2" />
    <line x1="4" y1="18" x2="20" y2="18" />
    <circle cx="17" cy="18" r="2" />
  </svg>
);

export const IconSearch: React.FC<IconProps> = (props) => (
  <svg {...base} {...props}>
    <circle cx="10.5" cy="10.5" r="6.5" />
    <path d="M15.5 15.5 21 21" />
  </svg>
);

export const IconSend: React.FC<IconProps> = (props) => (
  <svg {...base} {...props}>
    <path d="M4 12h15M13 6l6 6-6 6" />
  </svg>
);

export const IconChevron: React.FC<IconProps> = (props) => (
  <svg {...base} {...props}>
    <path d="M6 9l6 6 6-6" />
  </svg>
);

export const IconSignOut: React.FC<IconProps> = (props) => (
  <svg {...base} {...props}>
    <path d="M9 4H5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h4" />
    <path d="M13 8l4 4-4 4M17 12H9" />
  </svg>
);

export const IconMenu: React.FC<IconProps> = (props) => (
  <svg {...base} {...props}>
    <path d="M4 7h16M4 12h16M4 17h16" />
  </svg>
);

export const IconClose: React.FC<IconProps> = (props) => (
  <svg {...base} {...props}>
    <path d="M6 6l12 12M18 6 6 18" />
  </svg>
);

export const IconRefresh: React.FC<IconProps> = (props) => (
  <svg {...base} {...props}>
    <path d="M3 12a9 9 0 0 1 15.3-6.4M21 12a9 9 0 0 1-15.3 6.4" />
    <path d="M18 3v4h-4M6 21v-4h4" />
  </svg>
);
