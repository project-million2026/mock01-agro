// Typed application errors. Services/controllers throw these instead of
// returning ad-hoc { error, status } pairs — lib/http/handler.js turns
// them into the right HTTP response automatically.

export class AppError extends Error {
  constructor(message, status = 400) {
    super(message)
    this.name = 'AppError'
    this.status = status
  }
}

export class ValidationError extends AppError {
  constructor(message = 'Dados inválidos') {
    super(message, 400)
    this.name = 'ValidationError'
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Não autenticado') {
    super(message, 401)
    this.name = 'UnauthorizedError'
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Acesso negado') {
    super(message, 403)
    this.name = 'ForbiddenError'
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Não encontrado') {
    super(message, 404)
    this.name = 'NotFoundError'
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Conflito') {
    super(message, 409)
    this.name = 'ConflictError'
  }
}
