import { NextResponse } from 'next/server';
import { BigQuery } from '@google-cloud/bigquery';

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const channelName = searchParams.get('channelName');
    const productId = searchParams.get('productId');

    if (!channelName || !productId) {
      return NextResponse.json({ error: '채널명과 상품ID가 필요합니다.' }, { status: 400 });
    }

    const bigquery = new BigQuery({
      projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
      credentials: {
        client_email: process.env.GOOGLE_CLOUD_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_CLOUD_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      },
    });

    const query = `
      SELECT 
        channel_name,
        product_id,
        channel_product_id
      FROM \`third-current-410914.project_m.product_sub_db\`
      WHERE channel_name = @channelName
      AND product_id = @productId
      LIMIT 1
    `;

    const options = {
      query,
      params: {
        channelName,
        productId,
      },
    };

    const [rows] = await bigquery.query(options);
    return NextResponse.json(rows[0] || null);
  } catch (error) {
    console.error('Error fetching preview data:', error);
    return NextResponse.json(
      { error: '미리보기 데이터를 불러오는데 실패했습니다.' },
      { status: 500 }
    );
  }
} 