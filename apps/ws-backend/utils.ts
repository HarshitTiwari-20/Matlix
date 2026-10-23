import type { Question, questionSign } from "./types"

export const qenerateQusestion = () : Question[] => {
    const questions : Question[] = []
    const sign = ["MINUS" , "PLUS" , "DIVIDE" , "MULTIPLICATION"];
    for ( let i = 0; i < 60; i++){

        const randomOperation1 = Math.floor(Math.random() * 10);
        const randomOperation2 = Math.floor(Math.random() * 10);

        const randomSign = sign[Math.floor(Math.random() * sign.length)] ! as questionSign;
        
        let answer;

        switch (randomSign) {
            case "DIVIDE":
                answer = randomOperation1 / randomOperation2;
                break;
            case "MULTIPLICATION":
                answer = randomOperation1 * randomOperation2;
                break;
            case "PLUS":
                answer = randomOperation1 + randomOperation2;
                break;
            case "MINUS":
                answer = randomOperation1 - randomOperation2;
                break;
            default:
                throw new Error(`Invalid or unknown operation: ${randomSign}`);
                break;
        }
    
        questions.push({
            id: crypto.randomUUID(),
            sign: randomSign,
            operation1: randomOperation1,
            operation2: randomOperation2,
            answer,
        });
    }
    return questions;
}