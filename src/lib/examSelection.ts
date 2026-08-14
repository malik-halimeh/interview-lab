import type { PublicAssessmentItem } from '../content/types'

export interface ExamSelection {
  itemId: string | null
  ids: string[]
}

export const isOrderingAssessment = (type: string) =>
  type === 'ordering' || type === 'http-flow' || type === 'git-sequencing'

export function initialExamSelection(item?: PublicAssessmentItem | null): ExamSelection {
  return {
    itemId: item?.id ?? null,
    ids: item && isOrderingAssessment(item.type) ? item.options.map((option) => option.id) : [],
  }
}

export function selectionForItem(
  item: PublicAssessmentItem | null | undefined,
  selection: ExamSelection,
): string[] {
  if (!item) return []
  if (selection.itemId !== item.id) return initialExamSelection(item).ids

  const optionIds = new Set(item.options.map((option) => option.id))
  const validIds = selection.ids.filter((id) => optionIds.has(id))

  if (isOrderingAssessment(item.type) && validIds.length !== item.options.length) {
    return initialExamSelection(item).ids
  }

  return validIds
}
