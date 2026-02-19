"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, ComposedChart, Line } from "recharts";

interface ElevationChartProps {
    data: { dist: number; elev: number; soc: number }[];
}

export function ElevationChart({ data }: ElevationChartProps) {
    // Calculate stats
    const maxElev = Math.max(...data.map(d => d.elev));
    const minElev = Math.min(...data.map(d => d.elev));
    const ascent = data[data.length - 1].elev - data[0].elev;

    return (
        <Card className="bg-neutral-900/50 border-white/10 backdrop-blur-sm overflow-hidden">
            <CardHeader className="pb-2 px-6 pt-6">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-xs font-mono uppercase text-neutral-400">Terrain Profile & Battery Drain</CardTitle>
                    <div className="flex gap-4">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-neutral-500"></div>
                            <span className="text-[10px] text-neutral-400 whitespace-nowrap">Elevation</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-primary"></div>
                            <span className="text-[10px] text-neutral-400 whitespace-nowrap">SoC %</span>
                        </div>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="h-[280px] pl-6 pr-0 pb-0">
                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={data}>
                        <defs>
                            <linearGradient id="colorElev" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#404040" stopOpacity={0.8} />
                                <stop offset="95%" stopColor="#404040" stopOpacity={0.1} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
                        <XAxis
                            dataKey="dist"
                            stroke="#555"
                            fontSize={10}
                            tickLine={false}
                            axisLine={false}
                            unit="km"
                            tickFormatter={(value) => `${value}`}
                        />
                        {/* Right Axis: Elevation (Meters) */}
                        <YAxis
                            yAxisId="right"
                            orientation="right"
                            stroke="#555"
                            fontSize={10}
                            tickLine={false}
                            axisLine={false}
                            unit="m"
                            domain={[minElev - 50, maxElev + 50]}
                        />
                        {/* Left Axis: SoC (%) */}
                        <YAxis
                            yAxisId="left"
                            orientation="left"
                            stroke="#D2FF00"
                            fontSize={10}
                            tickLine={false}
                            axisLine={false}
                            unit="%"
                            domain={[0, 100]}
                            hide // Hide text to keep it clean, visual only
                        />
                        <Tooltip
                            contentStyle={{ backgroundColor: "#000", border: "1px solid #333", borderRadius: "8px" }}
                            itemStyle={{ fontSize: "12px" }}
                            labelStyle={{ color: "#888", marginBottom: "4px" }}
                        />
                        {/* Area: Elevation */}
                        <Area
                            yAxisId="right"
                            type="monotone"
                            dataKey="elev"
                            stroke="#666"
                            fill="url(#colorElev)"
                            name="Elevation"
                            animationDuration={1500}
                        />
                        {/* Line: SoC */}
                        <Line
                            yAxisId="left"
                            type="monotone"
                            dataKey="soc"
                            stroke="#D2FF00"
                            strokeWidth={2}
                            dot={false}
                            name="Battery %"
                            animationDuration={2000}
                        />
                    </ComposedChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
}
