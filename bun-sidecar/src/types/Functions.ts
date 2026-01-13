import { z, ZodTypeAny } from "zod";

export const FunctionStubSchema = z.object({
    input: z.any(),
    output: z.any(),
});
export const FunctionSchema = FunctionStubSchema.extend({
    fx: z.function(),
});

export const FunctionStubsSchema = z.record(z.string(), FunctionStubSchema);
export const FunctionsSchema = z.record(z.string(), FunctionSchema);

// Static TypeScript types for compile-time checks
export type FunctionStub = {
    input: ZodTypeAny;
    output: ZodTypeAny;
};
export type Function = z.infer<typeof FunctionSchema>;
export type FunctionStubs = Record<string, FunctionStub>;
export type Functions = z.infer<typeof FunctionsSchema>;

// Utility types to derive strongly-typed function maps from stubs
export type FunctionFxFromStub<S extends FunctionStub> = (args: z.infer<S["input"]>) => Promise<z.infer<S["output"]>>;

export type FunctionsFromStubs<Stubs extends FunctionStubs> = {
    [K in keyof Stubs]: {
        input: Stubs[K]["input"];
        output: Stubs[K]["output"];
        fx: FunctionFxFromStub<Stubs[K]>;
    };
};
