import { NextRequest, NextResponse } from 'next/server';
import qiniu from 'qiniu';
import path from 'path';
import dotenv from 'dotenv';

// Force load .env
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// Qiniu Configuration
export async function POST(req: NextRequest) {
  const ACCESS_KEY = process.env.QINIU_ACCESS_KEY;
  const SECRET_KEY = process.env.QINIU_SECRET_KEY;
  const BUCKET = process.env.QINIU_BUCKET;
  const DOMAIN = process.env.QINIU_DOMAIN;

  // Debug logs
  console.log('Current Workking Directory:', process.cwd());
  console.log('Environment Check:');
  console.log('QINIU_ACCESS_KEY:', ACCESS_KEY ? 'Present' : 'Missing');
  console.log('QINIU_BUCKET:', BUCKET);

  if (!ACCESS_KEY || !SECRET_KEY || !BUCKET || !DOMAIN) {
    return NextResponse.json({ error: 'Server Qiniu configuration missing' }, { status: 500 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    // Convert file to Buffer
    const buffer = Buffer.from(await file.arrayBuffer());
    
    // Sanitize filename
    const safeName = file.name.replace(/[^a-zA-Z0-9.]/g, '_');
    const key = `qwen-edit/${Date.now()}_${safeName}`;

    // Qiniu Auth
    const mac = new qiniu.auth.digest.Mac(ACCESS_KEY, SECRET_KEY);
    const putPolicy = new qiniu.rs.PutPolicy({ scope: BUCKET });
    const uploadToken = putPolicy.uploadToken(mac);

    // Upload
    const config = new qiniu.conf.Config();
    const formUploader = new qiniu.form_up.FormUploader(config);
    const putExtra = new qiniu.form_up.PutExtra();

    return new Promise((resolve) => {
      formUploader.put(uploadToken, key, buffer, putExtra, (respErr, respBody, respInfo) => {
        if (respErr) {
          console.error('Qiniu Upload Error:', respErr);
          resolve(NextResponse.json({ error: 'Upload failed' }, { status: 500 }));
          return;
        }

        if (respInfo.statusCode === 200) {
          // Construct URL
          let domain = DOMAIN.endsWith('/') ? DOMAIN.slice(0, -1) : DOMAIN;
          if (!domain.startsWith('http')) domain = 'http://' + domain;
          const publicUrl = `${domain}/${respBody.key}`;

          // Schedule Auto-Deletion (5 minutes)
          // Note: This relies on the server process staying alive (Node.js). 
          // Serverless environments may kill this timeout.
          const deleteAfterMs = 5 * 60 * 1000;
          setTimeout(() => {
            const bucketManager = new qiniu.rs.BucketManager(mac, config);
            bucketManager.delete(BUCKET, key, (err, _, info) => {
              if (err) {
                 console.error(`[Cleanup] Failed to delete ${key}:`, err);
              } else {
                 console.log(`[Cleanup] Successfully deleted ${key}. Status: ${info.statusCode}`);
              }
            });
          }, deleteAfterMs);
          console.log(`[Cleanup] Scheduled deletion for ${key} in 5 minutes.`);

          resolve(NextResponse.json({ url: publicUrl }));
        } else {
          console.error('Qiniu Error:', respInfo.statusCode, respBody);
          resolve(NextResponse.json(respBody, { status: respInfo.statusCode }));
        }
      });
    });

  } catch (error) {
    console.error('Upload Handle Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
