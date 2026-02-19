# BASE -- Boilerplate API Server Environment

## Router

### Install

```shell
npm i @cababunga/router
```

### Use

HTTP request router and middleware stacker.

Creating router is easy.

```javascript
import router from "@cababunga/router";
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

### CORS middleware

Middleware for adding CORS headers.

```javascript
import cors from "@cababunga/router/cors";
cors(options)
```

The following options are recognized:

**methods**

 Will be added as the value for the `Access-Control-Allow-Methods` header.

 **origin**

 Will be added as the value for the `Access-Control-Allow-Origin` header. If omitted, `req.headers["origin"]` will be used.

 **headers**
 
 Will be added as the value for the `Access-Control-Allow-Headers` header.

 **credentials**

 Will be added as the value for the `Access-Control-Allow-Credentials` header.

```javascript
const cors = require("@cababunga/router/cors");
cors({methods: "GET, POST", headers: "content-type"});
```


### Examples

```javascript
import http from "http";
import router from "@cababunga/router";
import cors from "@cababunga/router/cors";
const accesslog = require("@cababunga/accesslog");

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

const getSession = async sessionId => { /* await getSession(sessionId) */ return Promise.resolve(1); };
const listAdd = async (req, res) => { /* await addToList(await req.json()); */ response(res, {ok: true}); };
const listRemove = async (req, res) => { /* await removeFromList(); */ response(res); };

const app = router();
app.all("/", cors({methods: "GET, POST, PATCH, DELETE", headers: "x-session-id, content-type"}));
app.all("/", accesslog(console.log, {skip: "/health-check"}));

app.add("POST", "/api/1/list", authenticate, listAdd);
app.add("DELETE", "/api/1/list/:id", authenticate, listRemove);
app.error((err, req, res) => (res, err) => errorResponse(res, 500, err.message));

app.listen(1234);
```
