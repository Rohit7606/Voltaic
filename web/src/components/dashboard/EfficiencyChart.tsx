"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

interface EfficiencyChartProps {
    data: { time: string; consumption: number }[];
}

export function EfficiencyChart({ data }: EfficiencyChartProps) {
    return (
        <Card className="col-span-1 bg-black/40 backdrop-blur-xl border-white/5">
            <CardHeader>
                <CardTitle className="text-sm font-medium text-neutral-300">Fleet Efficiency (24h)</CardTitle>
            </CardHeader>
            <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data}>
                        <defs>
                            <linearGradient id="colorConsumption" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#D2FF00" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#D2FF00" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                        <XAxis
                            dataKey="time"
                            stroke="#666"
                            fontSize={10}
                            tickLine={false}
                            axisLine={false}
                        />
                        <YAxis
                            stroke="#666"
                            fontSize={10}
                            tickLine={false}
                            axisLine={false}
                            unit=" kWh"
                        />
                        <Tooltip
                            contentStyle={{ backgroundColor: "#000", border: "1px solid #333", borderRadius: "8px" }}
                            itemStyle={{ color: "#D2FF00" }}
                            formatter={(value: number) => [`${value} kWh/100km`, "Average"]}
                        />
                        <Area
                            type="monotone"
                            dataKey="consumption"
                            stroke="#D2FF00"
                            strokeWidth={2}
                            fillOpacity={1}
                            fill="url(#colorConsumption)"
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
}
