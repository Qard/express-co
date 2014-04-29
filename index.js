var co = require('co')
var methods = require('methods')
var slice = Array.prototype.slice

module.exports = function (express) {
  function coexpress () {
    var app = express()
    wrap(app)
    app.use(startMiddleware)
    return app
  }

  coexpress.__proto__ = express

  if (express.Router) {
    coexpress.Router = function () {
      var router = express.Router()
      wrap(router)
      return router
    }
  }

  function startMiddleware (req, res, next) {
    res.render = wrapResponseMethod(res.render)
    res.send = wrapResponseMethod(res.send)
    res.throw = safeThrow
    next()
  }

  coexpress.errorMiddleware = function (opts) {
    opts = opts || {}

    if (opts.log === true) {
      opts.log = console.error.bind(console)
    }

    return function (error, req, res, next) {
      var code = error.code || 500
      var err = error.expose ? error.message : 'Internal Server Error'

      if (opts.log) {
        opts.log(error.stack)
      }

      res.send(code, {
        error: err
      })
    }
  }

  return coexpress
}

function wrap (app) {
  methods.forEach(function (method) {
    app[method] = wrapAppMethod(app[method])
  })

  app.param = wrapParamMethod(app.param)
  app.use = wrapAppMethod(app.use)
  app.all = wrapAppMethod(app.all)
  app.del = app.delete
}

function wrapAppMethod (route) {
  return function () {
    return route.apply(this, slice.call(arguments).map(convertGenerators))
  }
}

function wrapParamMethod (route) {
  return function (name, fn) {
    var cb = fn

    if (isGenerator(fn)) {
      cb = function (req, res, next, id) {
        co(fn).call(this, req, res, id, nextIfAble(req, res, next))
      }
    }

    return route.call(this, name, cb)
  }
}

function convertGenerators (v) {
  return ! isGenerator(v) ? v : function (req, res, next) {
    co(v).call(this, req, res, nextIfAble(req, res, next))
  }
}

function nextIfAble (req, res, next) {
  return function (err) {
    // setImmediate(function () {
      if (err || ! res.sent) next(err)
    // })
  }
}

function isGenerator (v) {
  return typeof v === 'function' && 'GeneratorFunction' === v.constructor.name
}

function wrapResponseMethod (method) {
  return function () {
    this.sent = true
    method.apply(this, arguments)
  }
}

function safeThrow (code, message) {
  var err = new Error(message)
  err.expose = true
  err.code = code
  throw err
}