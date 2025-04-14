import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { createPrivateKey } from 'crypto';
import { auth } from '@/lib/firebase-admin';

export async function POST(request: Request) {
  try {
    console.log('업로드 요청 시작');
    const authHeader = request.headers.get('Authorization');
    
    if (!authHeader?.startsWith('Bearer ')) {
      console.log('인증 헤더 없음');
      return NextResponse.json(
        { error: '로그인이 필요합니다.' },
        { status: 401 }
      );
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await auth.verifyIdToken(token);
    const uid = decodedToken.uid;
    
    console.log('인증된 사용자:', { uid });

    const { channelName, data } = await request.json();
    console.log('요청 데이터:', { 
      channelName, 
      dataLength: data?.length, 
      uid
    });

    if (!channelName || !data) {
      console.log('필수 데이터 누락:', { channelName, hasData: !!data });
      return NextResponse.json(
        { error: '채널명과 데이터가 필요합니다.' },
        { status: 400 }
      );
    }

    // JWT 토큰 생성
    console.log('JWT 토큰 생성 시작');
    const now = Math.floor(Date.now() / 1000);
    const privateKeyString = process.env.GOOGLE_CLOUD_PRIVATE_KEY?.replace(/\\n/g, '\n') || '';
    
    if (!privateKeyString) {
      console.error('GOOGLE_CLOUD_PRIVATE_KEY 누락');
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
      console.error('OAuth 토큰 요청 실패:', tokenData);
      throw new Error(`액세스 토큰 획득 실패: ${JSON.stringify(tokenData)}`);
    }

    const { access_token } = tokenData;
    console.log('OAuth 토큰 획득 성공');

    // BigQuery API 요청
    const url = `https://bigquery.googleapis.com/bigquery/v2/projects/${process.env.GOOGLE_CLOUD_PROJECT_ID}/queries`;
    
    const rows = data.map((item: any) => {
      console.log('데이터 항목 처리:', item);
      const now = new Date();
      return {
        channel_name: channelName,
        product_id: String(item.이지어드민코드),
        channel_product_id: String(item.채널상품코드),
        date: now.toISOString().split('T')[0], // YYYY-MM-DD
        user_id: uid
      };
    });

    // 데이터 삽입 쿼리
    const insertQuery = `
      INSERT INTO \`third-current-410914.project_m.product_sub_db\`
      (channel_name, product_id, channel_product_id, date, user_id)
      VALUES (@channel_name, @product_id, @channel_product_id, @date, @user_id)
    `;

    // 각 행에 대해 개별적으로 삽입
    console.log('데이터 삽입 시작, 총 행 수:', rows.length);
    for (const row of rows) {
      console.log('행 삽입 시도:', row);
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: insertQuery,
          useLegacySql: false,
          queryParameters: [
            {
              name: 'channel_name',
              parameterType: { type: 'STRING' },
              parameterValue: { value: row.channel_name }
            },
            {
              name: 'product_id',
              parameterType: { type: 'STRING' },
              parameterValue: { value: row.product_id }
            },
            {
              name: 'channel_product_id',
              parameterType: { type: 'STRING' },
              parameterValue: { value: row.channel_product_id }
            },
            {
              name: 'date',
              parameterType: { type: 'DATE' },
              parameterValue: { value: row.date }
            },
            {
              name: 'user_id',
              parameterType: { type: 'STRING' },
              parameterValue: { value: row.user_id }
            }
          ]
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('행 삽입 실패:', {
          row,
          error: errorData
        });
        throw new Error(`데이터 삽입 실패: ${JSON.stringify(errorData)}`);
      }
      console.log('행 삽입 성공:', row);
    }

    console.log('모든 데이터 삽입 완료');
    return NextResponse.json({ 
      message: '데이터가 성공적으로 업로드되었습니다.',
      uploadedCount: rows.length 
    });
  } catch (error: any) {
    console.error('업로드 에러 상세:', {
      message: error.message,
      stack: error.stack,
      code: error.code,
      errors: error.errors,
      apiResponse: error.apiResponse
    });
    return NextResponse.json(
      { 
        error: '데이터 업로드에 실패했습니다.',
        details: error.message
      },
      { status: 500 }
    );
  }
} 