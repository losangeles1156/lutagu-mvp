import { z } from 'zod';

export const MemberPiiSchema = z.object({
    email: z.string().email().optional(),
    phone: z.string().min(3).max(50).optional(),
    fullName: z.string().min(1).max(200).optional(),
    passportLast4: z.string().min(4).max(4).optional()
}).strict();

export const CreateMemberSchema = z.object({
    userId: z.string().uuid(),
    displayName: z.string().min(1).max(120).optional(),
    role: z.enum(['member', 'support', 'admin']).optional(),
    pii: MemberPiiSchema.optional()
}).strict();

export const UpdateMemberSchema = z.object({
    displayName: z.string().min(1).max(120).optional(),
    role: z.enum(['member', 'support', 'admin']).optional(),
    pii: MemberPiiSchema.optional()
}).strict();
