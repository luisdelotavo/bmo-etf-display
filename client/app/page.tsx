"use client";

import { useState } from "react";
import axios from "axios";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Brush,
  BarChart,
  Bar,
} from "recharts";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const API_BASE = "http://localhost:8000";

interface HoldingData {
  ticker: string;
  weight: number;
  price: number;
  value: number;
}

interface HistoryData {
  date: string;
  price: number;
}

interface AnalysisData {
  latest_date: string;
  history: HistoryData[];
  holdings: HoldingData[];
  top5: HoldingData[];
}

export default function Page() {

  // Creates state variables to for data (the entire api response)
  // The data is of type AnalysisData, history is type HistoryData and analysis is type AnalysisData
  // Loading is used so we do not render charts while loading
  // On upload, will update datat states and render the charts
  const [data, setData] = useState<AnalysisData | null>(null);
  const [loading, setLoading] = useState(false);
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState("");

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setError("");
    setData(null);
    setLoading(true);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await axios.post(`${API_BASE}/analyze`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setData(response.data);
    } catch (err: any) {
      console.error("Upload error:", err);
      const errorMsg = err?.response?.data?.detail || "Upload failed. Check server logs and CSV format.";
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-6xl p-8 space-y-6">
        {/* Header */}
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Bank of Montreal: Exchange-Traded Fund Display</h1>
          <p className="text-slate-600">
            Upload an ETF weights CSV to reconstruct its historical price and view top holdings.
          </p>
        </div>

        <Separator />

        {/* Upload Section */}
        <Card className="max-w-2xl">
          <CardHeader>
            <CardTitle>Upload ETF Weights</CardTitle>
            <CardDescription>
              Expected format: CSV with columns <code className="text-xs bg-slate-100 px-1 py-0.5 rounded">name</code> and <code className="text-xs bg-slate-100 px-1 py-0.5 rounded">weight</code>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="cursor-pointer"
            />

            <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
              {fileName ? (
                <>
                  <span>Selected:</span>
                  <Badge variant="secondary">{fileName}</Badge>
                </>
              ) : (
                <span>No file selected</span>
              )}

              {data?.latest_date && (
                <>
                  <span className="mx-1">•</span>
                  <span>Latest close:</span>
                  <Badge variant="outline">{data.latest_date}</Badge>
                </>
              )}
            </div>

            {error && (
              <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">
                {error}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Loading State */}
        {loading && (
          <div className="space-y-4">
            <Skeleton className="h-[420px] w-full rounded-xl" />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Skeleton className="h-[350px] w-full rounded-xl" />
              <Skeleton className="h-[350px] w-full rounded-xl" />
            </div>
          </div>
        )}

        {/* Dashboard Content */}
        {data && !loading && (
          <div className="space-y-6">
            {/* Historical Price Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Reconstructed ETF Price</CardTitle>
                <CardDescription>
                  Historical performance based on weighted sum of constituents. Use the brush to zoom.
                </CardDescription>
              </CardHeader>
              <CardContent className="h-[420px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.history}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 12 }}
                      minTickGap={30}
                    />
                    <YAxis
                      domain={["auto", "auto"]}
                      tick={{ fontSize: 12 }}
                      tickFormatter={(value) => `$${value.toFixed(0)}`}
                    />
                    <Tooltip
                      contentStyle={{
                        borderRadius: "8px",
                        border: "none",
                        boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                      }}
                      formatter={(value: any) => [`$${Number(value).toFixed(2)}`, "Price"]}
                    />
                    <Line
                      type="monotone"
                      dataKey="price"
                      stroke="#0f172a"
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 6 }}
                    />
                    <Brush dataKey="date" height={28} stroke="#94a3b8" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

              {/* Top 5 Holdings Bar Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Top 5 Holdings</CardTitle>
                  <CardDescription>
                    By market value (weight × latest close price)
                  </CardDescription>
                </CardHeader>
                <CardContent className="h-[350px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.top5} layout="vertical" margin={{ left: 30 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal vertical={false} />
                      <XAxis type="number" hide />
                      <YAxis
                        type="category"
                        dataKey="ticker"
                        width={40}
                        tick={{ fontSize: 12 }}
                      />
                      <Tooltip
                        contentStyle={{
                          borderRadius: "8px",
                          border: "none",
                          boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                        }}
                        formatter={(value: any) => [`$${Number(value).toFixed(2)}`, "Value"]}
                      />
                      <Bar dataKey="value" fill="#0f172a" radius={[0, 6, 6, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Constituent Table */}
              <Card>
                <CardHeader>
                  <CardTitle>Constituent Breakdown</CardTitle>
                  <CardDescription>
                    Interactive table showing all constituents and their latest prices
                  </CardDescription>
                </CardHeader>
                <CardContent className="h-[350px] overflow-auto">
                  <Table>
                    <TableHeader className="sticky top-0 bg-white">
                      <TableRow>
                        <TableHead>Ticker</TableHead>
                        <TableHead>Weight</TableHead>
                        <TableHead>Latest Close Price</TableHead>
                        <TableHead className="text-right">Value</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.holdings.map((row) => (
                        <TableRow key={row.ticker}>
                          <TableCell className="font-medium">{row.ticker}</TableCell>
                          <TableCell>{row.weight.toFixed(4)}</TableCell>
                          <TableCell>${row.price.toFixed(2)}</TableCell>
                          <TableCell className="text-right">${row.value.toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>

  );
}
