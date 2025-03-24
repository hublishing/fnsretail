import { BigQuery } from '@google-cloud/bigquery';

const bigquery = new BigQuery({
  projectId: "third-current-410914",
  credentials: {
    client_email: "projectm@third-current-410914.iam.gserviceaccount.com",
    private_key: "-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC/pJSQMogZRGRP\nFEuz286lhTt7FurWEjNP5gndJPUy29fU5QkQauJ+RmunPN1w3k/EWl5NCaO7alJD\ndwVI3CAokts+j89av9+k2WnkYMIc7nWfojgYWV7wqXk1+M2eHhGI50JuUirGKst4\npDOZacwoVzOBcXNp0XHQVuA/HhyqOYa5DPPvU0gM84uQQQfbYJj8EOgQa8rHPYiJ\nxtfkr4fDHv6wPEB/LCbbwaQT56jhmcMZdj2EpVo6WDnm0zb5CINXkewuqAuYf/Iu\nEDNGTmjmWhjvoRBoC7v/7of8bMKF8VCEx7zBRcZ17m62MCL500uTQGRZlDP1EZSg\naX29UTp9AgMBAAECggEAJIVfd3Rdydzl9ckDHTk+Ef6IJY6qPZX119vZlN5yaNkK\n8kwcdFe+JnzSjqoTdCs1jdB/6JP18yURnMA9jlM+wKSt6ef7hsqKeu6g1rAWxe8u\nlLeUE5XSeS/+xKmPu7p0sn+Jwh7f/mhQ4sJ9/9Yw3R4zF0+wxCFxHFg1/2lEYq7j\nSFoI5KJovMWJNjtqgLfqdAXqZSCBAOaLf8VLZP62EINHrgOnTDRFNFwslIPPYR7v\nHWRcoKgxvC+ow/vKUEF3MFZhlEQAuy1mfC8TGUCRkxsMk0Syx0VXc57lhaKIjtHr\npydalOb8+VLnL3mMJlZQb9tNjpdxG99ivyge6FDnIQKBgQD5cM+9y/sWkureWnwQ\nehjGxCTODFFe6TXfK/FEVTYeeF+erAkRCj2H03J1flbW7MZYt1zF8wM8j26A+Vyn\nXgiFsg2xBKcYomhTjL3+MSP320pAxVewrlk2zEYFiIoVMeUnHSAVprgcRQtXdNum\naQW9NZmsRqx+VehGKok6zk6RnQKBgQDErq9TtnHVU25my5GNr7TF1YFvA4F3I0kJ\nI+7GXO4ZEzZhXkup1J0YAby3pzN3QsmKhuyH3oYFXsGWyS5h+g/vGOa/4hn6C27H\nAO5bjM6YYoSCEEJfftNg6qi3fVleqALoWVo/tqwQuVUBl3oOYgxxPYV74S2Kb+Dp\nWuNz4M3mYQKBgDjTPGBOoeromV0CXBUc25wcfw35vGfU1RL8XcBlcSjL32y0YHRj\nUtUolICzwXDBDAaV7yqhS/F184SqSjNOtr5Oa9QR7UctaHrwKzBHXZxPdsD+tBVq\nAqT7MFB+ZIajkUKx3edQzcyS5hyMYKWuc0JBfbrDdvRo+btSYWTmLvv5AoGBAKzn\nnL6NL3mIhQ/dejIC+3rH/aeof1JLNNPSQQElhTOKDk5+5SmB/jCypkMVvErl7ePY\nRWwUleF2sd1rM1lyyjs5uvGJRajqEBLmoKTfHmgcg70Lqi3lgtI6uOPGUKDENvoo\nQwyr/IwfQbnKfsTSMXoDyatkA/Ml86Vx/29Je/lBAoGBAKkl1v77IQPnY/o6YeDT\nTOiPMF0vBsdPkV3BsrXGpGSFKwRj8BaDcOS5RgIeQFkTkSctafPt6OrxP97Ug4cQ\n1XMAGc+fwndFcLD7szgF35OJRZd2q7t34dyKOlaJNRYeFAkJXfcwCYyFXLYZ0ffm\nRcTJ3PJc00E78TrB2d8Rz3vO\n-----END PRIVATE KEY-----\n"
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