import { createServer, Server, IncomingMessage, ServerResponse } from "node:http";

export interface Request extends IncomingMessage {
    originalUrl?: string;
    json?: any;
    param?: { [key: string]: string; };
    baseUrl: string;
    path: string;
    query: any;
    _cache: {
        query?: { [key: string]: string; },
        body?: string,
        json: any,
    }
}

type Handler = (req: Request, res: ServerResponse) => void;
type ErrorHandler = (error: Error, req: Request, res: ServerResponse) => void;

const query = (req: Request, query: string) => {
    if (!query)
        return {};

    if (!req._cache.query)
        req._cache.query = Object.fromEntries(
            query.split("&").map(x => x.split("=").map(y => decodeURIComponent(y))));

    return req._cache.query;
};

const json = (req: Request, res: ServerResponse, maxJsonClientBody: number) => {
    if (req.headers["content-type"] != "application/json")
        return;

    if (req._cache.json !== undefined)
        return req._cache.json;

    return new Promise((resolve, reject) => {
        const lengthError = () => {
            res.writeHead(413).end();
            req.socket.destroy();
            reject(new Error("Length error"));
        };
        const len = Number(req.headers["content-length"] || "0");
        if (len > maxJsonClientBody)
            return lengthError();

        const encoding = req.headers["content-encoding"];
        req.setEncoding((encoding || "utf8") as BufferEncoding);
        const body: string[] = [];
        let bodyLen = 0;
        req.on("data", data => {
            if (bodyLen + data.length > len)
                return lengthError();

            body.push(data);
            bodyLen += data.length;
        });
        req.on("end", () => {
            req._cache.body = body.join("");
            try {
                req._cache.json = JSON.parse(req._cache.body);
            }
            catch (e) {
                reject(e);
                return;
            }
            resolve(req._cache.json);
        });
    });
};

interface Route {
    methods: (string | undefined)[];
    path: string | RegExp;
    handlers: Handler[];
}

export class Router {
    #maxJsonClientBody: number;
    #routes: Route[];
    #errorHandler: ErrorHandler;

    constructor({maxJsonClientBody=1<<18}={}) {
        this.#maxJsonClientBody = maxJsonClientBody;
        this.#routes = [];
        this.#errorHandler = (err: Error, _req, res: ServerResponse) =>
            res.writeHead(500, {"Content-Type": "application/json"})
               .end(JSON.stringify({"msg": err.message}));
    }

    add(methods: string[] | string, uri: string, ...handlers: Handler[]) {
        if (!Array.isArray(methods))
            methods = [methods];
        if (methods.includes("GET") && !methods.includes("HEAD"))
            methods.push("HEAD");

        let path: string | RegExp;
        if (uri == "/")
            path = uri;
        else {
            let pathRe = uri.replace(/:([^/]+)/g, (_m, c) =>`(?<${c}>[^/]*)`);
            if (!/:\w+$/.test(uri))
                pathRe += "\\b";
            path = RegExp(`^${pathRe}`);
        }
        this.#routes.push({methods, path, handlers});
    }

    get(uri: string, ...handlers: Handler[]) {
        this.add(["GET"], uri, ...handlers);
    }

    all(uri: string, ...handlers: Handler[]) {
        this.add(["*"], uri, ...handlers);
    }

    error(handler: ErrorHandler) {
        this.#errorHandler = handler;
    }

    async route(req: Request, res: ServerResponse) {
        req.originalUrl = req.url || "";
        const [path, qs] = req.originalUrl.split("?");
        //req._cache = {};

        const parseQs = {get: () => query(req, qs)};
        Object.defineProperty(req, "query", parseQs);
        req.json = () => json(req, res, this.#maxJsonClientBody);

        routing:
        for (const route of this.#routes) {
            if (!route.methods.includes(req.method) && !route.methods.includes("*"))
                continue;

            const match = path.match(route.path);
            if (!match)
                continue;

            req.param = match.groups;
            req.baseUrl = match[0];
            req.url = req.originalUrl.slice(req.baseUrl.length);
            req.path = req.url.split("?")[0];

            for (const handler of route.handlers) {
                try {
                    await handler(req, res);
                }
                catch (e: any) {
                    await this.#errorHandler(e, req, res);
                    break routing;
                }
                if (res.writableEnded)
                    break routing;
            }
        }
        if (!res.writableEnded)
            res.writeHead(404, {"Content-Type": "application/json"})
               .end('{"msg":"Not found"}');
    }

    listen(port?: number, addr?: string): Server<typeof IncomingMessage, typeof ServerResponse> {
        const app: any = this.route.bind(this);
        const server = createServer(app);
        return server.listen(port, addr);
    }
}


const createRouter = (options?: any) => new Router(options);


export default createRouter;
