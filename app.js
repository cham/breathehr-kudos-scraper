var express = require('express');
var app = express();
var routemaster = require('routemaster');
var http = require('http');
var server = http.createServer(app);
var port = 4040;

app.use(routemaster({
    directory: './routes',
    Router: express.Router
}));

server.listen(port);
console.log('server running on port', port);

module.exports = {
    app: app,
    server: server
};
