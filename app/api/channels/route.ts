import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { createPrivateKey } from 'crypto';

export async function GET() {
  try {
    console.log('채널 정보 조회 시작');
    
    // 환경 변수 확인
    console.log('환경 변수 확인:');
    console.log('GOOGLE_CLOUD_PROJECT_ID:', process.env.GOOGLE_CLOUD_PROJECT_ID ? '설정됨' : '미설정');
    console.log('GOOGLE_CLOUD_CLIENT_EMAIL:', process.env.GOOGLE_CLOUD_CLIENT_EMAIL ? '설정됨' : '미설정');
    console.log('GOOGLE_CLOUD_PRIVATE_KEY:', process.env.GOOGLE_CLOUD_PRIVATE_KEY ? '설정됨' : '미설정');
    
    // Google Cloud API 엔드포인트
    const url = `https://bigquery.googleapis.com/bigquery/v2/projects/${process.env.GOOGLE_CLOUD_PROJECT_ID}/queries`;
    console.log('API 엔드포인트:', url);
    
    // 채널 정보를 가져오는 쿼리
    const query = `
      SELECT DISTINCT channel_name
      FROM \`third-current-410914.project_m.order_db\`
      WHERE channel_name IS NOT NULL
      ORDER BY channel_name
    `;
    console.log('실행할 쿼리:', query);

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
    
    console.log('JWT 토큰 생성 시작');
    
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
    
    console.log('JWT 토큰 생성 완료');

    // OAuth 2.0 액세스 토큰 얻기
    console.log('OAuth 토큰 요청 시작');
    
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
      console.log('OAuth 토큰 요청 실패', tokenData);
      throw new Error(`액세스 토큰 획득 실패: ${JSON.stringify(tokenData)}`);
    }

    console.log('OAuth 토큰 획득 성공');
    const { access_token } = tokenData;

    // BigQuery API 호출
    console.log('BigQuery API 호출 시작');
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
      console.error('BigQuery API 호출 실패:');
      console.error('상태 코드:', response.status);
      console.error('응답 헤더:', Object.fromEntries(response.headers.entries()));
      console.error('에러 내용:', errorText);
      throw new Error('BigQuery API 호출 실패');
    }

    const data = await response.json();
    console.log('BigQuery API 응답:', data);
    
    // 결과 처리
    const channels = data.rows?.map((row: any) => row.f[0].v) || [];
    console.log('처리된 채널 목록:', channels);
    
    return NextResponse.json({ channels });
  } catch (error) {
    console.error('채널 정보 조회 오류:', error);
    return NextResponse.json(
      { error: '채널 정보를 불러오는데 실패했습니다.' },
      { status: 500 }
    );
  }
} 