/**
 * FleetTools Base Event Schema
 *
 * Base event schema with common fields for all FleetTools events.
 */
import { z } from 'zod';
/**
 * Base event schema with common fields
 */
export declare const BaseEventSchema: z.ZodObject<{
    id: z.ZodString;
    type: z.ZodString;
    project_key: z.ZodString;
    timestamp: z.ZodString;
    sequence: z.ZodNumber;
    data: z.ZodUnknown;
}, "strip", z.ZodTypeAny, {
    type: string;
    id: string;
    project_key: string;
    timestamp: string;
    sequence: number;
    data?: unknown;
}, {
    type: string;
    id: string;
    project_key: string;
    timestamp: string;
    sequence: number;
    data?: unknown;
}>;
export type BaseEvent = z.infer<typeof BaseEventSchema>;
//# sourceMappingURL=base.d.ts.map