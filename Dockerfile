# backend/Dockerfile

FROM node:20-alpine

# 작업 디렉토리 설정
WORKDIR /app

# 패키지 파일 복사
COPY package.json yarn.lock ./

# 의존성 설치
RUN yarn install --frozen-lockfile

# 나머지 코드 복사
COPY . .

# Prisma Client 생성
RUN npx prisma generate

# TypeScript 빌드
RUN yarn build

# 5001 포트 열기
EXPOSE 5001

# 서버 실행
CMD ["node", "lib/index.js"]
