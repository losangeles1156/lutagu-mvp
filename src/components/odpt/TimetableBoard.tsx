'use client';

import { useStationTimetable } from '@/hooks/useOdptData';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2 } from 'lucide-react';

interface TimetableBoardProps {
    stationId: string;
    operator: string;
}

export function TimetableBoard({ stationId, operator }: TimetableBoardProps) {
    const { timetables, isLoading } = useStationTimetable(operator, stationId);

    if (isLoading) {
        return <div className="flex justify-center p-4"><Loader2 className="animate-spin" /></div>;
    }

    if (!timetables || timetables.length === 0) {
        return <div className="text-center text-muted-foreground p-4">No timetable data available.</div>;
    }

    // Group by Rail Direction
    // e.g., "odpt.RailDirection:TokyoMetro.Asakusa" -> "Asakusa"
    const directions = Array.from(new Set(timetables.map(t => t['odpt:railDirection'])));

    return (
        <Card>
            <CardHeader className="pb-2">
                <CardTitle className="text-lg font-medium">Train Schedule</CardTitle>
            </CardHeader>
            <CardContent>
                <Tabs defaultValue={directions[0]}>
                    <TabsList className="mb-4 flex flex-wrap h-auto gap-2 bg-transparent justify-start">
                        {directions.map(dir => (
                            <TabsTrigger
                                key={dir}
                                value={dir}
                                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground border bg-background"
                            >
                                To {dir.split('.').pop()}
                            </TabsTrigger>
                        ))}
                    </TabsList>

                    {directions.map(dir => {
                        const tables = timetables.filter(t => t['odpt:railDirection'] === dir);
                        // Sort: Weekday first, then SaturdayHoliday
                        tables.sort((a, b) => (a['odpt:calendar'] || '').localeCompare(b['odpt:calendar'] || ''));

                        return (
                            <TabsContent key={dir} value={dir} className="space-y-4">
                                {tables.map(table => (
                                    <div key={table['@id']} className="border rounded-md p-3">
                                        <h4 className="font-semibold mb-2 text-sm text-primary">
                                            {table['odpt:calendar']?.split(':').pop()}
                                        </h4>
                                        <ScrollArea className="h-[200px]">
                                            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 text-center text-sm">
                                                {table['odpt:stationTimetableObject']?.map((entry: any, i: number) => (
                                                    <div key={i} className="bg-accent/50 rounded p-1">
                                                        {entry['odpt:departureTime']}
                                                    </div>
                                                ))}
                                            </div>
                                        </ScrollArea>
                                    </div>
                                ))}
                            </TabsContent>
                        );
                    })}
                </Tabs>
            </CardContent>
        </Card>
    );
}
