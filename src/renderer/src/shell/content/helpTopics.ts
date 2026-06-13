import { HelpTopic } from '../../ui/HelpPanel'

export const SHELL_HELP_TOPICS: Record<string, HelpTopic> = {
  empty: {
    title: 'Выделите область для анализа',
    description:
      'Выберите метод в toolbar и область на изображении левой кнопкой мыши. Двойной клик выделяет всё изображение.',
    interpretation:
      'После выделения область будет обработана активным методом, и справа появятся его вкладки визуализации.'
  }
}
