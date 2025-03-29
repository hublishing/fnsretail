import { NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { createPrivateKey } from 'crypto'

export async function GET() {
  try {
    // Google Cloud API 엔드포인트
    const url = `https://bigquery.googleapis.com/bigquery/v2/projects/${process.env.GOOGLE_CLOUD_PROJECT_ID}/queries`
    
    const query = `
      SELECT 
        commit_date,
        commit_title,
        description,
        updated_at
      FROM \`third-current-410914.project_m.admin_db\`
      ORDER BY commit_date DESC, updated_at DESC
    `

    // JWT 토큰 생성
    const now = Math.floor(Date.now() / 1000)
    const privateKeyString = process.env.GOOGLE_CLOUD_PRIVATE_KEY?.replace(/\\n/g, '\n') || ''
    
    if (!privateKeyString) {
      throw new Error('GOOGLE_CLOUD_PRIVATE_KEY 환경 변수가 설정되지 않았습니다.')
    }

    const privateKey = createPrivateKey({
      key: privateKeyString,
      format: 'pem',
    })
    
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
    )

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
    })

    const tokenData = await tokenResponse.json()

    if (!tokenResponse.ok) {
      throw new Error(`액세스 토큰 획득 실패: ${JSON.stringify(tokenData)}`)
    }

    const { access_token } = tokenData

    // BigQuery API 요청
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        useLegacySql: false,
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(`BigQuery API 요청 실패: ${JSON.stringify(data)}`)
    }

    // 결과 변환
    const rows = data.rows?.map((row: any) => ({
      commit_date: row.f[0].v,
      commit_title: row.f[1].v,
      description: row.f[2].v,
      updated_at: row.f[3].v
    })) || []

    return NextResponse.json(rows)
  } catch (error) {
    console.error('BigQuery 쿼리 오류:', error)
    return NextResponse.json(
      { error: '패치노트 데이터를 가져오는데 실패했습니다.' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { commit_date, commit_title, description, uid } = body

    if (!uid || uid !== 'a8mwwycqhaZLIb9iOcshPbpAVrj2') {
      return NextResponse.json(
        { error: '권한이 없습니다.' },
        { status: 403 }
      )
    }

    console.log('받은 데이터:', { commit_date, commit_title, description })

    // Google Cloud API 엔드포인트
    const url = `https://bigquery.googleapis.com/bigquery/v2/projects/${process.env.GOOGLE_CLOUD_PROJECT_ID}/queries`

    // 데이터 삽입 쿼리
    const insertQuery = `
      INSERT INTO \`third-current-410914.project_m.admin_db\`
      (commit_date, commit_title, description, updated_at)
      VALUES (@commit_date, @commit_title, @description, CURRENT_TIMESTAMP())
    `

    // JWT 토큰 생성
    const now = Math.floor(Date.now() / 1000)
    const privateKeyString = process.env.GOOGLE_CLOUD_PRIVATE_KEY?.replace(/\\n/g, '\n') || ''
    
    if (!privateKeyString) {
      throw new Error('GOOGLE_CLOUD_PRIVATE_KEY 환경 변수가 설정되지 않았습니다.')
    }

    const privateKey = createPrivateKey({
      key: privateKeyString,
      format: 'pem',
    })
    
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
    )

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
    })

    const tokenData = await tokenResponse.json()

    if (!tokenResponse.ok) {
      throw new Error(`액세스 토큰 획득 실패: ${JSON.stringify(tokenData)}`)
    }

    const { access_token } = tokenData

    // 데이터 삽입
    const insertResponse = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: insertQuery,
        useLegacySql: false,
        queryParameters: [
          {
            name: 'commit_date',
            parameterType: { type: 'STRING' },
            parameterValue: { value: commit_date }
          },
          {
            name: 'commit_title',
            parameterType: { type: 'STRING' },
            parameterValue: { value: commit_title }
          },
          {
            name: 'description',
            parameterType: { type: 'STRING' },
            parameterValue: { value: description }
          }
        ]
      }),
    })

    if (!insertResponse.ok) {
      const errorData = await insertResponse.json()
      throw new Error(`데이터 삽입 실패: ${JSON.stringify(errorData)}`)
    }

    return NextResponse.json({ message: '패치정보가 저장되었습니다.' })
  } catch (error: any) {
    console.error('패치정보 저장 오류:', {
      message: error.message,
      stack: error.stack,
      details: error.details
    })
    return NextResponse.json(
      { 
        error: '패치정보 저장에 실패했습니다.',
        details: error.message
      },
      { status: 500 }
    )
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const commit_date = searchParams.get('commit_date')
    const commit_title = searchParams.get('commit_title')
    const uid = searchParams.get('uid')

    console.log('삭제 요청 UID:', uid)
    console.log('필요한 UID:', 'a8mwwycqhaZLIb9iOcshPbpAVrj2')

    if (!uid || uid !== 'a8mwwycqhaZLIb9iOcshPbpAVrj2') {
      console.log('권한 없음:', { uid, required: 'a8mwwycqhaZLIb9iOcshPbpAVrj2' })
      return NextResponse.json(
        { error: '권한이 없습니다.' },
        { status: 403 }
      )
    }

    if (!commit_date || !commit_title) {
      return NextResponse.json(
        { error: '필수 파라미터가 누락되었습니다.' },
        { status: 400 }
      )
    }

    // Google Cloud API 엔드포인트
    const url = `https://bigquery.googleapis.com/bigquery/v2/projects/${process.env.GOOGLE_CLOUD_PROJECT_ID}/queries`

    // 데이터 삭제 쿼리
    const deleteQuery = `
      DELETE FROM \`third-current-410914.project_m.admin_db\`
      WHERE commit_date = @commit_date AND commit_title = @commit_title
    `

    // JWT 토큰 생성
    const now = Math.floor(Date.now() / 1000)
    const privateKeyString = process.env.GOOGLE_CLOUD_PRIVATE_KEY?.replace(/\\n/g, '\n') || ''
    
    if (!privateKeyString) {
      throw new Error('GOOGLE_CLOUD_PRIVATE_KEY 환경 변수가 설정되지 않았습니다.')
    }

    const privateKey = createPrivateKey({
      key: privateKeyString,
      format: 'pem',
    })
    
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
    )

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
    })

    const tokenData = await tokenResponse.json()

    if (!tokenResponse.ok) {
      throw new Error(`액세스 토큰 획득 실패: ${JSON.stringify(tokenData)}`)
    }

    const { access_token } = tokenData

    // 데이터 삭제
    const deleteResponse = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: deleteQuery,
        useLegacySql: false,
        queryParameters: [
          {
            name: 'commit_date',
            parameterType: { type: 'STRING' },
            parameterValue: { value: commit_date }
          },
          {
            name: 'commit_title',
            parameterType: { type: 'STRING' },
            parameterValue: { value: commit_title }
          }
        ]
      }),
    })

    if (!deleteResponse.ok) {
      const errorData = await deleteResponse.json()
      throw new Error(`데이터 삭제 실패: ${JSON.stringify(errorData)}`)
    }

    return NextResponse.json({ message: '패치노트가 삭제되었습니다.' })
  } catch (error: any) {
    console.error('패치노트 삭제 오류:', {
      message: error.message,
      stack: error.stack,
      details: error.details
    })
    return NextResponse.json(
      { 
        error: '패치노트 삭제에 실패했습니다.',
        details: error.message
      },
      { status: 500 }
    )
  }
} 