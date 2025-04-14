import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { createPrivateKey } from 'crypto';
import * as XLSX from 'xlsx';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const channelName = formData.get('channelName') as string;
    const userId = formData.get('userId') as string;

    if (!file || !channelName || !userId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer);
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(worksheet);

    // JWT 토큰 생성
    const now = Math.floor(Date.now() / 1000);
    const privateKeyString = process.env.GOOGLE_CLOUD_PRIVATE_KEY?.replace(/\\n/g, '\n') || '';
    
    if (!privateKeyString) {
      throw new Error('GOOGLE_CLOUD_PRIVATE_KEY 환경 변수가 설정되지 않았습니다.');
    }

    const privateKey = createPrivateKey({
      key: privateKeyString,
      format: 'pem',
    });
    
    const jwtToken = jwt.sign(
      {
        iss: process.env.GOOGLE_CLOUD_CLIENT_EMAIL,
        sub: process.env.GOOGLE_CLOUD_CLIENT_EMAIL,
        aud: 'https://oauth2.googleapis.com/token',
        iat: now,
        exp: now + 3600,
        jti: Math.random().toString(),
        scope: 'https://www.googleapis.com/auth/bigquery',
      },
      privateKey,
      {
        algorithm: 'RS256',
        keyid: process.env.GOOGLE_CLOUD_PRIVATE_KEY_ID,
      }
    );

    // OAuth 2.0 액세스 토큰 얻기
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: jwtToken,
      }),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok) {
      throw new Error(`액세스 토큰 획득 실패: ${JSON.stringify(tokenData)}`);
    }

    const { access_token } = tokenData;

    // BigQuery API 엔드포인트
    const url = `https://bigquery.googleapis.com/bigquery/v2/projects/${process.env.GOOGLE_CLOUD_PROJECT_ID}/queries`;

    // 데이터 삽입 쿼리 생성
    const insertQueries = data.map((row: any) => {
      const productId = row['이지어드민코드'];
      const channelProductId = row['채널상품코드'];
      const date = new Date().toISOString();

      return `
        INSERT INTO \`third-current-410914.project_m.product_sub_db\`
        (product_id, channel_product_id, channel_name, user_id, date)
        VALUES ('${productId}', '${channelProductId}', '${channelName}', '${userId}', '${date}')
      `;
    });

    // 각 쿼리 실행
    for (const query of insertQueries) {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          query: query,
          useLegacySql: false
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`BigQuery API 호출 실패: ${errorText}`);
      }
    }

    return NextResponse.json({ message: 'Upload successful' });
  } catch (error) {
    console.error('Error uploading file:', error);
    return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 });
  }
} 