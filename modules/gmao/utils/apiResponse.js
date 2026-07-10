/**
 * Réponse succès standardisée
 */
const success = (res, data = {}, message = 'Succès', statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
    timestamp: new Date().toISOString(),
  })
}

/**
 * Réponse erreur standardisée
 */
const error = (res, message = 'Erreur serveur', statusCode = 500, errors = null) => {
  const body = { success: false, message, timestamp: new Date().toISOString() }
  if (errors) body.errors = errors
  return res.status(statusCode).json(body)
}

/**
 * Réponse paginée
 */
const paginated = (res, data, total, page, limit, message = 'Succès') => {
  return res.status(200).json({
    success: true,
    message,
    data,
    pagination: {
      total,
      page:       Number(page),
      limit:      Number(limit),
      totalPages: Math.ceil(total / limit),
      hasNext:    page * limit < total,
      hasPrev:    page > 1,
    },
    timestamp: new Date().toISOString(),
  })
}

module.exports = { success, error, paginated }
