import { z } from "zod";


export const registerSchema = z.object({
    email: z.string().email(),
    password: z.string().min(8 ,"Password must be at least 8 characters long"),
    //username: z.string().min(3),
});

export const loginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(8 ,"Password must be at least 8 characters long"),
    //username: z.string().min(3),
});


export const zodErrorHandler = ({error}: { error: ZodError }) => {
    return error.issues
    .map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
    }))
    .reduce((acc, curr) => {
        acc[curr.path] = curr.message;
        return acc;
    }, {} as Record<string, string>);
    .join(", ");
}

//export type RegisterSchema = z.infer<typeof registerSchema>;