'use client';

import { useRailwayFare } from '@/hooks/useOdptData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { useState } from 'react';
import { Loader2, Search } from 'lucide-react';

interface FareTableProps {
    stationId: string;
    operator: string;
}

export function FareTable({ stationId, operator }: FareTableProps) {
    const { fares, isLoading } = useRailwayFare(operator, stationId);
    const [filter, setFilter] = useState('');

    if (isLoading) {
        return <div className="flex justify-center p-4"><Loader2 className="animate-spin" /></div>;
    }

    if (!fares || fares.length === 0) {
        return <div className="text-center text-muted-foreground p-4">No fare data available.</div>;
    }

    const filteredFares = fares.filter(f => {
        const toStation = f['odpt:toStation'] || '';
        return toStation.toLowerCase().includes(filter.toLowerCase());
    }).slice(0, 50); // Limit display for performance

    return (
        <Card>
            <CardHeader className="pb-2">
                <CardTitle className="text-lg font-medium">Fares</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="relative mb-4">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search destination..."
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                        className="pl-8"
                    />
                </div>

                <div className="border rounded-md max-h-[300px] overflow-y-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Destination</TableHead>
                                <TableHead>IC Card</TableHead>
                                <TableHead>Ticket</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredFares.map((fare) => (
                                <TableRow key={fare['@id']}>
                                    <TableCell className="font-medium">
                                        {fare['odpt:toStation']?.split('.').pop()}
                                    </TableCell>
                                    <TableCell>¥{fare['odpt:icCardFare']}</TableCell>
                                    <TableCell>¥{fare['odpt:ticketFare']}</TableCell>
                                </TableRow>
                            ))}
                            {filteredFares.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={3} className="text-center h-24 text-muted-foreground">
                                        No stations found.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
                <div className="text-xs text-muted-foreground mt-2 text-right">
                    Showing top {filteredFares.length} matches
                </div>
            </CardContent>
        </Card>
    );
}
