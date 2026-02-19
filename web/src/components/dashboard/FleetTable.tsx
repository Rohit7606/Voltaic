"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { FleetVehicle } from "@/lib/simulation";
import { Battery, BatteryCharging, Car, Hammer } from "lucide-react";

interface FleetTableProps {
    fleet: FleetVehicle[];
}

export function FleetTable({ fleet }: FleetTableProps) {
    const getStatusIcon = (status: string) => {
        switch (status) {
            case "driving": return <Car className="w-4 h-4 text-primary" />;
            case "charging": return <BatteryCharging className="w-4 h-4 text-green-400" />;
            case "service": return <Hammer className="w-4 h-4 text-red-400" />;
            default: return <Car className="w-4 h-4 text-neutral-500" />;
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case "driving": return "bg-primary/10 text-primary border-primary/20";
            case "charging": return "bg-green-500/10 text-green-500 border-green-500/20";
            case "service": return "bg-red-500/10 text-red-500 border-red-500/20";
            default: return "bg-neutral-500/10 text-neutral-400 border-neutral-500/20";
        }
    };

    return (
        <Card className="col-span-1 bg-black/40 backdrop-blur-xl border-white/5 h-full">
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-medium text-neutral-300">Active Real-Time Fleet</CardTitle>
                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 animate-pulse">
                    Live
                </Badge>
            </CardHeader>
            <CardContent className="p-0 overflow-hidden">
                <Table>
                    <TableHeader className="bg-white/5">
                        <TableRow className="border-white/5 hover:bg-transparent">
                            <TableHead className="text-xs text-neutral-400 font-mono uppercase">Vehicle</TableHead>
                            <TableHead className="text-xs text-neutral-400 font-mono uppercase">Status</TableHead>
                            <TableHead className="text-xs text-neutral-400 font-mono uppercase text-right">Battery</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {fleet.map((vehicle) => (
                            <TableRow key={vehicle.id} className="border-white/5 hover:bg-white/5 transition-colors">
                                <TableCell className="font-medium text-sm text-white">
                                    <div className="flex flex-col">
                                        <span>{vehicle.modelName}</span>
                                        <span className="text-[10px] text-neutral-500 font-mono">{vehicle.id}</span>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full border text-[10px] font-medium uppercase tracking-wider ${getStatusColor(vehicle.status)}`}>
                                        {getStatusIcon(vehicle.status)}
                                        {vehicle.status}
                                    </div>
                                </TableCell>
                                <TableCell className="text-right">
                                    <div className="flex items-center justify-end gap-2">
                                        <div className="w-16 h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full ${vehicle.soc < 20 ? "bg-red-500" : vehicle.status === "charging" ? "bg-green-400" : "bg-primary"}`}
                                                style={{ width: `${vehicle.soc}%` }}
                                            />
                                        </div>
                                        <span className="text-xs font-mono text-neutral-300">{vehicle.soc}%</span>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
