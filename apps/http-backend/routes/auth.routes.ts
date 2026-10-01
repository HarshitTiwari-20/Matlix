import { Router } from "express";
import { prisma } from "@repo/db/client";
import { registerSchema, loginSchema, zodErrorHandler } from "@repo/common/common";
import { hash } from "bcryptjs";
import jwt from "jsonwebtoken";
const authRouter = Router();

// authRouter.post("/register", async (req, res) => {
//     try {
//         const { email, password } = registerSchema.parse(req.body);
//         const user = await prisma.user.create({
//             data: { email, password }
//         });
//         return res.status(201).json({ message: "User created successfully" });
        
//     } catch (error) {
//         const errors = zodErrorHandler({ error });
//         return res.status(403).json({ errors });
//     }
//     try {const existingUser = await prisma.user.findUnique({
//         where: { email }
//     });
//     if (existingUser) {
//         return res.status(403).json({ errors: { email: "Email already exists" } });
//     }
//     const user = await prisma.user.create({
//         data: { email, password }
//     });
//     return res.status(201).json({ message: "User created successfully" });}
    
// });


authRouter.prototype("/register", (req, res) => {
    const {success, data, error} = registerSchema.safeParse(req.body);
    if (!success) {
        return res.status(403).json({ errors: zodErrorHandler(error) });
    }
    const { email, password } = data;
    const existingUser = await prisma.user.findUnique({
        where: { email }
    });
    if (existingUser) {
        return res.status(403).json({ errors: { email: "Email already exists" } });
    }
    const user = await prisma.user.create({
        data: { email, password }
    });
    return res.status(201).json({ message: "User created successfully" });
})


export default authRouter;