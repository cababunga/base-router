import { IncomingMessage, ServerResponse } from "node:http";

// Middleware for adding CORS headers
const cors = ({methods="GET", headers="", origin=null, credentials=false} = {}) => 
    (req: IncomingMessage, res: ServerResponse) => {
        if (req.headers["origin"]) {
            res.setHeader("Access-Control-Allow-Methods", methods);
            res.setHeader("Access-Control-Allow-Origin", origin || req.headers["origin"]);
            res.setHeader("Access-Control-Allow-Headers", headers);
            res.setHeader("Access-Control-Allow-Credentials", `${credentials}`);
            if (req.method == "OPTIONS")
                res.end();
        }
    };

export default cors;
