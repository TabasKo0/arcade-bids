import React from 'react';

// Pixel Art SVGs based on ui.html 16x16 / 32x32 designs
export type SpriteName =
  | 'coin'
  | 'bolt'
  | 'racquet'
  | 'tent'
  | 'kettle'
  | 'keyboard'
  | 'earbuds'
  | 'camera'
  | 'console'
  | 'gavel'
  | 'chest'
  | 'receipt'
  | 'shield'
  | 'radar'
  | 'lens'
  | 'player'
  | 'sun';

export function PixelSprite({
  name,
  size = 32,
  className = '',
}: {
  name: SpriteName | string;
  size?: number;
  className?: string;
}) {
  const s = size;

  switch (name) {
    case 'bolt':
      return (
        <svg
          width={s}
          height={s}
          viewBox="0 0 16 16"
          className={`inline-block image-pixelated ${className}`}
          style={{ imageRendering: 'pixelated' }}
        >
          {/* Black outline */}
          <polygon points="9,0 2,9 6,9 5,16 14,5 8,5" fill="#07031a" />
          {/* Golden base */}
          <polygon points="9,1 3,9 7,9 6,15 13,6 9,6" fill="#ffc933" />
          {/* Orange core */}
          <polygon points="9,3 5,8 8,8 7,12 11,7 8,7" fill="#ff9a3c" />
        </svg>
      );

    case 'coin':
      return (
        <svg
          width={s}
          height={s}
          viewBox="0 0 16 16"
          className={`inline-block image-pixelated ${className}`}
          style={{ imageRendering: 'pixelated' }}
        >
          <circle cx="8" cy="8" r="7.5" fill="#07031a" />
          <circle cx="8" cy="8" r="6.5" fill="#c98a12" />
          <circle cx="8" cy="8" r="5.5" fill="#ffc933" />
          <rect x="4" y="4" width="3" height="1" fill="#fff1a8" />
          <rect x="3" y="5" width="1" height="3" fill="#fff1a8" />
          <rect x="5" y="5" width="6" height="1" fill="#c98a12" />
          <rect x="5" y="6" width="1" height="2" fill="#c98a12" />
          <rect x="5" y="8" width="6" height="1" fill="#c98a12" />
          <rect x="10" y="9" width="1" height="2" fill="#c98a12" />
          <rect x="5" y="11" width="6" height="1" fill="#c98a12" />
          <rect x="7" y="3" width="2" height="10" fill="#c98a12" />
        </svg>
      );

    case 'shield':
      return (
        <svg
          width={s}
          height={s}
          viewBox="0 0 16 16"
          className={`inline-block image-pixelated ${className}`}
          style={{ imageRendering: 'pixelated' }}
        >
          <polygon points="1,1 15,1 15,8 8,16 1,8" fill="#07031a" />
          <polygon points="2,2 14,2 14,8 8,15 2,8" fill="#49d6ff" />
          <polygon points="4,4 12,4 12,7.5 8,12 4,7.5" fill="#2a7fd6" />
          <rect x="7" y="5" width="2" height="4" fill="#fff1d0" />
          <rect x="7" y="10" width="2" height="1" fill="#fff1d0" />
        </svg>
      );

    case 'receipt':
      return (
        <svg
          width={s}
          height={s}
          viewBox="0 0 16 16"
          className={`inline-block image-pixelated ${className}`}
          style={{ imageRendering: 'pixelated' }}
        >
          <rect x="2" y="0" width="12" height="16" fill="#07031a" />
          <rect x="3" y="1" width="10" height="14" fill="#fff1d0" />
          {/* Jagged bottom */}
          <rect x="3" y="14" width="2" height="1" fill="#07031a" />
          <rect x="7" y="14" width="2" height="1" fill="#07031a" />
          <rect x="11" y="14" width="2" height="1" fill="#07031a" />
          {/* Text lines */}
          <rect x="5" y="3" width="6" height="1" fill="#7e87a6" />
          <rect x="5" y="5" width="6" height="1" fill="#7e87a6" />
          <rect x="5" y="7" width="4" height="1" fill="#7e87a6" />
          <rect x="5" y="10" width="6" height="2" fill="#ffc933" />
        </svg>
      );

    case 'gavel':
      return (
        <svg
          width={s}
          height={s}
          viewBox="0 0 16 16"
          className={`inline-block image-pixelated ${className}`}
          style={{ imageRendering: 'pixelated' }}
        >
          <line x1="6" y1="6" x2="13" y2="13" stroke="#07031a" strokeWidth="4" />
          <line x1="6" y1="6" x2="13" y2="13" stroke="#c68b59" strokeWidth="2" />
          <rect x="1" y="0" width="10" height="7" fill="#07031a" />
          <rect x="2" y="1" width="8" height="5" fill="#c68b59" />
          <rect x="2" y="1" width="1" height="5" fill="#7a4a2a" />
          <rect x="9" y="1" width="1" height="5" fill="#7a4a2a" />
          <rect x="3" y="2" width="5" height="1" fill="#e3b286" />
          <rect x="8" y="14" width="7" height="1" fill="#cfd6e8" />
        </svg>
      );

    case 'chest':
      return (
        <svg
          width={s}
          height={s}
          viewBox="0 0 16 16"
          className={`inline-block image-pixelated ${className}`}
          style={{ imageRendering: 'pixelated' }}
        >
          <rect x="1" y="2" width="14" height="13" fill="#07031a" />
          <rect x="3" y="3" width="10" height="1" fill="#c68b59" />
          <rect x="2" y="4" width="12" height="4" fill="#c68b59" />
          <rect x="2" y="8" width="12" height="6" fill="#a8703f" />
          <rect x="2" y="7" width="12" height="1" fill="#c98a12" />
          <rect x="2" y="4" width="1" height="10" fill="#c98a12" />
          <rect x="13" y="4" width="1" height="10" fill="#c98a12" />
          <rect x="7" y="7" width="2" height="3" fill="#ffc933" />
          <rect x="8" y="8" width="1" height="1" fill="#07031a" />
        </svg>
      );

    case 'lens':
      return (
        <svg
          width={s}
          height={s}
          viewBox="0 0 16 16"
          className={`inline-block image-pixelated ${className}`}
          style={{ imageRendering: 'pixelated' }}
        >
          <circle cx="6.5" cy="6.5" r="6" fill="#07031a" />
          <circle cx="6.5" cy="6.5" r="5" fill="#cfd6e8" />
          <circle cx="6.5" cy="6.5" r="3.5" fill="#2a7fd6" />
          <circle cx="6.5" cy="6.5" r="2.2" fill="#49d6ff" />
          <rect x="5" y="5" width="1" height="1" fill="#fff1d0" />
          <line x1="10.5" y1="10.5" x2="15" y2="15" stroke="#07031a" strokeWidth="4" />
          <line x1="10.5" y1="10.5" x2="14" y2="14" stroke="#c68b59" strokeWidth="2" />
        </svg>
      );

    case 'radar':
      return (
        <svg
          width={s}
          height={s}
          viewBox="0 0 16 16"
          className={`inline-block image-pixelated ${className}`}
          style={{ imageRendering: 'pixelated' }}
        >
          <circle cx="8" cy="8" r="7.5" fill="#07031a" />
          <circle cx="8" cy="8" r="7" fill="#1f9b55" />
          <circle cx="8" cy="8" r="6" fill="#07031a" />
          <circle cx="8" cy="8" r="4.2" fill="#1f9b55" />
          <circle cx="8" cy="8" r="3.2" fill="#07031a" />
          <circle cx="8" cy="8" r="1.2" fill="#1f9b55" />
          <rect x="7" y="0" width="2" height="16" fill="#0f3d27" />
          <rect x="0" y="7" width="16" height="2" fill="#0f3d27" />
          <rect x="10" y="4" width="2" height="2" fill="#ff4f79" />
        </svg>
      );

    case 'player':
      return (
        <svg
          width={s}
          height={s}
          viewBox="0 0 16 16"
          className={`inline-block image-pixelated ${className}`}
          style={{ imageRendering: 'pixelated' }}
        >
          <rect x="4" y="1" width="8" height="8" fill="#07031a" />
          <rect x="5" y="2" width="6" height="6" fill="#ffd2a0" />
          <rect x="5" y="2" width="6" height="2" fill="#7a4a2a" />
          <rect x="4" y="3" width="1" height="3" fill="#7a4a2a" />
          <rect x="11" y="3" width="1" height="3" fill="#7a4a2a" />
          <rect x="6" y="5" width="1" height="1" fill="#07031a" />
          <rect x="9" y="5" width="1" height="1" fill="#07031a" />
          <rect x="7" y="7" width="2" height="1" fill="#b8244a" />
          <rect x="3" y="8" width="10" height="7" fill="#07031a" />
          <rect x="4" y="9" width="8" height="6" fill="#49d6ff" />
          <rect x="3" y="10" width="1" height="4" fill="#49d6ff" />
          <rect x="12" y="10" width="1" height="4" fill="#49d6ff" />
          <rect x="4" y="13" width="8" height="1" fill="#2a7fd6" />
        </svg>
      );

    case 'tent':
      return (
        <svg
          width={s}
          height={s}
          viewBox="0 0 16 16"
          className={`inline-block image-pixelated ${className}`}
          style={{ imageRendering: 'pixelated' }}
        >
          <polygon points="8,1 16,14 0,14" fill="#07031a" />
          <polygon points="8,2 15,13 1,13" fill="#ff9a3c" />
          <polygon points="8,7 11.5,13 4.5,13" fill="#c4601a" />
          <rect x="8" y="0" width="1" height="3" fill="#7e87a6" />
          <rect x="0" y="13" width="16" height="2" fill="#1f9b55" />
          <rect x="2" y="13" width="12" height="1" fill="#5df28a" />
          <rect x="7" y="9" width="2" height="4" fill="#07031a" />
        </svg>
      );

    case 'racquet':
      return (
        <svg
          width={s}
          height={s}
          viewBox="0 0 16 16"
          className={`inline-block image-pixelated ${className}`}
          style={{ imageRendering: 'pixelated' }}
        >
          <ellipse cx="8" cy="5.4" rx="5.5" ry="6" fill="#07031a" />
          <ellipse cx="8" cy="5.4" rx="4.5" ry="5" fill="#ff9a3c" />
          <ellipse cx="8" cy="5.4" rx="3.3" ry="4.1" fill="#fff1d0" />
          <rect x="6" y="2" width="1" height="7" fill="#cfd6e8" />
          <rect x="8" y="2" width="1" height="7" fill="#cfd6e8" />
          <rect x="10" y="2" width="1" height="7" fill="#cfd6e8" />
          <rect x="5" y="4" width="6" height="1" fill="#cfd6e8" />
          <rect x="5" y="7" width="6" height="1" fill="#cfd6e8" />
          <rect x="7" y="10" width="2" height="4" fill="#7a4a2a" />
          <circle cx="12.5" cy="12.5" r="3" fill="#07031a" />
          <circle cx="12.5" cy="12.5" r="2.4" fill="#d8f24a" />
        </svg>
      );

    case 'keyboard':
      return (
        <svg
          width={s}
          height={s}
          viewBox="0 0 16 16"
          className={`inline-block image-pixelated ${className}`}
          style={{ imageRendering: 'pixelated' }}
        >
          <rect x="0" y="3" width="16" height="12" fill="#07031a" />
          <rect x="0" y="4" width="16" height="10" fill="#7e87a6" />
          <rect x="0" y="4" width="16" height="1" fill="#cfd6e8" />
          <rect x="1" y="6" width="2" height="1" fill="#49d6ff" />
          <rect x="4" y="6" width="2" height="1" fill="#ff4f79" />
          <rect x="7" y="6" width="2" height="1" fill="#5df28a" />
          <rect x="10" y="6" width="2" height="1" fill="#49d6ff" />
          <rect x="13" y="6" width="2" height="1" fill="#ff4f79" />
          <rect x="1" y="8" width="2" height="1" fill="#5df28a" />
          <rect x="4" y="8" width="2" height="1" fill="#49d6ff" />
          <rect x="7" y="8" width="2" height="1" fill="#ff4f79" />
          <rect x="10" y="8" width="2" height="1" fill="#5df28a" />
          <rect x="13" y="8" width="2" height="1" fill="#49d6ff" />
          <rect x="3" y="12" width="10" height="1" fill="#fff1d0" />
        </svg>
      );

    case 'camera':
      return (
        <svg
          width={s}
          height={s}
          viewBox="0 0 16 16"
          className={`inline-block image-pixelated ${className}`}
          style={{ imageRendering: 'pixelated' }}
        >
          <rect x="0" y="4" width="16" height="11" fill="#07031a" />
          <rect x="1" y="5" width="14" height="9" fill="#7e87a6" />
          <rect x="1" y="5" width="14" height="3" fill="#cfd6e8" />
          <rect x="5" y="3" width="6" height="2" fill="#7e87a6" />
          <circle cx="8" cy="9.6" r="4.2" fill="#07031a" />
          <circle cx="8" cy="9.6" r="3.8" fill="#cfd6e8" />
          <circle cx="8" cy="9.6" r="2.9" fill="#2a7fd6" />
          <circle cx="8" cy="9.6" r="1.4" fill="#49d6ff" />
          <rect x="7" y="8" width="1" height="1" fill="#fff1d0" />
          <rect x="12" y="6" width="2" height="1" fill="#fff1a8" />
          <rect x="2" y="6" width="2" height="1" fill="#ff4f79" />
        </svg>
      );

    case 'console':
      return (
        <svg
          width={s}
          height={s}
          viewBox="0 0 16 16"
          className={`inline-block image-pixelated ${className}`}
          style={{ imageRendering: 'pixelated' }}
        >
          <rect x="0" y="0" width="16" height="16" fill="#07031a" />
          <rect x="1" y="1" width="14" height="14" fill="#9b6dff" />
          <rect x="1" y="12" width="14" height="3" fill="#5b3fb0" />
          <rect x="3" y="2" width="10" height="7" fill="#07031a" />
          <rect x="4" y="3" width="8" height="5" fill="#1f9b55" />
          <rect x="5" y="4" width="6" height="3" fill="#5df28a" />
          <rect x="5" y="4" width="2" height="1" fill="#c9ffd9" />
          <rect x="3" y="11" width="3" height="1" fill="#fff1d0" />
          <rect x="4" y="10" width="1" height="3" fill="#fff1d0" />
          <rect x="9" y="11" width="2" height="2" fill="#ff4f79" />
          <rect x="12" y="10" width="2" height="2" fill="#49d6ff" />
        </svg>
      );

    case 'kettle':
      return (
        <svg
          width={s}
          height={s}
          viewBox="0 0 16 16"
          className={`inline-block image-pixelated ${className}`}
          style={{ imageRendering: 'pixelated' }}
        >
          <circle cx="7.5" cy="4.2" r="5" fill="#07031a" />
          <circle cx="7.5" cy="4.2" r="4.2" fill="#7e87a6" />
          <circle cx="7.5" cy="4.2" r="2.1" fill="#120a28" />
          <circle cx="7.5" cy="10.5" r="5.5" fill="#07031a" />
          <circle cx="7.5" cy="10.5" r="4.9" fill="#5b3fb0" />
          <circle cx="7" cy="10" r="4.1" fill="#9b6dff" />
          <rect x="5" y="7" width="2" height="1" fill="#d6c6ff" />
          <rect x="6" y="11" width="4" height="2" fill="#fff1d0" />
          <rect x="7" y="11" width="2" height="1" fill="#5b3fb0" />
        </svg>
      );

    case 'earbuds':
      return (
        <svg
          width={s}
          height={s}
          viewBox="0 0 16 16"
          className={`inline-block image-pixelated ${className}`}
          style={{ imageRendering: 'pixelated' }}
        >
          <circle cx="4.5" cy="5" r="4" fill="#07031a" />
          <circle cx="4.5" cy="5" r="3.2" fill="#cfd6e8" />
          <rect x="4" y="7" width="2" height="6" fill="#cfd6e8" />
          <rect x="3" y="3" width="2" height="2" fill="#49d6ff" />
          <circle cx="11.5" cy="5" r="4" fill="#07031a" />
          <circle cx="11.5" cy="5" r="3.2" fill="#cfd6e8" />
          <rect x="10" y="7" width="2" height="6" fill="#cfd6e8" />
          <rect x="11" y="3" width="2" height="2" fill="#49d6ff" />
        </svg>
      );

    case 'sun':
      return (
        <svg
          width={s}
          height={s}
          viewBox="0 0 32 32"
          className={`inline-block image-pixelated ${className}`}
          style={{ imageRendering: 'pixelated' }}
        >
          <circle cx="16" cy="16" r="15" fill="#ffc933" />
          {/* Banded horizon gradient */}
          <rect x="0" y="0" width="32" height="8" fill="#ffe98a" clipPath="url(#sun-clip)" />
          <rect x="0" y="8" width="32" height="6" fill="#ffc933" clipPath="url(#sun-clip)" />
          <rect x="0" y="14" width="32" height="6" fill="#ff9a3c" clipPath="url(#sun-clip)" />
          <rect x="0" y="20" width="32" height="12" fill="#ff4f79" clipPath="url(#sun-clip)" />
          {/* Pixel scanline cutouts */}
          <rect x="0" y="19" width="32" height="1" fill="#120a28" />
          <rect x="0" y="22" width="32" height="1.5" fill="#120a28" />
          <rect x="0" y="25" width="32" height="2" fill="#120a28" />
          <rect x="0" y="28" width="32" height="2.5" fill="#120a28" />
          <defs>
            <clipPath id="sun-clip">
              <circle cx="16" cy="16" r="15" />
            </clipPath>
          </defs>
        </svg>
      );

    default:
      return (
        <svg
          width={s}
          height={s}
          viewBox="0 0 16 16"
          className={`inline-block image-pixelated ${className}`}
          style={{ imageRendering: 'pixelated' }}
        >
          <rect x="2" y="2" width="12" height="12" fill="#6a4cd0" />
          <rect x="4" y="4" width="8" height="8" fill="#ffc933" />
        </svg>
      );
  }
}

export function getCategorySprite(categoryName?: string, title?: string, desc?: string): SpriteName {
  const c = `${categoryName || ''} ${title || ''} ${desc || ''}`.toLowerCase();
  if (c.includes('sport') || c.includes('tennis') || c.includes('racquet')) return 'racquet';
  if (c.includes('outdoor') || c.includes('tent') || c.includes('camp') || c.includes('hike')) return 'tent';
  if (c.includes('fit') || c.includes('gym') || c.includes('kettle') || c.includes('workout')) return 'kettle';
  if (c.includes('game') || c.includes('gaming') || c.includes('console') || c.includes('handheld')) return 'console';
  if (c.includes('key') || c.includes('electron') || c.includes('comput')) return 'keyboard';
  if (c.includes('audio') || c.includes('ear') || c.includes('headphone') || c.includes('sound')) return 'earbuds';
  if (c.includes('photo') || c.includes('cam') || c.includes('lens')) return 'camera';
  if (c.includes('collect') || c.includes('art') || c.includes('chest') || c.includes('antique') || c.includes('vintage')) return 'chest';
  return 'gavel';
}
