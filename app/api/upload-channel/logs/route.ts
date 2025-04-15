import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { createPrivateKey } from 'crypto';

export async function GET(request: Request) {
  try {
    console.log('로그 조회 시작');
    const userId = request.headers.get('user-id');
    const url = new URL(request.url);
    const uploadId = url.searchParams.get('uploadId');

    if (!userId) {
      console.log('사용자 ID가 없습니다');
      return NextResponse.json(
        { error: '사용자 ID가 필요합니다.' },
        { status: 400 }
      );
    }

    console.log('사용자 ID:', userId);
    console.log('업로드 ID:', uploadId);

    // Google Cloud API 엔드포인트
    const bigqueryUrl = `https://bigquery.googleapis.com/bigquery/v2/projects/${process.env.GOOGLE_CLOUD_PROJECT_ID}/queries`;
    
    const query = `
      SELECT 
        user_id,
        FORMAT_TIMESTAMP('%Y-%m-%d %H:%M:%S', TIMESTAMP_ADD(date, INTERVAL 9 HOUR)) as date,
        channel_name,
        upload_id,
        COUNT(*) as count
      FROM \`${process.env.GOOGLE_CLOUD_PROJECT_ID}.project_m.product_sub_db\`
      WHERE user_id = @userId
      GROUP BY user_id, date, channel_name, upload_id
      ORDER BY date DESC
    `;

    const queryParams = [
      {
        name: 'userId',
        parameterType: { type: 'STRING' },
        parameterValue: { value: userId },
      },
    ];

    // uploadId가 있는 경우 해당 조건 추가
    if (uploadId) {
      queryParams.push({
        name: 'uploadId',
        parameterType: { type: 'STRING' },
        parameterValue: { value: uploadId },
      });
    }

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
        queryParameters: queryParams,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('BigQuery API 호출 실패:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText
      });
      return NextResponse.json(
        { error: 'BigQuery API 호출에 실패했습니다.' },
        { status: 500 }
      );
    }

    const responseData = await response.json();
    console.log('BigQuery 응답:', JSON.stringify(responseData, null, 2));

    if (!responseData.rows) {
      console.log('응답에 rows가 없습니다.');
      return NextResponse.json({ logs: [] });
    }

    console.log('응답 rows:', JSON.stringify(responseData.rows, null, 2));

    const logs = responseData.rows.map((row: any) => {
      console.log('처리 중인 row:', JSON.stringify(row, null, 2));
      const values = row.f.map((field: any) => field.v);
      console.log('추출된 values:', values);
      return {
        user_id: values[0],
        date: values[1],
        channel_name: values[2],
        upload_id: values[3],
        count: parseInt(values[4])
      };
    });

    console.log('최종 로그 데이터:', JSON.stringify(logs, null, 2));
    return NextResponse.json({ logs });
  } catch (error) {
    console.error('로그 조회 오류:', error);
    return NextResponse.json(
      { error: '로그 조회에 실패했습니다.' },
      { status: 500 }
    );
  }
}
