import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { createPrivateKey } from 'crypto';

// 디버그 로깅
const DEBUG = process.env.DEBUG_API === 'true';

function logDebug(message: string, data?: any) {
  if (DEBUG) {
    console.log(`[DEBUG] [Revenue API] ${message}`, data ? data : '');
  }
}

export async function GET(request: NextRequest) {
  logDebug('API 호출 시작', { url: request.url });

  const searchParams = request.nextUrl.searchParams;
  
  // 필터 파라미터
  const brand_group = searchParams.get('brand_group'); // 브랜드
  const team = searchParams.get('team');              // 팀
  const channel_category_2 = searchParams.get('channel_category_2');
  const channel_category_3 = searchParams.get('channel_category_3');
  const channel_name = searchParams.get('channel_name');
  const manager = searchParams.get('manager');
  const startDate = searchParams.get('startDate') || getDefaultStartDate();
  const endDate = searchParams.get('endDate') || getDefaultEndDate();
  
  // 필터 옵션만 요청하는 경우 (계층적 필터링을 위한 파라미터)
  const filterOptionsOnly = searchParams.get('filterOptionsOnly') === 'true';

  logDebug('필터 파라미터', {
    brand_group,
    team,
    channel_category_2,
    channel_category_3,
    channel_name,
    manager,
    startDate,
    endDate,
    filterOptionsOnly
  });

  try {
    // BigQuery API 엔드포인트
    const url = `https://bigquery.googleapis.com/bigquery/v2/projects/${process.env.GOOGLE_CLOUD_PROJECT_ID}/queries`;
    
    // 액세스 토큰 획득
    const access_token = await getAccessToken();

    // 필터 옵션 데이터 가져오기 (항상 필요함)
    const filterOptions = await fetchFilterOptions(url, access_token, {
      brand_group,
      team,
      channel_category_2,
      channel_category_3,
      channel_name,
      manager
    });
    
    // 필터 옵션만 요청한 경우 차트 데이터는 조회하지 않음
    if (filterOptionsOnly) {
      return NextResponse.json({
        filterOptions
      });
    }

    // 차트 데이터 가져오기
    const chartData = await fetchChartData(url, access_token, {
      brand_group,
      team,
      channel_category_2,
      channel_category_3,
      channel_name,
      manager,
      startDate,
      endDate
    });

    logDebug('API 응답 생성 완료');
    
    return NextResponse.json({
      chartData,
      filterOptions
    });
  } catch (error) {
    console.error('Revenue API 오류:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '데이터 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// 차트 데이터 조회 함수
async function fetchChartData(url: string, access_token: string, filters: any) {
  logDebug('차트 데이터 조회 시작', filters);

  const { 
    brand_group,
    team,
    channel_category_2,
    channel_category_3,
    channel_name,
    manager,
    startDate,
    endDate
  } = filters;

  // 필터 조건 설정
  const whereConditions = ['1=1']; // 항상 참인 조건으로 시작
  
  if (brand_group) {
    whereConditions.push(`brand_group = '${brand_group}'`);
  }
  if (team) {
    whereConditions.push(`team = '${team}'`);
  }
  if (channel_category_2) {
    whereConditions.push(`channel_category_2 = '${channel_category_2}'`);
  }
  if (channel_category_3) {
    whereConditions.push(`channel_category_3 = '${channel_category_3}'`);
  }
  if (channel_name) {
    whereConditions.push(`channel_name = '${channel_name}'`);
  }
  if (manager) {
    whereConditions.push(`manager = '${manager}'`);
  }
  
  whereConditions.push(`order_date >= '${startDate}'`);
  whereConditions.push(`order_date <= '${endDate}'`);

  const whereClause = whereConditions.join(' AND ');

  // 요약 데이터 조회
  const summaryData = await fetchSummaryData(url, access_token, whereClause);
  
  // 파이 차트 데이터 조회
  const category2ChartData = await fetchPieChartData(url, access_token, whereClause, 'channel_category_2');
  const category3ChartData = await fetchPieChartData(url, access_token, whereClause, 'channel_category_3');
  const channelChartData = await fetchPieChartData(url, access_token, whereClause, 'channel_name');
  const managerChartData = await fetchPieChartData(url, access_token, whereClause, 'manager');
  
  // 트렌드 데이터 조회
  const trendData = await fetchTrendData(url, access_token, whereClause);

  return {
    pieCharts: {
      category2: category2ChartData,
      category3: category3ChartData,
      channel: channelChartData,
      manager: managerChartData
    },
    trendData,
    summary: {
      totalRevenue: summaryData.totalRevenue,
      totalCost: summaryData.totalCost,
      achievementRate: calculateAchievementRate(summaryData.totalRevenue, summaryData.totalTargetDay),
      dateCount: summaryData.dateCount,
      totalGrossAmount: summaryData.totalGrossAmount,
      growthRate: summaryData.growthRate,
      totalQuantity: summaryData.totalQuantity,
      quantityGrowthRate: summaryData.quantityGrowthRate,
      previousRevenue: summaryData.previousRevenue,
      previousQuantity: summaryData.previousQuantity,
      previousCost: summaryData.previousCost,
      costRate: summaryData.costRate,
      targetCostRate: summaryData.targetCostRate,
      costComparisonRate: summaryData.costComparisonRate,
      estimatedMonthlyRevenue: summaryData.estimatedMonthlyRevenue,
      estimatedMonthlyTarget: summaryData.estimatedMonthlyTarget,
      estimatedMonthlyAchievementRate: summaryData.estimatedMonthlyAchievementRate
    }
  };
}

// 요약 데이터 조회
async function fetchSummaryData(url: string, access_token: string, whereClause: string) {
  // 날짜 조건 추출
  const dateMatch = whereClause.match(/order_date >= '(.+?)' AND order_date <= '(.+?)'/);
  if (!dateMatch) {
    throw new Error('날짜 조건을 찾을 수 없습니다.');
  }
  
  const [_, startDate, endDate] = dateMatch;
  
  // 이전 기간의 시작일과 종료일 계산
  const startDateObj = new Date(startDate);
  const endDateObj = new Date(endDate);
  const dateDiff = Math.ceil((endDateObj.getTime() - startDateObj.getTime()) / (1000 * 60 * 60 * 24));
  
  const previousStartDate = new Date(startDateObj);
  previousStartDate.setDate(previousStartDate.getDate() - dateDiff - 1);
  
  const previousEndDate = new Date(startDateObj);
  previousEndDate.setDate(previousEndDate.getDate() - 1);
  
  const previousWhereClause = whereClause
    .replace(startDate, previousStartDate.toISOString().split('T')[0])
    .replace(endDate, previousEndDate.toISOString().split('T')[0]);
 

  const query = `
    WITH current_period AS (
      SELECT
        SUM(sum_final_calculated_amount) AS total_revenue,
        SUM(sum_org_amount) AS total_cost,
        SUM(target_day) AS total_target_day,
        SUM(target_orgprice) AS total_target_cost,
        COUNT(DISTINCT order_date) AS date_count,
        SUM(sum_gross_amount) AS total_gross_amount,
        SUM(sum_qty) AS total_quantity,
        (SUM(sum_final_calculated_amount) / COUNT(DISTINCT order_date)) * 28 AS estimated_monthly_revenue
      FROM 
        \`${process.env.GOOGLE_CLOUD_PROJECT_ID}.project_m.sales_db\`
      WHERE 
        ${whereClause}
    ),
    previous_period AS (
      SELECT
        SUM(sum_final_calculated_amount) AS total_revenue,
        SUM(sum_org_amount) AS total_cost,
        SUM(sum_gross_amount) AS total_gross_amount,
        SUM(sum_qty) AS total_quantity
      FROM 
        \`${process.env.GOOGLE_CLOUD_PROJECT_ID}.project_m.sales_db\`
      WHERE 
        ${previousWhereClause}
    )
    SELECT
      cp.total_revenue,
      cp.total_cost,
      cp.total_target_day,
      cp.total_target_cost,
      cp.date_count,
      cp.total_gross_amount,
      pp.total_gross_amount AS previous_gross_amount,
      cp.total_quantity,
      pp.total_quantity AS previous_quantity,
      pp.total_revenue AS previous_revenue,
      pp.total_cost AS previous_cost,
      cp.estimated_monthly_revenue
    FROM 
      current_period cp
    CROSS JOIN 
      previous_period pp
  `;
 

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
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`BigQuery API 요청 실패: ${JSON.stringify(errorData)}`);
  }

  const data = await response.json();
    
  if (!data.rows || data.rows.length === 0) {
    return { 
      totalRevenue: 0, 
      totalCost: 0, 
      totalTargetDay: 0, 
      dateCount: 0,
      totalGrossAmount: 0,
      previousGrossAmount: 0,
      totalQuantity: 0,
      previousQuantity: 0,
      previousRevenue: 0,
      previousCost: 0
    };
  }
  
  const totalRevenue = Math.round(Number(data.rows[0].f[0].v || 0));
  const totalCost = Math.round(Number(data.rows[0].f[1].v || 0));
  const totalTargetDay = Math.round(Number(data.rows[0].f[2].v || 0));
  const totalTargetCost = Math.round(Number(data.rows[0].f[3].v || 0));
  const dateCount = Math.round(Number(data.rows[0].f[4].v || 0));
  const totalGrossAmount = Math.round(Number(data.rows[0].f[5].v || 0));
  const previousGrossAmount = Math.round(Number(data.rows[0].f[6].v || 0));
  const totalQuantity = Math.round(Number(data.rows[0].f[7].v || 0));
  const previousQuantity = Math.round(Number(data.rows[0].f[8].v || 0));
  const previousRevenue = Math.round(Number(data.rows[0].f[9].v || 0));
  const previousCost = Math.round(Number(data.rows[0].f[10].v || 0));
  const estimatedMonthlyRevenue = Math.round(Number(data.rows[0].f[11].v || 0));
  const estimatedMonthlyAchievementRate = totalTargetDay === 0 ? 0 : 
    (estimatedMonthlyRevenue / totalTargetDay) * 100;
 

  const growthRate = previousGrossAmount === 0 ? 0 : 
    ((totalGrossAmount - previousGrossAmount) / previousGrossAmount) * 100;
    
  const quantityGrowthRate = previousQuantity === 0 ? 0 :
    ((totalQuantity - previousQuantity) / previousQuantity) * 100;

  const costRate = totalRevenue === 0 ? 0 : (totalCost / totalRevenue) * 100;
  const targetCostRate = totalTargetDay === 0 ? 0 : (totalTargetCost / totalTargetDay) * 100;
  const costComparisonRate = targetCostRate === 0 ? 0 : (costRate - targetCostRate);
 

  return {
    totalRevenue,
    totalCost,
    totalTargetDay,
    dateCount,
    totalGrossAmount,
    growthRate,
    totalQuantity,
    quantityGrowthRate,
    previousRevenue,
    previousQuantity,
    previousCost,
    costRate,
    targetCostRate,
    costComparisonRate,
    estimatedMonthlyRevenue,
    estimatedMonthlyTarget: totalTargetDay,
    estimatedMonthlyAchievementRate
  };
}

// 파이 차트 데이터 조회
async function fetchPieChartData(url: string, access_token: string, whereClause: string, groupByField: string) {
  const query = `
    SELECT 
      ${groupByField} AS name,
      SUM(sum_final_calculated_amount) AS value
    FROM 
      \`${process.env.GOOGLE_CLOUD_PROJECT_ID}.project_m.sales_db\`
    WHERE 
      ${whereClause}
      AND ${groupByField} IS NOT NULL
    GROUP BY 
      ${groupByField}
    ORDER BY 
      value DESC
  `;

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
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`BigQuery API 요청 실패: ${JSON.stringify(errorData)}`);
  }

  const data = await response.json();
  
  if (!data.rows) return [];
  
  return data.rows.map((row: any) => ({
    name: row.f[0].v,
    value: Number(row.f[1].v || 0),
    type: groupByField
  }));
}

// 트렌드 데이터 조회
async function fetchTrendData(url: string, access_token: string, whereClause: string) {
  // whereClause에서 startDate 추출
  const dateMatch = whereClause.match(/order_date >= '(.+?)'/);
  if (!dateMatch) {
    throw new Error('시작 날짜를 찾을 수 없습니다.');
  }
  const startDate = dateMatch[1];

  const dailyQuery = `
    SELECT 
      order_date,
      SUM(sum_final_calculated_amount) AS revenue,
      SUM(sum_org_amount) AS cost,
      SUM(sum_final_calculated_amount - sum_org_amount) AS profit,
      SUM(target_day) AS target_day
    FROM 
      \`${process.env.GOOGLE_CLOUD_PROJECT_ID}.project_m.sales_db\`
    WHERE 
      ${whereClause}
    GROUP BY 
      order_date
    ORDER BY 
      order_date
  `;

  const monthlyQuery = `
    WITH selected_year AS (
      SELECT EXTRACT(YEAR FROM DATE('${startDate}')) as year
    ),
    all_months AS (
      SELECT FORMAT_DATE('%Y-%m', DATE_ADD(DATE(FORMAT_DATE('%Y-01-01', DATE('${startDate}'))), 
             INTERVAL n MONTH)) as month
      FROM UNNEST(GENERATE_ARRAY(0, 11)) as n
    ),
    monthly_data AS (
      SELECT 
        FORMAT_DATE('%Y-%m', order_date) AS month,
        SUM(sum_final_calculated_amount) AS revenue,
        SUM(sum_org_amount) AS cost,
        SUM(sum_final_calculated_amount - sum_org_amount) AS profit,
        SUM(target_day) AS target_day
      FROM 
        \`${process.env.GOOGLE_CLOUD_PROJECT_ID}.project_m.sales_db\`
      WHERE 
        EXTRACT(YEAR FROM order_date) = (SELECT year FROM selected_year)
        AND ${whereClause.replace(/order_date >= '[^']+' AND order_date <= '[^']+'/, '1=1')}
      GROUP BY 
        month
    )
    SELECT 
      am.month,
      COALESCE(md.revenue, 0) as revenue,
      COALESCE(md.cost, 0) as cost,
      COALESCE(md.profit, 0) as profit,
      COALESCE(md.target_day, 0) as target_day
    FROM all_months am
    LEFT JOIN monthly_data md ON am.month = md.month
    ORDER BY 
      am.month
  `;

  try {
    const [dailyResponse, monthlyResponse] = await Promise.all([
      fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: dailyQuery,
          useLegacySql: false,
        }),
      }),
      fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: monthlyQuery,
          useLegacySql: false,
        }),
      }),
    ]);

    const dailyData = await dailyResponse.json();
    const monthlyData = await monthlyResponse.json();
 

    // 응답 데이터 처리
    const processRows = (rows: any[], isMonthly: boolean = false) => {
      if (!rows) return [];
      return rows.map((row: any) => ({
        [isMonthly ? 'month' : 'order_date']: row.f[0].v,
        revenue: Number(row.f[1].v || 0),
        cost: Number(row.f[2].v || 0),
        profit: Number(row.f[3].v || 0),
        target_day: Number(row.f[4].v || 0)
      }));
    };

    return {
      daily: processRows(dailyData.rows || []),
      monthly: processRows(monthlyData.rows || [], true)
    };
  } catch (error) {
    console.error('트렌드 데이터 조회 중 오류 발생:', error);
    return {
      daily: [],
      monthly: []
    };
  }
}

// 목표 대비 달성률 계산 함수 추가
function calculateAchievementRate(totalRevenue: number, totalTargetDay: number) {
  if (!totalTargetDay || totalTargetDay === 0) return 0;
  
  // 달성률 = (총 매출액 / 총 목표액) * 100
  return (totalRevenue / totalTargetDay) * 100;
}

// 필터 옵션 조회 함수
async function fetchFilterOptions(url: string, access_token: string, filters: any) {
  logDebug('필터 옵션 조회 시작', filters);
  
  const {
    brand_group,
    team,
    channel_category_2,
    channel_category_3,
    channel_name,
    manager
  } = filters;
  
  // 브랜드(brand_group) 옵션 조회 - 항상 전체 목록
  const brandGroupOptions = await fetchDistinctValues(
    url, 
    access_token, 
    'brand_group', 
    {}
  );
  
  // 팀(team) 옵션 조회 - 브랜드 필터 적용
  const teamFilters: any = {};
  if (brand_group) {
    teamFilters.brand_group = brand_group;
  }
  const teamOptions = await fetchDistinctValues(
    url, 
    access_token, 
    'team', 
    teamFilters
  );
  
  // 구분(channel_category_2) 옵션 조회 - 브랜드, 팀 필터 적용
  const category2Filters: any = {};
  if (brand_group) {
    category2Filters.brand_group = brand_group;
  }
  if (team) {
    category2Filters.team = team;
  }
  const category2Options = await fetchDistinctValues(
    url, 
    access_token, 
    'channel_category_2', 
    category2Filters
  );
  
  // 분류(channel_category_3) 옵션 조회 - 브랜드, 팀, 구분 필터 적용
  const category3Filters: any = {};
  if (brand_group) {
    category3Filters.brand_group = brand_group;
  }
  if (team) {
    category3Filters.team = team;
  }
  if (channel_category_2) {
    category3Filters.channel_category_2 = channel_category_2;
  }
  const category3Options = await fetchDistinctValues(
    url, 
    access_token, 
    'channel_category_3', 
    category3Filters
  );
  
  // 채널(channel_name) 옵션 조회 - 브랜드, 팀, 구분, 분류 필터 적용
  const channelFilters: any = {};
  if (brand_group) {
    channelFilters.brand_group = brand_group;
  }
  if (team) {
    channelFilters.team = team;
  }
  if (channel_category_2) {
    channelFilters.channel_category_2 = channel_category_2;
  }
  if (channel_category_3) {
    channelFilters.channel_category_3 = channel_category_3;
  }
  const channelOptions = await fetchDistinctValues(
    url, 
    access_token, 
    'channel_name', 
    channelFilters
  );
  
  // 담당자(manager) 옵션 조회 - 브랜드, 팀, 구분, 분류, 채널 필터 적용
  const managerFilters: any = {};
  if (brand_group) {
    managerFilters.brand_group = brand_group;
  }
  if (team) {
    managerFilters.team = team;
  }
  if (channel_category_2) {
    managerFilters.channel_category_2 = channel_category_2;
  }
  if (channel_category_3) {
    managerFilters.channel_category_3 = channel_category_3;
  }
  if (channel_name) {
    managerFilters.channel_name = channel_name;
  }
  const managerOptions = await fetchDistinctValues(
    url, 
    access_token, 
    'manager', 
    managerFilters
  );
  
  logDebug('필터 옵션 조회 완료', {
    brandGroupCount: brandGroupOptions.length,
    teamCount: teamOptions.length,
    category2Count: category2Options.length,
    category3Count: category3Options.length,
    channelCount: channelOptions.length,
    managerCount: managerOptions.length
  });
  
  return {
    brand_group: brandGroupOptions,
    team: teamOptions,
    category2: category2Options,
    category3: category3Options,
    channel: channelOptions,
    manager: managerOptions
  };
}

// 개별 컬럼의 고유 값 조회 함수 (필터 적용)
async function fetchDistinctValues(
  url: string, 
  access_token: string, 
  columnName: string, 
  filters: Record<string, string>
) {
  // 필터 조건 설정
  const whereConditions = ['1=1']; // 항상 참인 조건으로 시작
  
  // 필터 추가
  Object.entries(filters).forEach(([key, value]) => {
    if (value) {
      whereConditions.push(`${key} = '${value}'`);
    }
  });
  
  const whereClause = whereConditions.join(' AND ');
  
  const query = `
    SELECT DISTINCT ${columnName}
    FROM \`${process.env.GOOGLE_CLOUD_PROJECT_ID}.project_m.sales_db\`
    WHERE ${whereClause}
    AND ${columnName} IS NOT NULL
    ORDER BY ${columnName}
  `;

  logDebug(`${columnName} 옵션 조회 쿼리`, { query });

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
  });

  if (!response.ok) {
    const errorData = await response.json();
    console.error(`${columnName} 조회 실패:`, errorData);
    return [];
  }

  const data = await response.json();
  
  return data.rows 
    ? data.rows.map((row: any) => row.f[0].v)
    : [];
}

// JWT 토큰으로 액세스 토큰 가져오기
async function getAccessToken() {
  logDebug('액세스 토큰 요청 시작');
  
  const now = Math.floor(Date.now() / 1000);
  const privateKeyString = process.env.GOOGLE_CLOUD_PRIVATE_KEY?.replace(/\\n/g, '\n') || '';
  
  if (!privateKeyString) {
    throw new Error('GOOGLE_CLOUD_PRIVATE_KEY 환경 변수가 설정되지 않았습니다.');
  }

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

  const tokenData = await tokenResponse.json();

  if (!tokenResponse.ok) {
    throw new Error(`액세스 토큰 획득 실패: ${JSON.stringify(tokenData)}`);
  }

  logDebug('액세스 토큰 획득 완료');
  return tokenData.access_token;
}

// 기본 시작 날짜 (최근 3개월)
function getDefaultStartDate() {
  const date = new Date();
  date.setMonth(date.getMonth() - 3);
  return date.toISOString().split('T')[0];
}

// 기본 종료 날짜 (오늘)
function getDefaultEndDate() {
  return new Date().toISOString().split('T')[0];
} 