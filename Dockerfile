# Node.js 이미지를 기반으로 함
FROM node:20-alpine

# 작업 디렉토리 설정
WORKDIR /app

# package.json과 package-lock.json 복사
COPY package*.json ./

# 의존성 설치 (개발 의존성 포함)
RUN npm ci

# lodash 패키지 명시적 설치
RUN npm install lodash

# 소스 코드 복사
COPY . .

# Next.js 빌드
RUN npm run build

# 개발 서버 실행
CMD ["npm", "run", "dev"] 