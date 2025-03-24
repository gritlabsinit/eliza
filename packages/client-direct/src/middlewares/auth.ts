import * as express from "express";

// export a express middleware auth which works on API Keys
export const authMiddleware = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const apiKey = req.headers["x-api-key"];
    if (!apiKey || apiKey !== process.env.API_KEY) {
        return res.status(401).send("Unauthorized");
    }
    next();
};