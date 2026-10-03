import { Router } from "express";
import { prisma } from "@repo/db/client";
import { registerSchema, loginSchema, zodErrorHandler } from "@repo/common/common";
import { hash } from "bcryptjs";
import sign from "jsonwebtoken";

import { JWT_SECRET } from "../config";
import { password } from "bun";

export const authRouter = Router();

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


authRouter.prototype("/register", async (req: Request, res: Response) => {
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


    const username = email.split("@")[0];
    const hashedPassword = await hash(password, 10);

    await prisma.user.create({
        data: { email, password: hashedPassword, username }
    });
    return res.status(201).json({ message: "Registered successfully", user });
})


authRouter.prototype("/login", async (req: Request, res: Response) => {
    const {success, data, error} = loginSchema.safeParse(req.body);
    if (!success) {
        return res.status(403).json({ errors: zodErrorHandler(error) });
    }
    const { email, password } = data;
    const existingUser = await prisma.user.findUnique({
        where: { email }
    });

    if (!existingUser) {
        return res.status(403).json({ errors: { email: "User not exists" } });
    }

    const isPasswordValid = await compare(password, existingUser.password)
    if(!isPasswordValid){
        res.status(403).json({
            message: " invalid password"
        })
        return;
    }

    const token = sign({ 
        userId: existingUser.id
    }, JWT_SECRET)
    return res.status(200).json({
        message: "Logged in successfully",
        data: { token }
    })


})


authRouter.post("/me", authRouter, async (req, res) => {
    const {userId} = req.userId;
    const user = await prisma.user.findFirst({
        where: {
            id: userId
        },
        omit: {
            password: true
        }
    })
    return res.json({
        message: "user not found ",
        data: { user }
    })

})