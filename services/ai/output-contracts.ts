import { z } from 'zod'

export const simpleListOutputSchema = z.object({
  items: z.array(z.string()),
})

export const keyValueListOutputSchema = z.object({
  items: z.array(z.object({
    label: z.string(),
    description: z.string(),
  })),
})

export type SimpleListOutput = z.infer<typeof simpleListOutputSchema>
export type KeyValueListOutput = z.infer<typeof keyValueListOutputSchema>

