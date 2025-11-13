# 🚀 Universal API-to-File Exporter

A powerful Node.js backend application that automates fetching data from APIs and exporting it to files (JSON/CSV) on a schedule. Perfect for data engineering, automation, and backend API design projects.

## 📋 Table of Contents

- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Installation](#-installation)
- [Usage](#-usage)
- [API Documentation](#-api-documentation)
- [Project Structure](#-project-structure)
- [Database Management](#-database-management)
- [Configuration](#-configuration)
- [Examples](#-examples)

## ✨ Features

### Core Functionality

- **🧾 Add API Config** - Register any API endpoint with custom headers and request methods (GET/POST)
- **⏰ Scheduling** - Automatic data fetching using cron jobs (hourly, daily, custom intervals)
- **💾 File Export** - Save API responses to JSON or CSV files locally
- **🔍 Data Comparison** - Automatically detect changes between API responses
- **📊 Dashboard API** - REST endpoints to view history, logs, and run status
- **📝 Logging** - Track all API calls, successes, failures, and data changes

### Additional Capabilities

- Support for authenticated APIs (custom headers)
- Flexible file storage paths
- Change detection with hash comparison
- Error handling and logging
- SQLite database for configuration and history

## 🛠 Tech Stack

| Purpose | Library |
|---------|---------|
| **Server** | Express |
| **Scheduler** | node-cron |
| **HTTP Requests** | axios |
| **File Writing** | fs, csv-writer |
| **Database** | better-sqlite3 (SQLite) |
| **Logging** | morgan |
| **Environment** | dotenv |

## 📦 Installation

### Prerequisites

- Node.js (v18 or higher recommended)
- npm or yarn

### Setup

1. **Clone or navigate to the project directory**
   ```bash
   cd api-exporter
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment (optional)**
   Create a `.env` file in the root directory:
   ```env
   PORT=3000
   DATA_DIR=./data
   DB_PATH=./data/database.sqlite
   LOG_LEVEL=info
   ```

4. **Start the server**
   ```bash
   npm start
   ```

   Or for development with auto-reload:
   ```bash
   npm run dev
   ```

The server will start on `http://localhost:3000` (or your configured PORT).

## 🚀 Usage

### Starting the Application

```bash
# Production mode
npm start

# Development mode (with auto-reload)
npm run dev
```

### Health Check

Once running, visit `http://localhost:3000` to verify the server is running:

```json
{
  "ok": true,
  "message": "API Exporter running"
}
```

## 📚 API Documentation

### Base URL

```
http://localhost:3000/api
```

### Endpoints

#### 1. Get All Endpoints

```http
GET /api/endpoints
```

**Response:**
```json
{
  "ok": true,
  "endpoints": [
    {
      "id": "uuid",
      "name": "My API",
      "url": "https://api.example.com/data",
      "method": "GET",
      "headers": {},
      "schedule": "*/5 * * * *",
      "saveFormat": "json",
      "savePath": "./data",
      "notifyOnChange": 0,
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

#### 2. Get Single Endpoint

```http
GET /api/endpoints/:id
```

**Response:**
```json
{
  "ok": true,
  "endpoint": { ... }
}
```

#### 3. Create Endpoint

```http
POST /api/endpoints
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "Weather API",
  "url": "https://api.weather.com/v1/current",
  "method": "GET",
  "headers": {
    "Authorization": "Bearer your-token"
  },
  "schedule": "0 */6 * * *",
  "saveFormat": "json",
  "savePath": "./data/weather",
  "notifyOnChange": true
}
```

**Required Fields:**
- `name` - Name for the endpoint
- `url` - API URL to fetch

**Optional Fields:**
- `method` - HTTP method (default: "GET")
- `headers` - Object with custom headers
- `schedule` - Cron expression (default: "*/5 * * * *" - every 5 minutes)
- `saveFormat` - "json" or "csv" (default: "json")
- `savePath` - Directory to save files (default: "./data")
- `notifyOnChange` - Boolean to notify on changes (default: false)

**Response:**
```json
{
  "ok": true,
  "endpoint": { ... }
}
```

#### 4. Delete Endpoint

```http
DELETE /api/endpoints/:id
```

**Response:**
```json
{
  "ok": true,
  "message": "Endpoint deleted"
}
```

#### 5. Get Logs for Endpoint

```http
GET /api/endpoints/:id/logs
```

**Response:**
```json
{
  "ok": true,
  "logs": [
    {
      "id": "uuid",
      "endpointId": "uuid",
      "status": "success",
      "filePath": "./data/weather-2024-01-01.json",
      "runTime": "2024-01-01T12:00:00.000Z",
      "diffDetected": 1,
      "errorMessage": null
    }
  ]
}
```

#### 6. Manually Trigger Endpoint

```http
POST /api/endpoints/:id/run
```

**Response:**
```json
{
  "ok": true,
  "log": { ... }
}
```

## 📁 Project Structure

```
api-exporter/
├── src/
│   ├── index.js           # Main application entry point
│   ├── config.js          # Configuration management
│   ├── db.js              # Database initialization
│   ├── models.js          # Database models and queries
│   ├── routes/
│   │   └── apiRoutes.js   # API route handlers
│   ├── services/
│   │   ├── fetcher.js     # API fetching service
│   │   └── fileWriter.js  # File writing service (JSON/CSV)
│   └── jobs/
│       ├── scheduler.js   # Cron job scheduler
│       └── runner.js      # Job execution logic
├── data/                  # Generated data directory
│   └── database.sqlite    # SQLite database file
├── view-db.js            # Database viewer script
├── query-db.js           # Interactive database query tool
├── package.json
└── README.md
```

## 🗄 Database Management

### View Database Contents

**Quick formatted view:**
```bash
npm run view-db
```

**Interactive query tool:**
```bash
npm run query-db
```

This opens an interactive menu where you can:
- View all endpoints
- View all logs
- Query logs by endpoint ID
- Run custom SQL queries

### Database Schema

**endpoints table:**
- `id` (TEXT, PRIMARY KEY) - Unique identifier
- `name` (TEXT) - Endpoint name
- `url` (TEXT) - API URL
- `method` (TEXT) - HTTP method
- `headers` (TEXT) - JSON string of headers
- `schedule` (TEXT) - Cron expression
- `saveFormat` (TEXT) - "json" or "csv"
- `savePath` (TEXT) - Save directory path
- `notifyOnChange` (INTEGER) - 0 or 1
- `createdAt` (TEXT) - ISO timestamp

**logs table:**
- `id` (TEXT, PRIMARY KEY) - Unique identifier
- `endpointId` (TEXT) - Foreign key to endpoints
- `status` (TEXT) - "success" or "error"
- `filePath` (TEXT) - Path to saved file
- `runTime` (TEXT) - ISO timestamp
- `diffDetected` (INTEGER) - 0 or 1
- `errorMessage` (TEXT) - Error details if failed

### Using GUI Tools

For a visual database browser, use **DB Browser for SQLite**:
1. Download from: https://sqlitebrowser.org/
2. Open `data/database.sqlite`
3. Browse tables, run queries, and edit data visually

## ⚙️ Configuration

### Environment Variables

Create a `.env` file in the project root:

```env
# Server port
PORT=3000

# Data directory path
DATA_DIR=./data

# Database file path
DB_PATH=./data/database.sqlite

# Logging level
LOG_LEVEL=info
```

### Cron Schedule Examples

The `schedule` field uses standard cron syntax:

```
* * * * *
│ │ │ │ │
│ │ │ │ └── Day of week (0-7, 0 or 7 = Sunday)
│ │ │ └──── Month (1-12)
│ │ └────── Day of month (1-31)
│ └──────── Hour (0-23)
└────────── Minute (0-59)
```

**Common examples:**
- `*/5 * * * *` - Every 5 minutes
- `0 * * * *` - Every hour
- `0 */6 * * *` - Every 6 hours
- `0 0 * * *` - Daily at midnight
- `0 9 * * 1` - Every Monday at 9 AM

## 📝 Examples

### Example 1: Fetch Public API Every Hour

```bash
curl -X POST http://localhost:3000/api/endpoints \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Public Posts API",
    "url": "https://jsonplaceholder.typicode.com/posts",
    "schedule": "0 * * * *",
    "saveFormat": "json"
  }'
```

### Example 2: Fetch Authenticated API with Headers

```bash
curl -X POST http://localhost:3000/api/endpoints \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Weather Data",
    "url": "https://api.weather.com/v1/current",
    "method": "GET",
    "headers": {
      "Authorization": "Bearer YOUR_API_KEY",
      "Content-Type": "application/json"
    },
    "schedule": "*/30 * * * *",
    "saveFormat": "json",
    "savePath": "./data/weather"
  }'
```

### Example 3: Export to CSV

```bash
curl -X POST http://localhost:3000/api/endpoints \
  -H "Content-Type: application/json" \
  -d '{
    "name": "User Data Export",
    "url": "https://api.example.com/users",
    "schedule": "0 0 * * *",
    "saveFormat": "csv",
    "savePath": "./data/exports"
  }'
```

### Example 4: PowerShell Example

```powershell
$body = @{
    name = "Test API"
    url = "https://jsonplaceholder.typicode.com/posts/1"
    schedule = "*/5 * * * *"
    saveFormat = "json"
} | ConvertTo-Json

Invoke-WebRequest -Uri http://localhost:3000/api/endpoints `
  -Method POST `
  -ContentType "application/json" `
  -Body $body
```

### Example 5: Manual Trigger

```bash
# Get endpoint ID first
curl http://localhost:3000/api/endpoints

# Then trigger it manually
curl -X POST http://localhost:3000/api/endpoints/{endpoint-id}/run
```

## 🔍 How It Works

1. **Registration**: You register an API endpoint with a schedule
2. **Scheduling**: The cron scheduler automatically runs jobs based on the schedule
3. **Fetching**: The fetcher service makes HTTP requests to your API
4. **Export**: Responses are saved as JSON or CSV files with timestamps
5. **Comparison**: Each new response is compared with the previous one to detect changes
6. **Logging**: All runs are logged in the database with status and file paths

## 🐛 Troubleshooting

### Port Already in Use

If port 3000 is already in use, change it in `.env`:
```env
PORT=3001
```

### Database Locked

If you see database locked errors:
- Make sure only one instance of the app is running
- Close any database browser tools
- Restart the application

### API Fetch Failures

Check the logs:
```bash
npm run view-db
```

Or query via API:
```bash
curl http://localhost:3000/api/endpoints/{id}/logs
```

## 📄 License

This project is open source and available for personal and commercial use.

## 🤝 Contributing

Contributions are welcome! Feel free to submit issues or pull requests.

## 📧 Support

For questions or issues, please open an issue on the project repository.

---

**Happy Automating! 🚀**

