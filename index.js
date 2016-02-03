var co = require('co');
var methods = require('methods');
var slice = Array.prototype.slice;
var isGenerator = require('is-generator');

module.exports = function (express) {
	function coexpress() {
		var app = express();
		wrap(app);
		return app;
	}

	coexpress.prototype = express;

	if (express.Router) {
		coexpress.Router = function () {
			var router = new express.Router();
			wrap(router);
			return router;
		};
	}

	return coexpress;
};

function wrap(app) {
	methods.forEach(function (method) {
		app[method] = wrapAppMethod(app[method]);
	});

	app.param = wrapParamMethod(app.param);
	app.use = wrapAppMethod(app.use);
	app.all = wrapAppMethod(app.all);
	app.del = app.delete;
}

function wrapAppMethod(route) {
	return function () {
		return route.apply(this, slice.call(arguments).map(convertGenerators));
	};
}

function wrapParamMethod(route) {
	return function (name, fn) {
		var cb = fn;

		if (isGenerator(fn)) {
			cb = function (req, res, next, id) {
				co.wrap(fn).call(this, req, res, id).then(() => !res.finished && next(), next);
			};
		}

		return route.call(this, name, cb);
	};
}

function convertGenerators(v) {
	if (!isGenerator.fn(v)) {
		return v;
	}

	return function (req, res, next) {
		co.wrap(v).call(this, req, res).then(() => !res.finished && next(), next);
	};
}
