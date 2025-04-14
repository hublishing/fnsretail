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
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId parameter' }, { status: 400 });
    }

    const query = `
      SELECT 
        user_id,
        date,
        channel_name,
        product_id,
        channel_product_id
      FROM \`third-current-410914.project_m.product_sub_db\`
      WHERE user_id = @userId
      ORDER BY date DESC
    `;

    const options = {
      query,
      params: {
        userId
      }
    };

    const [rows] = await bigquery.query(options);
    return NextResponse.json(rows);
  } catch (error) {
    console.error('Error fetching logs:', error);
    return NextResponse.json({ error: 'Failed to fetch logs' }, { status: 500 });
  }
} 