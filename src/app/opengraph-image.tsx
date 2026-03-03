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
            width="160"
            height="160"
            viewBox="0 0 100 100"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Elo inferior - verde escuro */}
            <rect
              x="38"
              y="38"
              width="42"
              height="54"
              rx="16"
              fill="#059669"
            />
            {/* Elo superior - verde primário */}
            <rect
              x="20"
              y="8"
              width="42"
              height="54"
              rx="16"
              fill="#10B981"
            />
            {/* Ponto de destaque âmbar */}
            <circle cx="62" cy="50" r="12" fill="#F59E0B" />
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
