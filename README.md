# BASE -- Boilerplate API Server Environment

## Router

HTTP request router and middleware stacker.

Creating router is easy.

```javascript
const {router} = require("base-router");
const app = router();
```

Router has the following methods:

```javascript
add(methods, route, ...handlers)
```

**methods**

This can be the name os a single HTTP method, like "GET" or an array of method names ["GET", "POST"]. Special string "*" means that any method is allowed. If "GET" is allowed, then "HEAD" will be allowed automatically.


**route**

Route is a path prefix that needs to be matched with the `url` from request. If segment of route is in form `:<word>`, this segment won't be matched with the part of the `url`, instead this part of the `url` will be available in the handler as `request.param[<word>]`.

**handlers**

The rest of the parameters are middleware and a handler. The difference between middleware and handler is that middleware doesn't call `response.end()`. If route only has associated middleware and no final handler, this middleware will be executed for each path for which this route is a prefix.

## CORS middleware

    Middleware for adding CORS headers.


## Examples

```javascript
const http = require("http");
const {router, cors} = require("base-router");

const response = (res, data, code) => {
    if (data === undefined)
        res.writeHead(code || 204).end();
    else
        res.writeHead(code || 200, {"Content-Type": "application/json"}).end(JSON.stringify(data));
};

const errorResponse = (res, code, message) =>
    res.writeHead(code, {"Content-Type": "application/json"})
        .end(JSON.stringify({err: true, msg: message}));

// Middleware for authentication
const authenticate = async (req, res) => {
    const sessionId = req.headers["x-session-id"];
    const session = await getSession(sessionId);
    if (!session)
        return errorResponse(res, 401, "Please login");
    req.session = session;
};

const getSession = async sessionId => { /* Go check some store */ return Promise.resolve(1); };
const listAdd = async (req, res) => { /* await addToList(await req.json()); */ response(res, {ok: true}); };
const listRemove = async (req, res) => { /* await removeFromList(); */ response(res); };

const app = router();
app.all("/", cors("GET, POST, PATCH, DELETE", "x-session-id, content-type"));

app.add("POST", "/api/1/list", authenticate, listAdd);
app.add("DELETE", "/api/1/list/:id", authenticate, listRemove);
app.error((err, req, res) => (res, err) => errorResponse(res, 500, err.message));

http.createServer(app).listen(1234);;
```
