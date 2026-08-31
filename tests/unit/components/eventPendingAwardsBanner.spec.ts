// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest"
import { mount } from "@vue/test-utils"
import { createPinia, setActivePinia } from "pinia"
import EventPendingAwardsBanner from "@/components/events/EventPendingAwardsBanner.vue"
import { useEventStore } from "@/stores/events"
import type { Event as GameEvent } from "@/logic/events/eventEngine"
import type { PendingAward } from "@/types/system/stores"

describe("EventPendingAwardsBanner.vue", () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    const eventStore = useEventStore()
    eventStore.allEvents = [
      {
        id: "torneo_pesca",
        name: "Torneo de Pesca Acuática",
        icon: "🎣",
        type: "competition",
        active: true,
        manual: false,
        config: {
          rotationTheme: "weekly_4",
          weeklyRotations: {
            "1": { species: "magikarp,gyarados", banner: "pesca_magikarp", title: "Torneo Magikarp & Gyarados" },
            "4": { species: "dratini,dragonair,lapras", banner: "pesca_mistica", title: "Torneo de Pesca Mística" }
          },
          subCompetitions: [
            {
              id: "ivs",
              name: "Genética Superior (IVs)",
              metric: "total_ivs",
              order: "max",
              prizes: {
                first: { type: "mixed", money: 25000, battleCoins: 150, items: { goldbottlecap: 1, rarecandy: 5 } }
              }
            },
            {
              id: "weight",
              name: "Masa y Peso",
              metric: "weight",
              order: "auto",
              prizes: {
                first: { type: "mixed", money: 20000, battleCoins: 100, items: { bottlecap: 1, rarecandy: 3 } }
              }
            }
          ]
        },
        description: "Torneo de pesca"
      } as unknown as GameEvent
    ]
  })

  it("renders 2 or more pending awards simultaneously with claim and discard buttons", async () => {
    const eventStore = useEventStore()
    const mockAwards: PendingAward[] = [
      {
        id: "award-pesca-1",
        event_id: "torneo_pesca",
        winner_id: "user-franco",
        prize: JSON.stringify({ type: "mixed", money: 25000, battleCoins: 150, items: { goldbottlecap: 1, rarecandy: 5 } }),
        received_at: null,
        awarded_at: "2026-08-31T20:00:00Z"
      },
      {
        id: "award-pesca-2",
        event_id: "torneo_pesca",
        winner_id: "user-franco",
        prize: JSON.stringify({ type: "mixed", money: 20000, battleCoins: 100, items: { bottlecap: 1, rarecandy: 3 } }),
        received_at: null,
        awarded_at: "2026-08-31T20:00:00Z"
      }
    ]
    eventStore.pendingAwards = mockAwards

    const wrapper = mount(EventPendingAwardsBanner)
    expect(wrapper.text()).toContain("RECOMPENSAS PENDIENTES (2)")
    expect(wrapper.findAll(".award-item").length).toBe(2)
    expect(wrapper.text()).toMatch(/Torneo Magikarp & Gyarados|Torneo de Pesca/)
    expect(wrapper.findAll(".claim-action-btn").length).toBe(2)
    expect(wrapper.findAll(".discard-action-btn").length).toBe(2)
  })
})
