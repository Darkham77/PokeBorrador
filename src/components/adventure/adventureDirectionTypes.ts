import type { AdventureNodeId } from '../../../test_aventura/logic/adventure/kantoGraph.ts'

export interface DirectionConnectionItem {
  target: AdventureNodeId
  mo?: string
  label: string
}
