import type { AdventureNodeId } from '../../../test aventura/kantoGraph.ts'

export interface DirectionConnectionItem {
  target: AdventureNodeId
  mo?: string
  label: string
}
