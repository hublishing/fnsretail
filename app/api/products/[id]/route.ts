import { NextResponse } from 'next/server'
import { BigQuery } from '@google-cloud/bigquery'

const bigquery = new BigQuery({
  projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
  credentials: {
    client_email: process.env.GOOGLE_CLOUD_CLIENT_EMAIL,
    private_key: process.env.GOOGLE_CLOUD_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  },
})

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const productId = url.pathname.split('/').pop()
    console.log('Received productId:', productId)

    if (!productId) {
      console.error('상품 ID가 제공되지 않았습니다.')
      return NextResponse.json({ error: '상품 ID가 필요합니다.' }, { status: 400 })
    }

    // BigQuery 연결 확인
    try {
      await bigquery.getProjectId()
      console.log('BigQuery 연결 성공')
    } catch (error) {
      console.error('BigQuery 연결 실패:', error)
      return NextResponse.json(
        { error: '데이터베이스 연결에 실패했습니다.' },
        { status: 500 }
      )
    }

    // product_id로 모든 옵션 상품 조회
    const query = `
      SELECT *
      FROM \`${process.env.GOOGLE_CLOUD_DATASET}.product_db\`
      WHERE product_id = '${productId}'
      ORDER BY product_id DESC
    `
    console.log('실행할 쿼리:', query)

    const [rows] = await bigquery.query({ query })
    console.log('쿼리 결과 행 수:', rows?.length || 0)

    if (!rows || rows.length === 0) {
      console.error('상품을 찾을 수 없음:', productId)
      return NextResponse.json({ error: '상품을 찾을 수 없습니다.' }, { status: 404 })
    }

    // 첫 번째 행을 메인 상품 정보로 사용
    const mainProduct = rows[0]
    console.log('메인 상품 정보:', mainProduct)

    // 모든 행을 옵션 상품 정보로 사용
    const optionProducts = rows.map(row => ({
      options_product_id: row.options_product_id,
      options_options: row.options_options,
      main_wh_available_stock: row.main_wh_available_stock,
      additional_wh_available_stock: row.add_wh_stock,
      production_waiting_stock: row.production_stock,
      prima_wh_available_stock: row.prima_stock,
      main_wh_available_stock_excl_production_stock: row.main_wh_available_stock_excl_production_stock,
      main_wh_available_stock_excl_production_stock_with_additional: row.main_wh_available_stock_excl_production_stock_with_additional,
      incoming_stock: row.incoming_stock,
      soldout: row.soldout,
      zalora: row.fulfillment_stock_zalora,
      shopee_sg: row.fulfillment_stock_shopee_sg,
      shopee_my: row.fulfillment_stock_shopee_my,
      schedule: row.scheduled,
      last_delivery: row.last_shipping,
      exclusive2: row.exclusive2
    }))
    console.log('옵션 상품 수:', optionProducts.length)

    return NextResponse.json({
      mainProduct,
      optionProducts
    })
  } catch (error) {
    console.error('상품 정보 조회 중 오류 발생:', error)
    return NextResponse.json(
      { error: '상품 정보를 가져오는데 실패했습니다.' },
      { status: 500 }
    )
  }
} 