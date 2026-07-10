function makeExpressReply(reply) {
  return {
    statusCode: 200,
    status(code) {
      this.statusCode = code
      return this
    },
    code(code) {
      this.statusCode = code
      return this
    },
    json(payload) {
      if (!reply.sent) return reply.code(this.statusCode).send(payload)
    },
    send(payload) {
      if (!reply.sent) return reply.code(this.statusCode).send(payload)
    },
  }
}

function expressHandler(handler) {
  return async function adaptedHandler(request, reply) {
    const res = makeExpressReply(reply)
    const next = (err) => {
      if (!err || reply.sent) return
      const statusCode = err.statusCode || err.status || 500
      reply.code(statusCode).send({
        success: false,
        message: err.message || 'Erreur serveur GMAO',
        timestamp: new Date().toISOString(),
      })
    }

    try {
      await handler(request, res, next)
    } catch (err) {
      next(err)
    }
  }
}

module.exports = { expressHandler }
