// @ts-check
"use strict";

const query = (req, qs) => {
    if (!qs)
        return {};

    if (!req._cache.query)
        req._cache.query = Object.fromEntries(
                qs.split("&").map(x => x.split("=").map(y => decodeURIComponent(y))));

    return req._cache.query;
};

const json = (req, res, maxJsonClientBody) => {
    if (req.headers["content-type"] != "application/json")
        return;

    if (req._cache.json !== undefined)
        return req._cache.json;

    return new Promise((resolve, reject) => {
        const lengthError = () => {
            res.writeHead(413).end();
            req.connection.destroy();
            reject(new Error("Length error"));
        };
        const len = req.headers["content-length"];
        if (len > maxJsonClientBody)
            return lengthError();

        const encoding = req.headers["content-encoding"];
        req.setEncoding(encoding || "utf8");
        const body = [];
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

class Router {
    #maxJsonClientBody;
    #routes;
    #errorHandler;

    constructor({maxJsonClientBody=1<<18}={}) {
        this.#maxJsonClientBody = maxJsonClientBody;
        this.#routes = [];
        this.#errorHandler = (err, req, res) =>
            res.writeHead(500, {"Content-Type": "application/json"})
               .end(JSON.stringify({"msg": err.message}));
    }

    add(methods, path, ...handlers) {
        if (methods.constructor == String)
            methods = [methods];
        if (methods.includes("GET") && !methods.includes("HEAD"))
            methods.push("HEAD");
        if (path != "/") {
            let pathRe = path.replace(/:([^/]+)/g, (m, c) =>`(?<${c}>[^/]*)`);
            if (!/:\w+$/.test(path))
                pathRe += "\\b";
            path = RegExp(`^${pathRe}`);
        }
        this.#routes.push({methods, path, handlers});
    }

    get(path, ...handlers) {
        this.add(["GET"], path, ...handlers);
    }

    all(path, ...handlers) {
        this.add(["*"], path, ...handlers);
    }

    error(handler) {
        this.#errorHandler = handler;
    }

    async route(req, res) {
        req.originalUrl = req.url;
        const [path, qs] = req.url.split("?");
        req._cache = {};

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
                catch (e) {
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
}


const createRouter = opts => {
    const router = new Router(opts);
    const app = router.route.bind(router);
    for (const method of ["add", "get", "all", "error"])
        app[method] = router[method].bind(router);
    return app;
};


module.exports = createRouter;

