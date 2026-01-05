import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

// GET /api/admin/upload/image - Get upload URL
// POST /api/admin/upload/image - Upload image

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const filename = searchParams.get('filename');
        const folder = searchParams.get('folder') || 'places';

        if (!filename) {
            return NextResponse.json(
                { error: 'Filename is required' },
                { status: 400 }
            );
        }

        const supabase = getSupabaseAdmin();
        const filePath = `${folder}/${Date.now()}-${filename}`;

        const { data, error } = await supabase
            .storage
            .from('l1-places-images')
            .createSignedUploadUrl(filePath);

        if (error) {
            console.error('[API] Error creating signed URL:', error);
            return NextResponse.json(
                { error: 'Failed to create upload URL', message: error.message },
                { status: 500 }
            );
        }

        return NextResponse.json({
            upload_url: data.signedUrl,
            public_url: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/l1-places-images/${filePath}`,
            file_path: filePath,
        });
    } catch (error: any) {
        console.error('[API] Error creating upload URL:', error);
        return NextResponse.json(
            { error: 'Internal server error', message: error.message },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const file = formData.get('file') as File;
        const folder = formData.get('folder') as string || 'places';

        if (!file) {
            return NextResponse.json(
                { error: 'No file provided' },
                { status: 400 }
            );
        }

        // Validate file type
        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
        if (!allowedTypes.includes(file.type)) {
            return NextResponse.json(
                { error: 'Invalid file type. Allowed: JPEG, PNG, WebP, GIF' },
                { status: 400 }
            );
        }

        // Validate file size (max 5MB)
        const maxSize = 5 * 1024 * 1024;
        if (file.size > maxSize) {
            return NextResponse.json(
                { error: 'File too large. Maximum size is 5MB' },
                { status: 400 }
            );
        }

        const supabase = getSupabaseAdmin();
        const filePath = `${folder}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;

        const { data, error } = await supabase
            .storage
            .from('l1-places-images')
            .upload(filePath, file, {
                contentType: file.type,
                upsert: false,
            });

        if (error) {
            console.error('[API] Error uploading file:', error);
            return NextResponse.json(
                { error: 'Failed to upload file', message: error.message },
                { status: 500 }
            );
        }

        const publicUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/l1-places-images/${filePath}`;

        return NextResponse.json({
            url: publicUrl,
            file_path: filePath,
            file_name: file.name,
            file_size: file.size,
            content_type: file.type,
        });
    } catch (error: any) {
        console.error('[API] Error uploading file:', error);
        return NextResponse.json(
            { error: 'Internal server error', message: error.message },
            { status: 500 }
        );
    }
}
