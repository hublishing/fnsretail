import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { createPrivateKey } from 'crypto';

export async function DELETE(request: Request) {
  try {
    const url = new URL(request.url);
    const uploadId = url.searchParams.get('uploadId');
    const channelName = url.searchParams.get('channelName');
    const userId = request.headers.get('user-id');

    if (!uploadId || !channelName || !userId) {
      return NextResponse.json(
        { error: '업로드 ID, 채널명, 사용자 ID가 필요합니다.' },
        { status: 400 }
      );
    }

    // Google Cloud API 엔드포인트
    const bigqueryUrl = `https://bigquery.googleapis.com/bigquery/v2/projects/${process.env.GOOGLE_CLOUD_PROJECT_ID}/queries`;

    const query = `
      DELETE FROM \`${process.env.GOOGLE_CLOUD_PROJECT_ID}.project_m.product_sub_db\`
      WHERE upload_id = @uploadId
      AND channel_name = @channelName
      AND user_id = @userId
    `;

    // JWT 토큰 생성
    const now = Math.floor(Date.now() / 1000);
    const privateKeyString = (process.env.GOOGLE_CLOUD_PRIVATE_KEY as string).replace(/\\n/g, '\n');
    
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
            name: 'channelName',
            parameterType: { type: 'STRING' },
            parameterValue: { value: channelName },
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

    return NextResponse.json({ message: '데이터가 성공적으로 삭제되었습니다.' });
  } catch (error) {
    console.error('데이터 삭제 오류:', error);
    return NextResponse.json(
      { error: '데이터 삭제에 실패했습니다.' },
      { status: 500 }
    );
  }
}
