import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { createPrivateKey } from 'crypto';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const uploadId = url.searchParams.get('uploadId');
    const userId = request.headers.get('user-id');

    console.log('상세 데이터 API 요청:', { uploadId, userId });

    if (!uploadId || !userId) {
      console.error('필수 파라미터 누락:', { uploadId, userId });
      return NextResponse.json(
        { error: '업로드 ID와 사용자 ID가 필요합니다.' },
        { status: 400 }
      );
    }

    // Google Cloud API 엔드포인트
    const bigqueryUrl = `https://bigquery.googleapis.com/bigquery/v2/projects/${process.env.GOOGLE_CLOUD_PROJECT_ID}/queries`;
    
    const query = `
      SELECT 
        product_id,
        channel_product_id,
        channel_name,
        user_id,
        upload_id,
        FORMAT_TIMESTAMP('%Y-%m-%d %H:%M:%S', TIMESTAMP_ADD(date, INTERVAL 9 HOUR)) as date
      FROM \`${process.env.GOOGLE_CLOUD_PROJECT_ID}.project_m.product_sub_db\`
      WHERE upload_id = @uploadId
      AND user_id = @userId
      ORDER BY date DESC
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

    // 액세스 토큰 요청
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

    if (!tokenResponse.ok) {
      throw new Error('액세스 토큰을 얻는데 실패했습니다.');
    }

    const { access_token } = await tokenResponse.json();

    // BigQuery API 호출
    const response = await fetch(bigqueryUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        useLegacySql: false,
        location: 'asia-northeast3',
        queryParameters: [
          {
            name: 'uploadId',
            parameterType: { type: 'STRING' },
            parameterValue: { value: uploadId },
          },
          {
            name: 'userId',
            parameterType: { type: 'STRING' },
            parameterValue: { value: userId },
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('BigQuery API 호출 실패:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText
      });
      throw new Error('BigQuery API 호출에 실패했습니다.');
    }

    const data = await response.json();
    console.log('BigQuery 응답:', data);

    // 데이터 파싱
    const parsedDetails = data.rows?.map((row: any) => ({
      product_id: row.f[0].v,
      channel_product_id: row.f[1].v,
      channel_name: row.f[2].v,
      user_id: row.f[3].v,
      upload_id: row.f[4].v,
      date: row.f[5].v
    })) || [];

    console.log('파싱된 상세 데이터:', parsedDetails);
    return NextResponse.json({ details: parsedDetails });
  } catch (error) {
    console.error('상세 데이터 조회 오류:', error);
    return NextResponse.json(
      { error: '상세 데이터를 조회하는데 실패했습니다.' },
      { status: 500 }
    );
  }
} 