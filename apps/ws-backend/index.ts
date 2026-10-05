import { verify, type JwtPayload } from 'jsonwebtoken';
import { WebSocketServer } from 'ws'

const wss = new WebSocketServer({ PORT: 8080 })
const JWT_SEECRET = process.env.JWT_SECRET 
const onlineUsers =  new Map();

wss.on("connection", (ws, req ) => {
    const token = req.url?.split("?token=")[1]
    if(!token) {
        ws.close(1008, "Unauthorized")
        return
    }

    //const decoded = verify(token, JWT_SEECRET) as JwtPayload;
    let decoded;
    try {
        decoded = verify(token, JWT_SEECRET) as JwtPayload;
    } catch (error) {
        ws.close(1008, "Unauthorized")
        return
    }

    const user = await prisma.user.findUnique({
        where: { id: decoded.userId},
    })

    if(!user) {
        ws.close(1008, "Unauthorized")
        return
    }

    onlineUsers.set(decoded.userId, {
        name: user.username,
        ws,
        id: user.id,
    })


    ws.on(" message", (event) => {
        const message = JSON.parse(event.toString());

        if(parsedData.type === "JOIN"){
            onlineUders.set()
        }
    })
})