import { v4 as uuidv4 } from 'uuid'
import { clean, cleanArr } from '@/lib/http/response'
import { NotFoundError } from '@/lib/errors/AppError'

/**
 * [SERVICE MVC] Regras de Negócio (Camada Intermediária)
 * Atua como o "Service" que é frequentemente instanciado pelos Controllers.
 * Contém a lógica de negócio principal do CRUD, isolando o controlador
 * (que só lida com HTTP) do Repositório (que só lida com Banco de Dados).
 */
export function createCrudService(repository, { transformOnCreate } = {}) {
  return {
    /**
     * [READ] (List)
     * Regra de negócio para listar todos os registros de uma tabela/coleção.
     */
    async list() {
      return { items: cleanArr(await repository.findAll()) }
    },

    /**
     * [READ] (Get By ID)
     * Regra de negócio para buscar um registro específico e garantir que ele exista.
     */
    async getById(id) {
      const doc = await repository.findById(id)
      if (!doc) throw new NotFoundError()
      return clean(doc)
    },

    /**
     * [CREATE] (Insert)
     * Regra de negócio para criação: gera ID (UUID), define timestamps de criação e envia pro Model.
     */
    async create(body) {
      const data = transformOnCreate ? transformOnCreate(body) : body
      const doc = { id: uuidv4(), ...data, createdAt: new Date(), updatedAt: new Date() }
      await repository.insertOne(doc)
      return clean(doc)
    },

    /**
     * [UPDATE] (Edit)
     * Regra de negócio para edição: aplica timestamp de updatedAt e passa os novos dados.
     */
    async update(id, body) {
      const doc = await repository.updateById(id, { ...body, updatedAt: new Date() })
      return clean(doc)
    },

    /**
     * [DELETE] (Remove)
     * Regra de negócio para deleção do recurso no banco.
     */
    async remove(id) {
      await repository.deleteById(id)
      return { deleted: true }
    },
  }
}
