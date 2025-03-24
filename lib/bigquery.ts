import { BigQuery } from '@google-cloud/bigquery';

const bigquery = new BigQuery({
  projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
  credentials: {
    client_email: process.env.GOOGLE_CLOUD_CLIENT_EMAIL,
    private_key: process.env.GOOGLE_CLOUD_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  }
});

export async function queryProducts(searchTerm?: string) {
  const query = `
    SELECT 
      product_id,
      options_product_id,
      name,
      options_options,
      org_price,
      shop_price,
      category
    FROM \`third-current-410914.001_ezadmin.001_ezadmin_product_*\`
    ${searchTerm ? `WHERE name LIKE '%${searchTerm}%'` : ''}
    ORDER BY product_id DESC
  `;

  try {
    const [rows] = await bigquery.query({ query });
    return rows;
  } catch (error) {
    console.error('BigQuery 쿼리 오류:', error);
    throw error;
  }
} 