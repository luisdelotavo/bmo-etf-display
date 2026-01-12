from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
import io
from pathlib import Path

app = FastAPI(title="BMO ETF Analyzer API")

# Allow CORS, requests from different servers
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Stable path to data folder
DATA_DIR = Path(__file__).parent / "data"
PRICES_PATH = DATA_DIR / "prices.csv"

# Load prices.csv once at startup
try:
    prices_df = pd.read_csv(PRICES_PATH)
    if "DATE" not in prices_df.columns:
        raise ValueError("prices.csv is the wrong format")

    prices_df["DATE"] = pd.to_datetime(prices_df["DATE"])
    prices_df = prices_df.set_index("DATE").sort_index()

    print(f"Loaded prices.csv: {prices_df.shape[0]} rows, {prices_df.shape[1]} columns")
except Exception as e:
    raise RuntimeError(f"Failed to load {PRICES_PATH}: {e}")

@app.post("/analyze")
async def analyze_etf(file: UploadFile = File(...)):
    """
    Analyze uploaded ETF weights file and return:
    - latest_date: the most recent date within prices.csv
    - history: time series of only relevant constituents (summation of [weight * price])
    - holdings: detailed table data (weight * price)
    - top5: top 5 holdings by value
    """
    contents = await file.read()

    # Read the inputted weights csv file, clean the data and create a dataframe
    # Cleaning consists of stripping, lowering all feature names, adding duplicate features together, normalizing weights to 1.0
    # Then setting name as the index, to uniquely identify the constituent
    try:
        weights_df = pd.read_csv(io.StringIO(contents.decode("utf-8")))
        weights_df.columns = weights_df.columns.str.lower().str.strip()

        if "name" not in weights_df.columns or "weight" not in weights_df.columns:
            raise HTTPException(
                status_code=400,
                detail="ETF CSV must have columns: 'name' and 'weight'"
            )

        weights_df["name"] = weights_df["name"].astype(str).str.strip()
        weights_df["weight"] = pd.to_numeric(weights_df["weight"], errors="raise")
        weights_df = weights_df.groupby("name", as_index=False)["weight"].sum()

        total_weight = weights_df["weight"].sum()
        if total_weight <= 0:
            raise HTTPException(status_code=400, detail="Weights sum to zero or negative")

        weights_df["weight"] = weights_df["weight"] / total_weight
        weights_df = weights_df.set_index("name")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid CSV format: {str(e)}")

    # Matches the tickers with the weights_df (inputted etf weights) with the prices.csv dataframe
    relevant_tickers = weights_df.index.intersection(prices_df.columns)
    if len(relevant_tickers) == 0:
        raise HTTPException(
            status_code=400,
            detail="No matching tickers found between ETF file and prices.csv"
        )

    # Filter to only relevant tickers, the weights and the prices of each constituent
    # Create a Time Series by doing the dot product of weights by the prices of each constituent for each date (multiples and adds)
    subset_prices = prices_df[relevant_tickers]
    subset_weights = weights_df.loc[relevant_tickers]["weight"]
    etf_history = subset_prices.dot(subset_weights)

    # Get the latest date snapshot (the most recent data and prices)
    latest_date = subset_prices.index[-1]
    latest_prices = subset_prices.iloc[-1]

    # Create a holdings table which will be returned and displayed
    # Holdings is an array which will contain the ticket, it's weight, it's price, and it's value for each relevant constituent
    # Sort holdings_sorted to be from highest weighted sum to lowest
    holdings = []
    for ticker in relevant_tickers:
        price = float(latest_prices[ticker])
        weight = float(subset_weights[ticker])
        value = price * weight

        holdings.append({
            "ticker": ticker,
            "weight": round(weight, 4),
            "price": round(price, 2),
            "value": round(value, 2)
        })
    holdings_sorted = sorted(holdings, key=lambda x: x["value"], reverse=True)

    return {
        "latest_date": latest_date.strftime("%Y-%m-%d"),
        "history": [
            {"date": date.strftime("%Y-%m-%d"), "price": round(float(price), 2)}
            for date, price in etf_history.items()
        ],
        "holdings": holdings_sorted,
        "top5": holdings_sorted[:5]
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)