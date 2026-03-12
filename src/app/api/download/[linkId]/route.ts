import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.linkepag.com.br';

/**
 * Route Handler para download de arquivos
 * Faz proxy do download da API para manter a URL no domínio do frontend
 * 
 * URL: /api/download/:linkId?token=xxx (exposto como /baixar/:linkId via rewrite)
 * Proxy para: api.linkepag.com.br/download/:linkId?token=xxx
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { linkId: string } }
) {
  try {
    const { linkId } = params;
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json(
        { error: 'Token de acesso não fornecido' },
        { status: 400 }
      );
    }

    // Faz a requisição para a API backend
    const apiUrl = `${API_BASE_URL}/download/${linkId}?token=${encodeURIComponent(token)}`;
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        // Encaminha headers relevantes
        'Accept': '*/*',
        'User-Agent': request.headers.get('user-agent') || 'NextJS-Proxy',
      },
    });

    // Se a API retornar erro, repassa o erro
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Erro ao baixar arquivo' }));
      return NextResponse.json(
        { error: errorData.error || 'Erro ao baixar arquivo' },
        { status: response.status }
      );
    }

    // Pega os headers da resposta da API
    const contentType = response.headers.get('content-type') || 'application/octet-stream';
    const contentLength = response.headers.get('content-length');
    const contentDisposition = response.headers.get('content-disposition');

    // Cria a resposta com o arquivo
    const fileBuffer = await response.arrayBuffer();
    
    const headers = new Headers();
    headers.set('Content-Type', contentType);
    headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    
    if (contentLength) {
      headers.set('Content-Length', contentLength);
    }
    
    // Preserva o header de Content-Disposition para forçar download com nome correto
    if (contentDisposition) {
      headers.set('Content-Disposition', contentDisposition);
    } else {
      // Fallback: força download
      headers.set('Content-Disposition', `attachment; filename="arquivo"`);
    }

    return new NextResponse(fileBuffer, {
      status: 200,
      headers,
    });

  } catch (error) {
    console.error('[Download Proxy] Erro:', error);
    return NextResponse.json(
      { error: 'Erro interno ao processar download' },
      { status: 500 }
    );
  }
}
