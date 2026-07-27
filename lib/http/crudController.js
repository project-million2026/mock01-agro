import { withErrorHandling } from './handler'
import { requireUser } from './auth'
import { created } from './response'

// All cadastro endpoints require authentication (any role) — matches the
// old catch-all's "all routes below require auth" rule, just enforced
// per-controller instead of via a route-order trick.

/**
 * [CONTROLLER MVC] Controladores de Coleção (Listagem e Criação)
 * No padrão MVC, estes métodos atuam como os "Controllers" de rota,
 * recebendo a requisição HTTP, validando a sessão e repassando para o Service (Regra de Negócio).
 */
export function makeListControllers(service) {
  /**
   * [READ] Lista todos os recursos
   * @route GET /api/...
   */
  const GET = withErrorHandling(async (request) => {
    requireUser(request)
    return service.list()
  })

  /**
   * [CREATE] Cadastra um novo recurso
   * @route POST /api/...
   */
  const POST = withErrorHandling(async (request) => {
    requireUser(request)
    const body = await request.json()
    const doc = await service.create(body)
    return created(doc)
  })

  return { GET, POST }
}

/**
 * [CONTROLLER MVC] Controladores de Item (Detalhe, Edição e Exclusão)
 * Responsável por lidar com as rotas que especificam um ID na URL (ex: /api/.../:id).
 */
export function makeItemControllers(service) {
  /**
   * [READ] Busca os dados de um recurso específico pelo ID
   * @route GET /api/.../:id
   */
  const GET = withErrorHandling(async (request, { params }) => {
    requireUser(request)
    const { id } = await params
    return service.getById(id)
  })

  /**
   * [UPDATE] Edita/Atualiza as informações de um recurso existente
   * @route PUT /api/.../:id
   */
  const PUT = withErrorHandling(async (request, { params }) => {
    requireUser(request)
    const { id } = await params
    const body = await request.json()
    return service.update(id, body)
  })

  /**
   * [DELETE] Exclui/Remove um recurso do banco de dados
   * @route DELETE /api/.../:id
   */
  const DELETE = withErrorHandling(async (request, { params }) => {
    requireUser(request)
    const { id } = await params
    return service.remove(id)
  })

  return { GET, PUT, DELETE }
}
