import { NextResponse } from 'next/server'
import { BigQuery } from '@google-cloud/bigquery'

const bigquery = new BigQuery({
  projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
  credentials: {
    client_email: process.env.GOOGLE_CLOUD_CLIENT_EMAIL,
    private_key: process.env.GOOGLE_CLOUD_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  },
})

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const productId = params.id

    const query = `
      SELECT *
      FROM \`${process.env.GOOGLE_CLOUD_DATASET}.product_db\`
      WHERE product_id = '${productId}'
      ORDER BY product_id DESC
    `

    const [rows] = await bigquery.query({ query })

    if (!rows || rows.length === 0) {
      return NextResponse.json({ error: '상품을 찾을 수 없습니다.' }, { status: 404 })
    }

    // 첫 번째 행을 메인 상품 정보로 사용
    const mainProduct = rows[0]

    // 모든 행을 옵션 상품 정보로 사용
    const optionProducts = rows.map(row => ({
      options_product_id: row.options_product_id,
      options_options: row.options_options,
      main_stock: row.main_stock,
      add_wh_stock: row.add_wh_stock,
      production_stock: row.production_stock,
      prima_stock: row.prima_stock,
      main_wh_available_stock: row.main_wh_available_stock,
      main_wh_available_stock_excl_production_stock: row.main_wh_available_stock_excl_production_stock,
      incoming_stock: row.incoming_stock,
      soldout: row.soldout,
      scheduled: row.scheduled,
      last_shipping: row.last_shipping,
      exclusive: row.exclusive,
      fulfillment_stock_zalora: row.fulfillment_stock_zalora,
      fulfillment_stock_shopee_sg: row.fulfillment_stock_shopee_sg,
      fulfillment_stock_shopee_my: row.fulfillment_stock_shopee_my
    }))

    return NextResponse.json({
      mainProduct,
      optionProducts
    })
  } catch (error) {
    console.error('Error fetching product:', error)
    return NextResponse.json(
      { error: '상품 정보를 가져오는데 실패했습니다.' },
      { status: 500 }
    )
  }
} 