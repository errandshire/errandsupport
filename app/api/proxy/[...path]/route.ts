import { NextRequest, NextResponse } from 'next/server';

// Proxy API requests to backend (bypasses CORS and mixed content issues)
export async function GET(request: NextRequest, { params }: { params: { path: string[] } }) {
  return handleProxy(request, params.path);
}

export async function POST(request: NextRequest, { params }: { params: { path: string[] } }) {
  return handleProxy(request, params.path);
}

export async function PUT(request: NextRequest, { params }: { params: { path: string[] } }) {
  return handleProxy(request, params.path);
}

export async function DELETE(request: NextRequest, { params }: { params: { path: string[] } }) {
  return handleProxy(request, params.path);
}

async function handleProxy(request: NextRequest, path: string[]) {
  const backendUrl = `https://api.erandwork.com/api/${path.join('/')}`;
  
  const headers: Record<string, string> = {};
  request.headers.forEach((value, key) => {
    if (key !== 'host' && key !== 'content-length') {
      headers[key] = value;
    }
  });
  
  try {
    const response = await fetch(backendUrl, {
      method: request.method,
      headers,
      body: request.method !== 'GET' && request.method !== 'HEAD' 
        ? await request.text() 
        : undefined,
    });
    
    const data = await response.text();
    
    return new NextResponse(data, {
      status: response.status,
      headers: {
        'Content-Type': response.headers.get('Content-Type') || 'application/json',
      },
    });
  } catch (error) {
    console.error('Proxy error:', error);
    return NextResponse.json({ error: 'Backend unavailable' }, { status: 502 });
  }
}
