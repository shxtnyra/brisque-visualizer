import { HelpPanel } from '../ui/HelpPanel'
import { TooltipManager } from '../ui/TooltipManager'
import { SHELL_HELP_TOPICS } from '../shell/content/helpTopics'
import { BRISQUE_HELP_TOPICS } from './brisque/content/helpTopics'
import { BRISQUE_TOOLTIP_HINTS } from './brisque/content/tooltipHints'
import { PLACEHOLDER_HELP_TOPICS } from './placeholder/content/helpTopics'

/** Регистрация текстов помощи и подсказок всех методов */
export function registerAppContent(helpPanel: HelpPanel, tooltipManager: TooltipManager): void {
  helpPanel.registerTopics(SHELL_HELP_TOPICS)
  helpPanel.registerTopics(BRISQUE_HELP_TOPICS)
  helpPanel.registerTopics(PLACEHOLDER_HELP_TOPICS)
  tooltipManager.registerHints(BRISQUE_TOOLTIP_HINTS)
}
