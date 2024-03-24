const http = require("http");
const router = require("..");
const cors = require("../cors");

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
app.all("/", cors({methods: "POST, DELETE", headers: "x-session-id, content-type"}));

app.add("POST", "/api/1/list", authenticate, listAdd);
app.add("DELETE", "/api/1/list/:id", authenticate, listRemove);
app.error((err, req, res) => (res, err) => errorResponse(res, 500, err.message));

const server = http.createServer(app);
server.listen(() => console.log("Listening on port", server.address().port));
