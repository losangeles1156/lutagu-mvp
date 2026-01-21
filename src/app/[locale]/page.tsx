
import { HomeClient } from '@/components/home/HomeClient';
import { AppHeader } from '@/components/home/AppHeader';
import { MapSection } from '@/components/home/MapSection';
import { ChatSection } from '@/components/home/ChatSection';



/**
 * LUTAGU Home Page (Server Component)
 * 
 * Implements Hybrid Model:
 * 1. AppHeader - Server Rendered (Instant FCP)
 * 2. HomeClient - Client State Wrapper
 * 3. Map/Chat - Dynamic Client Islands
 */
export default function Home() {
    return (
        <HomeClient
            header={<AppHeader />}
            mapPanel={<MapSection />}
            chatPanel={<ChatSection />}
        />
    );
}
