import { SHOP_ITEMS } from '../src/data/items.ts'
import { getItemVirtualCategory } from '../src/logic/providers/itemProvider.ts'

console.log("Analyzing SHOP_ITEMS categories:")
for (const item of SHOP_ITEMS) {
  const resolved = getItemVirtualCategory(item)
  if (item.market || item.trainerShop) {
    console.log(`- ${item.name} (${item.id}): cat=${item.cat}, resolved=${resolved}, market=${item.market}, trainerShop=${item.trainerShop}`)
  }
}
