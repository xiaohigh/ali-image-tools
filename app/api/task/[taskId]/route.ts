import { NextRequest, NextResponse } from 'next/server';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const DASHSCOPE_API_KEY = process.env.DASHSCOPE_API_KEY;
  
  if (!DASHSCOPE_API_KEY) {
    return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
  }

  try {
    const { taskId } = await params;

    const response = await fetch(`https://dashscope.aliyuncs.com/api/v1/tasks/${taskId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${DASHSCOPE_API_KEY}`
      }
    });

    const data = await response.json();
    
    if (!response.ok) {
      return NextResponse.json({ error: data.message || 'Failed to get task status' }, { status: response.status });
    }

    return NextResponse.json(data);

  } catch (error: any) {
    console.error('Task status error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
