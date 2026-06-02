import { MethodRegistry } from '../shell/MethodRegistry'
import { BrisqueQualityMethod } from './brisque/BrisqueQualityMethod'
import { BrisqueUiPlugin } from './brisque/BrisqueUiPlugin'
import { PlaceholderQualityMethod } from './placeholder/PlaceholderQualityMethod'
import { PlaceholderUiPlugin } from './placeholder/PlaceholderUiPlugin'

/** Регистрация всех доступных методов приложения */
export function createMethodRegistry(): MethodRegistry {
  const registry = new MethodRegistry()

  registry.register({
    method: new BrisqueQualityMethod(),
    createUi: ctx => new BrisqueUiPlugin(ctx)
  })

  registry.register({
    method: new PlaceholderQualityMethod(),
    createUi: _ctx => new PlaceholderUiPlugin()
  })

  registry.setActive('brisque')
  return registry
}
