# Korips Backend

코립스(Korips) 프로젝트의 백엔드 API 서버입니다. 이 프로젝트는 숙소, 온천, 티켓 예약 및 관련 서비스를 제공하는 것을 목표로 합니다.

This is the backend API server for the Korips project. This project aims to provide services related to lodging, hot springs, and ticket reservations.

## 🛠️ 기술 스택 / Tech Stack

<table>
  <tr>
    <td align="center" width="96">
      <a href="https://www.typescriptlang.org/" target="_blank">
        <img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript"/>
      </a>
    </td>
    <td align="center" width="96">
      <a href="https://nodejs.org/" target="_blank">
        <img src="https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" alt="Node.js"/>
      </a>
    </td>
    <td align="center" width="96">
      <a href="https://expressjs.com/" target="_blank">
        <img src="https://img.shields.io/badge/Express-000000?style=for-the-badge&logo=express&logoColor=white" alt="Express.js"/>
      </a>
    </td>
    <td align="center" width="96">
      <a href="https://www.prisma.io/" target="_blank">
        <img src="https://img.shields.io/badge/Prisma-2D3748?style=for-the-badge&logo=prisma&logoColor=white" alt="Prisma"/>
      </a>
    </td>
     <td align="center" width="96">
      <a href="https://jwt.io/" target="_blank">
        <img src="https://img.shields.io/badge/JWT-000000?style=for-the-badge&logo=jsonwebtokens&logoColor=white" alt="JSON Web Tokens"/>
      </a>
    </td>
    <td align="center" width="96">
      <a href="https://www.docker.com/" target="_blank">
        <img src="https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white" alt="Docker"/>
      </a>
    </td>
  </tr>
  <tr>
    <td align="center" width="96">
      <a href="https://eslint.org/" target="_blank">
        <img src="https://img.shields.io/badge/ESLint-4B32C3?style=for-the-badge&logo=eslint&logoColor=white" alt="ESLint"/>
      </a>
    </td>
    <td align="center" width="96">
      <a href="https://cloudinary.com/" target="_blank">
        <img src="https://img.shields.io/badge/Cloudinary-3448C5?style=for-the-badge&logo=cloudinary&logoColor=white" alt="Cloudinary"/>
      </a>
    </td>
    <td align="center" width="96">
      <a href="https://www.deepl.com/" target="_blank">
        <img src="https://img.shields.io/badge/DeepL-0F2B46?style=for-the-badge&logo=deepl&logoColor=white" alt="DeepL"/>
      </a>
    </td>
    <td align="center" width="96">
      <a href="https://github.com/features/actions" target="_blank">
        <img src="https://img.shields.io/badge/GitHub_Actions-2088FF?style=for-the-badge&logo=githubactions&logoColor=white" alt="GitHub Actions"/>
      </a>
    </td>
    <td align="center" width="96">
      <a href="https://www.postgresql.org/" target="_blank">
        <img src="https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL"/>
      </a>
    </td>
     <td align="center" width="96">
      <a href="https://nodemailer.com/" target="_blank">
        <img src="https://img.shields.io/badge/Nodemailer-22B573?style=for-the-badge&logo=nodemailer&logoColor=white" alt="Nodemailer"/>
      </a>
    </td>
  </tr>
</table>

## ✨ 주요 기능 / Features

- **사용자 관리**: JWT 기반 회원가입, 로그인, 소셜 로그인 및 프로필 관리
- **User Management**: JWT-based registration, login, social login, and profile management.

- **숙소 및 객실**: 숙소 정보, 객실 타입, 재고 및 가격 관리
- **Lodging & Rooms**: Management of lodging information, room types, inventory, and pricing.

- **예약 시스템**: 숙소 및 티켓 예약, 결제 연동 및 예약 관리
- **Reservation System**: Lodge and ticket reservations, payment integration, and reservation management.

- **리뷰 및 평가**: 숙소 및 티켓에 대한 리뷰 작성, 조회, 신고 기능
- **Reviews & Ratings**: Features for writing, viewing, and reporting reviews for lodges and tickets.

- **북마크**: 관심 있는 숙소 및 티켓을 저장하는 기능
- **Bookmarks**: Functionality to save interested lodges and tickets.

- **뉴스 및 이벤트**: 최신 소식 및 이벤트 공지 기능
- **News & Events**: Feature for announcing the latest news and events.

- **다국어 지원**: DeepL API를 활용한 동적 번역 기능
- **Multilingual Support**: Dynamic translation feature using the DeepL API.

- **이미지 처리**: Cloudinary를 통한 이미지 업로드 및 관리
- **Image Processing**: Image upload and management via Cloudinary.

- **관리자 기능**: 사용자, 숙소, 예약, 리뷰 등을 관리하는 관리자 전용 API
- **Admin Features**: Administrator-only API for managing users, lodges, reservations, reviews, etc.

## 🚀 시작하기 / Getting Started

### 사전 준비 / Prerequisites

- [Node.js](https://nodejs.org/) (v20 이상 권장 / v20 or higher recommended)
- [Yarn](https://yarnpkg.com/)
- [Docker](https://www.docker.com/) (선택 사항, 데이터베이스 구동용 / Optional, for running the database)

### 설치 및 실행 / Installation & Execution

1.  **저장소 복제 / Clone the repository**
    ```bash
    git clone https://github.com/Raina-Moon/korip-backend.git
    cd korip-backend
    ```

2.  **의존성 설치 / Install dependencies**
    ```bash
    yarn install
    ```

3.  **환경 변수 설정 / Set up environment variables**
    `.env.sample` 파일을 복사하여 `.env` 파일을 생성하고, 내용을 자신의 환경에 맞게 수정합니다.
    Copy the `.env.sample` file to create a `.env` file, and modify the contents to fit your environment.
    ```bash
    cp .env.sample .env
    ```

4.  **데이터베이스 마이그레이션 / Database Migration**
    Prisma를 사용하여 데이터베이스 스키마를 적용합니다.
    Apply the database schema using Prisma.
    ```bash
    yarn prisma migrate dev
    ```

5.  **개발 서버 실행 / Run the development server**
    ```bash
    yarn dev
    ```
    서버는 `http://localhost:PORT` (PORT는 `.env` 파일에 설정된 값)에서 실행됩니다.
    The server will run at `http://localhost:PORT` (where PORT is the value set in your `.env` file).

## ⚙️ 환경 변수 / Environment Variables

프로젝트 실행에 필요한 주요 환경 변수는 다음과 같습니다. 자세한 내용은 `.env.sample` 파일을 참고하세요.
The main environment variables required to run the project are as follows. For details, please refer to the `.env.sample` file.

- `DATABASE_URL`
- `PORT`
- `JWT_SECRET`
- `JWT_EXPIRES_IN`
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`
- `DEEPL_API_KEY`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `NAVER_CLIENT_ID`
- `NAVER_CLIENT_SECRET`
- `KAKAO_CLIENT_ID`

## 🗄️ 데이터베이스 / Database

이 프로젝트는 **Prisma ORM**을 사용하여 데이터베이스와 상호작용합니다. 데이터베이스 스키마는 `prisma/schema.prisma` 파일에 정의되어 있습니다.

This project uses **Prisma ORM** to interact with the database. The database schema is defined in the `prisma/schema.prisma` file.

- **마이그레이션 생성 / Create Migration**: `yarn prisma migrate dev --name <migration-name>`
- **Prisma Studio 실행 / Run Prisma Studio**: `yarn prisma studio` (데이터베이스를 GUI로 확인 및 수정 / View and edit the database with a GUI)

## 📄 라이선스 / License

이 프로젝트는 [MIT](LICENSE) 라이선스를 따릅니다.
This project is licensed under the [MIT](LICENSE) License.