import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export const alt = 'LinkePag - Monetize sua audiência';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '48px',
        }}
      >
        {/* Logo Container */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '32px',
          }}
        >
          <svg
            width="120"
            height="120"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <rect width="24" height="24" rx="6" fill="#10B981" />
            <path
              d="M8 12C8 9.79086 9.79086 8 12 8C14.2091 8 16 9.79086 16 12"
              stroke="white"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            <path
              d="M12 16C12 16 14 14 16 14C18 14 19 16 19 16"
              stroke="white"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            <circle cx="12" cy="12" r="2" fill="white" />
            <circle cx="16" cy="14" r="1.5" fill="white" />
          </svg>
        </div>

        {/* Title */}
        <h1
          style={{
            fontSize: '72px',
            fontWeight: 'bold',
            color: 'white',
            margin: '0 0 16px 0',
            textAlign: 'center',
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}
        >
          LinkePag
        </h1>

        {/* Tagline */}
        <p
          style={{
            fontSize: '32px',
            color: '#94a3b8',
            margin: '0',
            textAlign: 'center',
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}
        >
          Monetize sua audiência
        </p>

        {/* Subtitle */}
        <p
          style={{
            fontSize: '24px',
            color: '#64748b',
            margin: '24px 0 0 0',
            textAlign: 'center',
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}
        >
          Crie sua link-in-bio e receba pagamentos via PIX
        </p>
      </div>
    ),
    {
      ...size,
    }
  );
}
