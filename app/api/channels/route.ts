import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { createPrivateKey } from 'crypto';

export async function GET() {
  try {
    // Google Cloud API 엔드포인트
    const url = `https://bigquery.googleapis.com/bigquery/v2/projects/${process.env.GOOGLE_CLOUD_PROJECT_ID}/queries`;
    
    // 채널 정보를 가져오는 쿼리
    const query = `
      SELECT DISTINCT channel_name
      FROM \`third-current-410914.project_m.orders\`
      WHERE channel_name IS NOT NULL
      ORDER BY channel_name
    `;

    // JWT 토큰 생성
    const privateKey = createPrivateKey({
      key: process.env.GOOGLE_CLOUD_PRIVATE_KEY || '',
      format: 'pem',
      passphrase: process.env.GOOGLE_CLOUD_PRIVATE_KEY_PASSPHRASE || ''
    });

    const now = Math.floor(Date.now() / 1000);
    const token = jwt.sign(
      {
        iss: process.env.GOOGLE_CLOUD_CLIENT_EMAIL,
        scope: 'https://www.googleapis.com/auth/bigquery',
        aud: 'https://oauth2.googleapis.com/token',
        exp: now + 3600,
        iat: now
      },
      privateKey,
      { algorithm: 'RS256' }
    );

    // BigQuery API 호출
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query: query,
        useLegacySql: false
      })
    });

    if (!response.ok) {
      throw new Error('BigQuery API 호출 실패');
    }

    const data = await response.json();
    
    // 결과 처리
    const channels = data.rows?.map((row: any) => row.f[0].v) || [];
    
    return NextResponse.json({ channels });
  } catch (error) {
    console.error('채널 정보 조회 오류:', error);
    return NextResponse.json(
      { error: '채널 정보를 불러오는데 실패했습니다.' },
      { status: 500 }
    );
  }
} 