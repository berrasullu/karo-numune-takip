import { COOKIE_NAME } from "../shared/const.js";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import * as db from "./db";
import { z } from "zod";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // Sample management - shared across all employees (no auth required)
  samples: router({
    list: publicProcedure.query(() => db.getAllSamples()),

    getById: publicProcedure
      .input(z.object({ id: z.string() }))
      .query(({ input }) => db.getSampleById(input.id)),

    create: publicProcedure
      .input(
        z.object({
          id: z.string(),
          userId: z.number(),
          code: z.string(),
          name: z.string(),
          species: z.enum(["TOPAZ", "PLACCO"]),
          category: z.string(),
          size: z.string(),
          finish: z.string(),
          location: z.string(),
          quantity: z.number().default(0),
          minimumQuantity: z.number().default(5),
          notes: z.string().optional(),
          photoUri: z.string().optional(),
        })
      )
      .mutation(({ input }) => {
        return db.createSample({
          ...input,
          userId: 0, // Anonymous user
        });
      }),

    update: publicProcedure
      .input(
        z.object({
          id: z.string(),
          code: z.string().optional(),
          name: z.string().optional(),
          quantity: z.number().optional(),
          location: z.string().optional(),
          notes: z.string().optional(),
          photoUri: z.string().optional(),
        })
      )
      .mutation(({ input }) => {
        const { id, ...updates } = input;
        return db.updateSample(id, updates);
      }),

    delete: publicProcedure
      .input(z.object({ id: z.string() }))
      .mutation(({ input }) => db.deleteSample(input.id)),
  }),

  // Movement tracking - shared across all employees (no auth required)
  movements: router({
    list: publicProcedure.query(() => db.getAllMovements()),

    getBySampleId: publicProcedure
      .input(z.object({ sampleId: z.string() }))
      .query(({ input }) => db.getMovementsBySampleId(input.sampleId)),

    create: publicProcedure
      .input(
        z.object({
          id: z.string(),
          userId: z.number(),
          sampleId: z.string(),
          sampleName: z.string(),
          type: z.enum(["in", "out", "count", "gönderim"]),
          quantityDelta: z.number(),
          resultingQuantity: z.number(),
          note: z.string().optional(),
        })
      )
      .mutation(({ input }) => {
        return db.createMovement({
          ...input,
          userId: 0, // Anonymous user
        });
      }),
  }),

  // Shipments - shared across all employees (no auth required)
  shipments: router({
    list: publicProcedure.query(() => db.getAllShipments()),

    create: publicProcedure
      .input(
        z.object({
          id: z.string(),
          userId: z.number(),
          sampleIds: z.string(),
          employeeName: z.string(),
          customerName: z.string(),
          quantity: z.number(),
          note: z.string().optional(),
        })
      )
      .mutation(({ input }) => {
        return db.createShipment({
          ...input,
          userId: 0, // Anonymous user
        });
      }),
  }),
});

export type AppRouter = typeof appRouter;
