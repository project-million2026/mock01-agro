// O app vive DENTRO do repo do web (monorepo sem workspaces). Sem isto, o Metro subiria até o
// node_modules da raiz e acharia um segundo `react` (o do web) — duplicata de módulo nativo. Aqui
// fixamos a resolução SÓ no node_modules do próprio mobile/ e não vigiamos pastas acima.
const { getDefaultConfig } = require('expo/metro-config')
const path = require('path')

const projectRoot = __dirname
const config = getDefaultConfig(projectRoot)

config.watchFolders = [projectRoot]
config.resolver.nodeModulesPaths = [path.resolve(projectRoot, 'node_modules')]
config.resolver.disableHierarchicalLookup = true

module.exports = config
