import { supabaseAdmin } from '@/lib/supabase';
import { getRequestSecurityContext } from '@/lib/security/requestContext';

export type AuditEvent = {
    actorUserId: string | null;
    action: 'create' | 'read' | 'update' | 'delete';
    resourceType: string;
    resourceId: string;
    before: any;
    after: any;
};

export async function writeAuditLog(request: any, event: AuditEvent) {
    try {
        const ctx = await getRequestSecurityContext(request);
        await supabaseAdmin.from('audit_logs').insert({
            actor_user_id: event.actorUserId,
            actor_visitor_id: ctx.visitorId,
            actor_ip_hash: ctx.ipHash,
            actor_user_agent_hash: ctx.userAgentHash,
            action: event.action,
            resource_type: event.resourceType,
            resource_id: event.resourceId,
            before: event.before ?? null,
            after: event.after ?? null,
            created_at: new Date().toISOString()
        });
    } catch {
        return;
    }
}

export async function writeSecurityEvent(request: any, params: {
    type: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    actorUserId: string | null;
    metadata?: Record<string, unknown>;
}) {
    try {
        const ctx = await getRequestSecurityContext(request);
        const payload = {
            type: params.type,
            severity: params.severity,
            actor_user_id: params.actorUserId,
            actor_visitor_id: ctx.visitorId,
            actor_ip_hash: ctx.ipHash,
            actor_user_agent_hash: ctx.userAgentHash,
            metadata: params.metadata || {},
            created_at: new Date().toISOString()
        };

        await supabaseAdmin.from('security_events').insert(payload);

        const webhook = process.env.SECURITY_ALERT_WEBHOOK_URL;
        if (webhook && (params.severity === 'high' || params.severity === 'critical')) {
            await fetch(webhook, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
        }
    } catch {
        return;
    }
}
