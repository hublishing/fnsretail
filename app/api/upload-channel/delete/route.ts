import { NextResponse } from 'next/server';
import { BigQuery } from '@google-cloud/bigquery';

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: '삭제할 로그 ID가 필요합니다.' }, { status: 400 });
    }

    const bigquery = new BigQuery({
      projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
      credentials: {
        client_email: process.env.GOOGLE_CLOUD_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_CLOUD_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      },
    });

    const query = `
      DELETE FROM \`third-current-410914.project_m.product_sub_db\`
      WHERE id = @id
    `;

    const options = {
      query,
      params: {
        id,
      },
    };

    await bigquery.query(options);

    return NextResponse.json({ message: '로그가 성공적으로 삭제되었습니다.' });
  } catch (error) {
    console.error('Error deleting log:', error);
    return NextResponse.json(
      { error: '로그 삭제에 실패했습니다.' },
      { status: 500 }
    );
  }
} 