import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

export async function POST(req: NextRequest) {
  try {
    let body;
    try {
      body = await req.json();
    } catch (parseError) {
      return NextResponse.json({
        error: 'Failed to parse request body',
        details: parseError instanceof Error ? parseError.message : 'Unknown parse error'
      }, { status: 400 });
    }

    const { apiKey } = body;

    if (!apiKey) {
      return NextResponse.json({ error: 'API Key is required' }, { status: 400 });
    }

    if (!apiKey.startsWith('sk-')) {
      return NextResponse.json({ error: 'Invalid API Key format (should start with sk-)' }, { status: 400 });
    }

    // Test the API key with a simple request
    let response;
    try {
      response = await fetch('https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'qwen-vl-plus',
          input: {
            messages: [{ role: 'user', content: [{ text: 'test' }] }]
          }
        })
      });
    } catch (fetchError) {
      return NextResponse.json({
        error: 'Failed to connect to DashScope API',
        details: fetchError instanceof Error ? fetchError.message : 'Network error',
        type: 'network_error'
      }, { status: 500 });
    }

    // Try to parse response
    let responseData;
    try {
      responseData = await response.json();
    } catch {
      responseData = null;
    }

    // If we get 401, the key is invalid
    if (response.status === 401) {
      return NextResponse.json({
        error: 'Invalid API Key',
        details: responseData?.message || 'Authentication failed',
        type: 'auth_error'
      }, { status: 401 });
    }

    // Any other response means the API is reachable
    return NextResponse.json({
      success: true,
      status: response.status,
      apiResponse: responseData
    });

  } catch (error: unknown) {
    // Catch-all for any unexpected errors
    const errorDetails = {
      message: error instanceof Error ? error.message : 'Unknown error',
      name: error instanceof Error ? error.name : 'Unknown',
      stack: error instanceof Error ? error.stack?.split('\n').slice(0, 3) : undefined
    };

    console.error('Test connection error:', errorDetails);

    return NextResponse.json({
      error: 'Internal server error',
      details: errorDetails.message,
      type: errorDetails.name,
      stack: errorDetails.stack
    }, { status: 500 });
  }
}
