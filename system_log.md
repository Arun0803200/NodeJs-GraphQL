# System Log — NodeJs-GraphQL Multi-Person Portfolio Platform

## Overview

A **multi-person portfolio platform** with a Node.js/GraphQL backend and React.js frontend. Supports three access levels: **Admin** (full platform management), **User** (own portfolio CRUD), and **Guest** (public read-only access). Features JWT authentication, role-based authorization, and AWS S3 file uploads.

---

## Tech Stack

| Layer           | Technology                          | Version    |
|-----------------|-------------------------------------|------------|
| Runtime         | Node.js                             | —          |
| Language        | TypeScript                          | ^5.5.3     |
| Framework       | Express.js                          | ^4.19.2    |
| GraphQL         | Apollo Server Express               | ^3.13.0    |
| Schema          | type-graphql (decorator-based)      | ^2.0.0-rc.1|
| ORM             | TypeORM                             | ^0.3.20    |
| Database        | PostgreSQL (via `pg` driver)        | ^8.20.0    |
| Authentication  | jsonwebtoken + bcryptjs             | —          |
| File Upload     | graphql-upload-ts                   | ^2.1.3     |
| Cloud Storage   | AWS S3 (`@aws-sdk/client-s3`)       | ^3.1003.0  |
| Env Config      | dotenv                              | ^17.3.1    |
| Dev Tooling     | nodemon, ts-node                    | ^3.1.4     |

### Frontend

| Layer           | Technology                          | Version    |
|-----------------|-------------------------------------|------------|
| Framework       | React.js (TypeScript)               | ^19.x      |
| Build Tool      | Vite                                | ^8.0       |
| Routing         | React Router DOM                    | ^7.x       |
| GraphQL Client  | Apollo Client                       | ^4.1       |
| Styling         | Custom CSS (no framework)           | —          |

---

## Project Structure

```
/
├── src/                    — Backend source
├── frontend/               — React frontend
│   ├── src/
│   │   ├── api/            — Apollo client + GraphQL queries
│   │   ├── context/        — Auth context provider
│   │   ├── components/     — Shared UI (Layout, DataTable, Modal, Alert)
│   │   ├── pages/
│   │   │   ├── auth/       — Login, Register
│   │   │   ├── admin/      — Dashboard, Users, User Detail, Messages
│   │   │   └── user/       — Dashboard, Profile, About, Experience,
│   │   │                     Projects, Skills, Awards, Education, Images
│   │   ├── App.tsx         — Route definitions
│   │   └── index.css       — Global styles
│   ├── .env                — VITE_API_URL
│   └── package.json        — Frontend dependencies
├── .env                    — Backend env vars
└── package.json            — Backend dependencies

src/  (Backend)
├── Config/
│   ├── env.ts              — Centralized environment variable loader
│   ├── DataSource.ts       — TypeORM PostgreSQL connection (all 10 entities)
│   ├── S3Service.ts        — AWS S3 client setup
│   ├── SettingsTypes.ts    — GraphQL input/output type definitions
│   └── Data.ts             — (empty/unused)
├── Entity/
│   ├── Auth.ts             — tbl_auth (login credentials, roles)
│   ├── User.ts             — tbl_users (user profiles)
│   ├── About.ts            — tbl_about (portfolio about section)
│   ├── UserImages.ts       — tbl_user_images (uploaded images)
│   ├── UserExperience.ts   — tbl_user_experience (work history)
│   ├── UserProjects.ts     — tbl_user_projects (portfolio projects)
│   ├── UserSkills.ts       — tbl_user_skills (skills by category)
│   ├── UserAwards.ts       — tbl_users_awards (achievements)
│   ├── UserEducation.ts    — tbl_user_education (education history)
│   └── ContactUs.ts        — tbl_contact_us (contact form messages)
├── Middleware/
│   └── authChecker.ts      — JWT verification, role-based auth, context builder
├── Resolvers/
│   ├── Auth/
│   │   └── AuthResolver.ts         — register, login, me
│   ├── Admin/
│   │   ├── AdminUserResolver.ts     — User CRUD, activate/deactivate, stats
│   │   └── AdminPortfolioResolver.ts — Full CRUD on all portfolio sections
│   ├── User/
│   │   └── UserProfileResolver.ts   — Own portfolio CRUD (all sections)
│   └── Guest/
│       └── GuestResolver.ts         — Public read-only queries, contact form
├── Resolers/               — Legacy resolvers (backward compatibility)
│   ├── UserResolver.ts
│   ├── UploadResolver.ts
│   ├── AboutResolver.ts
│   ├── UserExperienceResolver.ts
│   └── UserProjectResolver.ts
├── Responses/
│   ├── UserResponse.ts
│   └── UserFindOneResponse.ts
├── migrations/
│   └── 001_initial_multi_user.sql   — Auth table + missing tables + indexes
└── server.ts               — Express + Apollo Server entry point
```

---

## Scripts

### Backend (root directory)

| Command       | Description                                             |
|---------------|---------------------------------------------------------|
| `npm start`   | Runs `nodemon --exec ts-node src/server.ts --watch src` |

### Frontend (`frontend/` directory)

| Command            | Description                        |
|--------------------|------------------------------------|
| `npm run dev`      | Start Vite dev server (port 5173)  |
| `npm run build`    | Production build to `dist/`        |
| `npm run preview`  | Preview production build           |

---

## Authentication & Authorization

| Feature        | Implementation                                |
|----------------|-----------------------------------------------|
| Token type     | JWT Bearer token (Authorization header)       |
| Password hash  | bcryptjs (12 salt rounds)                     |
| Roles          | `admin`, `user`                               |
| Auth checker   | type-graphql `@Authorized()` decorator        |
| Context        | JWT payload extracted per-request              |
| Token expiry   | Configurable via `JWT_EXPIRES_IN` (default: 7d) |

### Role Access Matrix

| Panel   | Decorator                     | Access                              |
|---------|-------------------------------|-------------------------------------|
| Admin   | `@Authorized("admin")`        | Full CRUD on all users & data       |
| User    | `@Authorized("user", "admin")`| Own portfolio data only             |
| Guest   | (none)                        | Public read-only queries            |
| Auth    | (none) / `@Authorized()`      | Register, login (public); me (auth) |

---

## Database Schema

**Database name:** `user_portfolio`

### All Tables (10 total)

| Table                  | Entity           | Status      |
|------------------------|------------------|-------------|
| `tbl_auth`             | Auth             | NEW         |
| `tbl_users`            | User             | Existing    |
| `tbl_user_images`      | UserImages       | Existing    |
| `tbl_about`            | About            | Existing    |
| `tbl_user_experience`  | UserExperience   | Existing    |
| `tbl_user_projects`    | UserProjects     | Existing    |
| `tbl_user_skills`      | UserSkills       | Now registered |
| `tbl_users_awards`     | UserAwards       | Now registered |
| `tbl_user_education`   | UserEducation    | Now registered |
| `tbl_contact_us`       | ContactUs        | Now registered |

---

## GraphQL API — Endpoint: `http://localhost:4000/graphql`

### Auth (Public)
| Operation  | Type     | Description            |
|------------|----------|------------------------|
| `register` | Mutation | Create account + profile |
| `login`    | Mutation | Authenticate, get JWT  |
| `me`       | Query    | Get current user (auth required) |

### Admin Panel (role: admin)
| Operation                    | Type     | Description                      |
|------------------------------|----------|----------------------------------|
| `adminGetAllUsers`           | Query    | List all users (paginated)       |
| `adminGetUser`               | Query    | Get user by UUID                 |
| `adminCreateUser`            | Mutation | Create user with role            |
| `adminUpdateUser`            | Mutation | Update any user profile          |
| `adminDeactivateUser`        | Mutation | Deactivate account               |
| `adminActivateUser`          | Mutation | Reactivate account               |
| `adminGetStats`              | Query    | Platform statistics              |
| `adminGetAbout`              | Query    | Get any user's about             |
| `adminUpdateAbout`           | Mutation | Update any user's about          |
| `adminDeleteAbout`           | Mutation | Delete any user's about          |
| `adminGetExperiences`        | Query    | Get any user's experiences       |
| `adminUpdateExperience`      | Mutation | Update any experience            |
| `adminDeleteExperience`      | Mutation | Delete any experience            |
| `adminGetProjects`           | Query    | Get any user's projects          |
| `adminUpdateProject`         | Mutation | Update any project               |
| `adminDeleteProject`         | Mutation | Delete any project               |
| `adminGetSkills`             | Query    | Get any user's skills            |
| `adminUpdateSkills`          | Mutation | Update any skills                |
| `adminDeleteSkills`          | Mutation | Delete any skills                |
| `adminGetAwards`             | Query    | Get any user's awards            |
| `adminUpdateAward`           | Mutation | Update any award                 |
| `adminDeleteAward`           | Mutation | Delete any award                 |
| `adminGetEducation`          | Query    | Get any user's education         |
| `adminUpdateEducation`       | Mutation | Update any education             |
| `adminDeleteEducation`       | Mutation | Delete any education             |
| `adminGetContactMessages`    | Query    | View contact messages            |
| `adminDeleteContactMessage`  | Mutation | Delete contact message           |
| `adminGetUserImages`         | Query    | View any user's images           |

### User Panel (role: user/admin)
| Operation            | Type     | Description                      |
|----------------------|----------|----------------------------------|
| `myProfile`          | Query    | Get own profile                  |
| `updateMyProfile`    | Mutation | Update own profile               |
| `myAbout`            | Query    | Get own about                    |
| `upsertMyAbout`      | Mutation | Create/update own about          |
| `myExperiences`      | Query    | Get own experiences              |
| `addMyExperience`    | Mutation | Add own experience               |
| `updateMyExperience` | Mutation | Update own experience            |
| `deleteMyExperience` | Mutation | Delete own experience            |
| `myProjects`         | Query    | Get own projects                 |
| `addMyProject`       | Mutation | Add own project                  |
| `updateMyProject`    | Mutation | Update own project               |
| `deleteMyProject`    | Mutation | Delete own project               |
| `mySkills`           | Query    | Get own skills                   |
| `addMySkills`        | Mutation | Add own skills                   |
| `updateMySkills`     | Mutation | Update own skills                |
| `deleteMySkills`     | Mutation | Delete own skills                |
| `myAwards`           | Query    | Get own awards                   |
| `addMyAward`         | Mutation | Add own award                    |
| `updateMyAward`      | Mutation | Update own award                 |
| `deleteMyAward`      | Mutation | Delete own award                 |
| `myEducation`        | Query    | Get own education                |
| `addMyEducation`     | Mutation | Add own education                |
| `updateMyEducation`  | Mutation | Update own education             |
| `deleteMyEducation`  | Mutation | Delete own education             |
| `myImages`           | Query    | Get own images                   |

### Guest Panel (Public)
| Operation               | Type  | Description                       |
|-------------------------|-------|-----------------------------------|
| `getPublicProfile`      | Query | View any user's public profile    |
| `getPublicAbout`        | Query | View any user's about section     |
| `getPublicExperiences`  | Query | View any user's experiences       |
| `getPublicProjects`     | Query | View any user's projects          |
| `getPublicSkills`       | Query | View any user's skills            |
| `getPublicAwards`       | Query | View any user's awards            |
| `getPublicEducation`    | Query | View any user's education         |
| `getPublicImages`       | Query | View any user's images            |
| `submitContactMessage`  | Query | Send a contact message            |

---

## Environment Variables

All centralized in `src/Config/env.ts`.

| Variable                | Purpose                      | Required |
|-------------------------|------------------------------|----------|
| `AWS_REGION`            | AWS S3 region                | Yes      |
| `AWS_ACCESS_KEY_ID`     | AWS IAM access key           | Yes      |
| `AWS_SECRET_ACCESS_KEY` | AWS IAM secret key           | Yes      |
| `AWS_S3_BUCKET_NAME`    | Target S3 bucket name        | Yes      |
| `DB_HOST`               | PostgreSQL host              | No (localhost) |
| `DB_PORT`               | PostgreSQL port              | No (5432) |
| `DB_USERNAME`           | PostgreSQL username          | Yes      |
| `DB_PASSWORD`           | PostgreSQL password          | Yes      |
| `DB_NAME`               | PostgreSQL database name     | No (user_portfolio) |
| `PORT`                  | Server port                  | No (4000) |
| `JWT_SECRET`            | JWT signing secret           | Yes      |
| `JWT_EXPIRES_IN`        | JWT token expiry             | No (7d)  |

### Frontend (`frontend/.env`)

| Variable        | Purpose                           | Default                           |
|-----------------|-----------------------------------|-----------------------------------|
| `VITE_API_URL`  | Backend GraphQL endpoint          | `http://localhost:4000/graphql`   |
