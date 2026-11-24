# EcoWeave — Sustainable Textile Manufacturing & Production Tracking System

A full-stack industrial operations platform built with a **React + TypeScript + Tailwind CSS + Recharts** frontend, a **C++17 + Crow** REST API backend, and a **MySQL / MariaDB** 12-table relational database.

---

## Project Architecture

```text
├── frontend/
│   └── src/
│       ├── assets/       # Visual media references
│       ├── components/   # Reusable modals, confirmation dialogs, status indicators
│       ├── layouts/      # Role-based sidebar & workspace shell (DashboardLayout.tsx)
│       ├── pages/        # All 9 operational modules + AuthPage
│       ├── services/     # REST API client communicating with C++ backend
│       └── types/        # TypeScript domain interfaces
├── backend/
│   ├── CMakeLists.txt    # CMake C++17 build configuration
│   ├── include/          # Crow header (crow_all.h), config.hpp, auth.hpp, db.hpp
│   ├── models/           # Domain enums & stage progression calculations
│   ├── database/         # Thread-safe MySQL prepared-statement client (db.cpp)
│   ├── controllers/      # Modular Crow controllers for all 10 API domains
│   ├── routes/           # Central REST route registration
│   └── src/main.cpp      # Crow multithreaded server entry point
├── database/
│   ├── schema.sql        # 12-table MySQL relational schema
│   └── sample_data.sql   # Seeded baseline records (tagged is_sample_data = TRUE)
├── CMakeLists.txt
├── package.json
└── .env.example
```

---

## Prerequisites

- **C++17 Compiler**: GCC 9+ or Clang 10+
- **CMake**: 3.16+
- **Libraries**:
  - `libmariadb-dev` / `default-libmysqlclient-dev`
  - `libssl-dev` (OpenSSL 3.x)
  - `libasio-dev` (standalone Asio required by Crow)
- **Database**: MySQL 8.0+ or MariaDB 10.6+
- **Frontend Tooling**: Node.js 18+ and npm

On Debian / Ubuntu:
```bash
sudo apt-get update
sudo apt-get install -y g++ cmake default-libmysqlclient-dev libasio-dev libssl-dev mariadb-server
```

---

## 1. Database Setup (MySQL / MariaDB)

1. Start MySQL / MariaDB and create the application user:
```sql
CREATE DATABASE IF NOT EXISTS sustainable_textile_db;
CREATE USER IF NOT EXISTS 'textile_user'@'127.0.0.1' IDENTIFIED BY '<YOUR_DB_PASSWORD>';
GRANT ALL PRIVILEGES ON sustainable_textile_db.* TO 'textile_user'@'127.0.0.1';
FLUSH PRIVILEGES;
```

2. Load the 12-table schema and initial sample dataset:
```bash
mysql -u root < database/schema.sql
mysql -u root < database/sample_data.sql
```

---

## 2. Build & Run the C++17 Crow Backend

```bash
export DB_HOST=127.0.0.1
export DB_PORT=3306
export DB_USER=textile_user
export DB_PASSWORD=<YOUR_DB_PASSWORD>
export DB_NAME=sustainable_textile_db
export BACKEND_PORT=8081
export AUTH_SECRET=<STRONG_RANDOM_SECRET>

cmake -S . -B backend/build
cmake --build backend/build -j$(nproc)
./backend/build/backend/textile_server
```

The C++ Crow REST API server listens on `http://127.0.0.1:8081`.

---

## 3. Run the React Frontend

```bash
npm install
npm run dev
```

Vite serves the frontend on `http://localhost:3000` and proxies `/api/*` requests directly to the C++ Crow server on port `8081`.

For production static build:
```bash
npm run build
```

---

## Seeded Role Accounts (Capstone Testing)

| Role | Email | Password |
| :--- | :--- | :--- |
| Administrator | `admin@ecoweave.io` | `Admin@2026` |
| Production Manager | `production@ecoweave.io` | `Prod@2026` |
| Inventory Manager | `inventory@ecoweave.io` | `Inv@2026` |

You can also register new operator accounts directly via the **Register Account** tab (`POST /api/auth/register`).
