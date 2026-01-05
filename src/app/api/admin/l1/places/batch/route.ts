import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import type { CreatePlaceRequest } from '@/lib/types/l1-admin';

// POST /api/admin/l1/places/batch/import - Import places from CSV/JSON
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { places }: { places: CreatePlaceRequest[] } = body;

        if (!places || !Array.isArray(places) || places.length === 0) {
            return NextResponse.json(
                { error: 'No places provided for import' },
                { status: 400 }
            );
        }

        const supabase = getSupabaseAdmin();
        const results = {
            success: 0,
            failed: 0,
            errors: [] as string[],
        };

        // Process each place
        for (let i = 0; i < places.length; i++) {
            const place = places[i];

            try {
                // Validate required fields
                if (!place.station_id || !place.name_i18n || !place.category) {
                    throw new Error(`Missing required fields at index ${i}`);
                }

                // Prepare data for insertion
                const insertData: any = {
                    station_id: place.station_id,
                    name_i18n: place.name_i18n,
                    description_i18n: place.description_i18n || {},
                    category: place.category,
                    subcategory: place.subcategory,
                    address: place.address,
                    is_partner: place.is_partner ?? false,
                    partner_id: place.partner_id,
                    affiliate_url: place.affiliate_url,
                    discount_info: place.discount_info,
                    business_hours: place.business_hours,
                    image_urls: place.image_urls || [],
                    logo_url: place.logo_url,
                    priority: place.priority ?? 100,
                    expires_at: place.expires_at,
                    status: place.status || 'draft',
                };

                // Convert location to PostGIS format if provided
                if (place.location) {
                    insertData.location = `SRID=4326;POINT(${place.location.lng} ${place.location.lat})`;
                }

                const { error } = await supabase
                    .from('l1_custom_places')
                    .insert(insertData);

                if (error) {
                    throw new Error(error.message);
                }

                results.success++;
            } catch (err: any) {
                results.failed++;
                results.errors.push(`Index ${i}: ${err.message}`);
            }
        }

        return NextResponse.json({
            message: `Import completed`,
            results,
        });
    } catch (error: any) {
        console.error('[API] Error importing places:', error);
        return NextResponse.json(
            { error: 'Internal server error', message: error.message },
            { status: 500 }
        );
    }
}

// GET /api/admin/l1/places/batch/export - Export places to CSV/JSON
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const format = searchParams.get('format') || 'json';
        const status = searchParams.get('status') || undefined;
        const isActive = searchParams.get('is_active');

        const supabase = getSupabaseAdmin();

        // Build query
        let query = supabase
            .from('l1_custom_places')
            .select('*');

        if (status) {
            query = query.eq('status', status);
        }

        if (isActive !== null && isActive !== undefined) {
            query = query.eq('is_active', isActive === 'true');
        }

        query = query.order('created_at', { ascending: false });

        const { data: places, error } = await query;

        if (error) {
            return NextResponse.json(
                { error: 'Failed to fetch places', message: error.message },
                { status: 500 }
            );
        }

        // Transform data for export
        const exportData = (places || []).map((place: any) => ({
            station_id: place.station_id,
            name_ja: place.name_i18n?.ja || '',
            name_en: place.name_i18n?.en || '',
            name_zh_TW: place.name_i18n?.['zh-TW'] || '',
            description_ja: place.description_i18n?.ja || '',
            description_en: place.description_i18n?.en || '',
            description_zh_TW: place.description_i18n?.['zh-TW'] || '',
            category: place.category,
            subcategory: place.subcategory || '',
            address: place.address || '',
            latitude: place.location?.y || '',
            longitude: place.location?.x || '',
            is_partner: place.is_partner,
            partner_id: place.partner_id || '',
            affiliate_url: place.affiliate_url || '',
            image_urls: (place.image_urls || []).join(';'),
            priority: place.priority,
            status: place.status,
            is_active: place.is_active,
            expires_at: place.expires_at || '',
            created_at: place.created_at,
        }));

        if (format === 'csv') {
            // Convert to CSV
            const headers = Object.keys(exportData[0] || {});
            const csvRows = [
                headers.join(','),
                ...exportData.map((row: any) =>
                    headers.map((header) => {
                        const value = row[header];
                        // Escape quotes and wrap in quotes if contains comma
                        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
                            return `"${value.replace(/"/g, '""')}"`;
                        }
                        return value || '';
                    }).join(',')
                ),
            ];

            return new NextResponse(csvRows.join('\n'), {
                headers: {
                    'Content-Type': 'text/csv',
                    'Content-Disposition': `attachment; filename="places_export_${new Date().toISOString().split('T')[0]}.csv"`,
                },
            });
        }

        // Default to JSON
        return NextResponse.json({
            export_date: new Date().toISOString(),
            total_count: exportData.length,
            places: exportData,
        });
    } catch (error: any) {
        console.error('[API] Error exporting places:', error);
        return NextResponse.json(
            { error: 'Internal server error', message: error.message },
            { status: 500 }
        );
    }
}
