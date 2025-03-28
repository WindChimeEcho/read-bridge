import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    // 获取原始请求体和请求头
    const requestBody = await req.json();
    const { url, apiKey, ...restBody } = requestBody;

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    if (!apiKey) {
      return NextResponse.json({ error: 'API key is required' }, { status: 400 });
    }

    // 构建转发到 OpenAI 的请求
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(restBody),
    });

    // 如果是流式响应，需要特殊处理
    if (restBody.stream) {
      // 创建并返回一个新的流式响应
      const readable = response.body;
      if (!readable) {
        return NextResponse.json({ error: 'Failed to get response stream' }, { status: 500 });
      }

      return new NextResponse(readable, {
        status: response.status,
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    }

    // 处理非流式响应
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Proxy error:', error);
    return NextResponse.json(
      { error: 'An error occurred while proxying the request' },
      { status: 500 }
    );
  }
} 