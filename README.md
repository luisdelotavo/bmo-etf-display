# BMO ETF Display Take Home Assignment

A single-page web application that allows users to upload an ETF composition file and visualize:

- The reconstructed historical price of the ETF
- The top 5 holdings by market value
- A detailed breakdown of all ETF constituents

This project was built for **BMO Capital Markets**, specifically the **Data Cognition Team**.

---
## High-Level Design

The application follows a simple client-server architecture. The backend is under the directory /server and the frontend is under the directory of /client

- **Backend (FastAPI + pandas)**  
  Responsible for data processing and financial calculations.

- **Frontend (Next.js + React)**  
  Responsible for file upload, API communication, and data visualization.

---
## Data Model

### prices.csv
- Contains historical close prices for all available securities.
- Rows represent trading dates.
- Columns represent individual tickers (A–Z).

### ETF CSV (ETF1.csv / ETF2.csv)
- Uploaded by the user.
- Defines the ETF composition:
  - `name`: ticker symbol
  - `weight`: allocation weight

---

## Backend (FastAPI + pandas)

### Overview
- Loads `prices.csv` once at server startup.
- Exposes a single API endpoint: **POST `/analyze`** which returns all the necessary data
- Uses pandas for all data processing and financial calculations.

### API: `/analyze`

**Input**
- CSV file containing ETF constituent weights.

**Processing Steps**
1. Parse the uploaded CSV into a pandas DataFrame.
2. Normalize column names and validate required fields.
3. Convert data types (string tickers, numeric weights).
4. Handle duplicate tickers by summing weights.
5. Normalize weights to ensure they sum to 1.0 (no rounding errors)
6. Align ETF tickers with available price data.
7. Compute:
   - Historical ETF price (weighted sum across dates)
   - Latest constituent prices
   - Holding values (price × weight)
8. Sort holdings to determine top 5 by value.

**Output (JSON)**
```json
{
  "latest_date": "YYYY-MM-DD",
  "history": [{ "date": "...", "price": ... }, ...],
  "holdings": [{ "ticker", "weight", "price", "value" }, ...],
  "top5": [{ "ticker", "weight", "price", "value" }, ...]
}
```
### Backend Responsibilities

- Load and manage static price data
- Perform financial math and validation
- Return clean, structured JSON for the frontend

---

## Frontend (Next.js + React)

### Overview
- Single-page application built with Next.js.
- Communicates with backend via Axios.
- Focused on visualization and user interaction.

### User Flow
1. User uploads an ETF CSV file.
2. Frontend sends file to `/analyze` API.
3. Receives processed JSON response.
4. Renders charts and tables dynamically.

### UI & Visualization

- shadcn/ui (components library)
- Recharts (chart-based library)

---

## Assumptions
- `prices.csv` is static and loaded at server startup.
- ETF weights do not change over time.
- Weights are normalized to sum to 1.0.
- Prices represent close prices.
- No authentication or persistence is required.
---

## Project Structure

```text
bmo-etf-display/
├── README.md
├── server/
│   ├── main.py
│   ├── requirements.txt
│   └── data/
│       └── prices.csv
        └── etf-1.csv
        └── etf-2.csv
└── client/
    └── (Next.js application)
```
---
## How to Run
1) Clone the Repository
2) Start the backend
`` cd server ``
`` python -m venv venv ``
`` source venv/bin/activate ``
`` pip install -r requirements.txt ``
`` uvicorn main:app --reload ``
3) Start the frontend
`` cd client ``
`` npm install ``
`` npm run dev ``
4) Open on http://localhost:3000