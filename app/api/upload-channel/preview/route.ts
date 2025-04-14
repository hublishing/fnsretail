import { NextResponse } from 'next/server';
import { BigQuery } from '@google-cloud/bigquery';

const bigquery = new BigQuery({
  projectId: 'third-current-410914',
  credentials: {
    client_email: process.env.BIGQUERY_CLIENT_EMAIL,
    private_key: process.env.BIGQUERY_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  },
});

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const channelName = searchParams.get('channelName');
    const productId = searchParams.get('productId');

    if (!channelName || !productId) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    const query = `
      SELECT channel_name, product_id, channel_product_id
      FROM \`third-current-410914.project_m.product_sub_db\`
      WHERE channel_name = @channelName
      AND product_id = @productId
      ORDER BY date DESC
      LIMIT 1
    `;

    const options = {
      query,
      params: {
        channelName,
        productId
      }
    };

    const [rows] = await bigquery.query(options);
    return NextResponse.json(rows[0] || null);
  } catch (error) {
    console.error('Error fetching preview data:', error);
    return NextResponse.json({ error: 'Failed to fetch preview data' }, { status: 500 });
  }
} 