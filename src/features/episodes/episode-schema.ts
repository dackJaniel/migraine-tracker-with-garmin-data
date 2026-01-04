import { z } from 'zod';

/**
 * Zod Schema für Episode Form Validierung
 */
export const episodeSchema = z.object({
  startTime: z.date({
    message: 'Startzeit ist erforderlich',
  }),
  endTime: z.date().optional().nullable(),
  intensity: z
    .number()
    .min(1, 'Intensität muss mindestens 1 sein')
    .max(10, 'Intensität darf maximal 10 sein'),
  triggers: z.array(z.string()),
  medicines: z.array(z.string()),
  symptoms: z.object({
    nausea: z.boolean(),
    photophobia: z.boolean(),
    phonophobia: z.boolean(),
    aura: z.boolean(),
  }),
  notes: z.string().optional(),
  isOngoing: z.boolean(),
});

export type EpisodeFormData = z.infer<typeof episodeSchema>;
