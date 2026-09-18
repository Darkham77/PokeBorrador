import { computed } from "vue";
import { gsap } from "gsap";
import { useGameStore } from "@/stores/game";
import { useUIStore } from "@/stores/ui";
import { useSocialStore } from "@/stores/social/social";
import { useModalStore } from "@/stores/modals";
import { useGTSStore } from "@/stores/gts";
import { useBreedingStore } from "@/stores/breeding";
import { useGymsStore } from "@/stores/gyms";
import { getItemById, isItemId } from "@/data/inventory/items";
import { useUnifiedRewards } from "@/composables/rewards/useUnifiedRewards";
import { categorizeHomeRewards, formatHomeTooltip } from "./homeTooltipFormatter.ts";
import type { ClaimItem } from "@/types/system/game";

const TAB_MODAL_MAP: Readonly<Record<string, string>> = {
  bag: "Inventory",
  market: "Shop",
  "online-market": "GlobalMarket",
  "trainer-shop": "BCShop",
  "reputation-shop": "ReputationShop",
  "black-market": "BlackMarket",
  "war-shop": "WarShop",
  team: "TeamManagement",
  daycare: "Daycare",
  missions: "EventMissions",
  ranking: "Ranking",
  arena: "Arena",
} as const;

interface SocialNotificationsSummary {
  trades: number;
  chats: number;
  friends: number;
}

function resolveSocialInitialTab(notifications: SocialNotificationsSummary): string {
  if (notifications.trades > 0 && (notifications.chats + notifications.friends) === 0) {
    return "trades";
  }
  if (notifications.friends > 0 && notifications.chats === 0) {
    return "requests";
  }
  return "friends";
}

const HUD_NAV_ENTER_Y_OFFSET_PX = 20;
const HUD_NAV_LEAVE_Y_OFFSET_PX = 15;
const HUD_NAV_INITIAL_SCALE = 0.8;
const HUD_NAV_LEAVE_SCALE = 0.85;
const HUD_NAV_CENTERING_X_PERCENT = -50;
const HUD_NAV_TRANSFORM_ORIGIN_CENTER = "50% 50%";
const NAV_ENTER_ANIM_DURATION_SEC = 0.2;
const NAV_LEAVE_ANIM_DURATION_SEC = 0.15;

export function useNavigationState() {
  const gameStore = useGameStore();
  const uiStore = useUIStore();
  const socialStore = useSocialStore();
  const modalStore = useModalStore();
  const gtsStore = useGTSStore();
  const breedingStore = useBreedingStore();
  const gymsStore = useGymsStore();
  const { unifiedRewards, totalActionableMissions, isClassMissionReadyToDeploy, totalHomeNotifications: baseHomeNotifications } = useUnifiedRewards();

  const readyEggsCount = computed(() => {
    return (gameStore.state.eggs || []).filter(egg => egg.ready === true || egg.steps <= 0).length;
  });

  const totalHomeNotifications = computed(() => {
    return baseHomeNotifications.value + readyEggsCount.value + gymsStore.availableRematchesCount;
  });

  const homeTooltipDescription = computed(() => {
    const allRewards = unifiedRewards.value || [];
    const counts = {
      ...categorizeHomeRewards(allRewards),
      dailyMissions: totalActionableMissions.value,
      classDeploy: isClassMissionReadyToDeploy.value ? 1 : 0,
      readyEggs: readyEggsCount.value,
      rematches: gymsStore.availableRematchesCount,
    };
    return formatHomeTooltip(counts, totalHomeNotifications.value);
  });

  const activeTab = computed({
    get: () => uiStore.activeTab,
    set: (val: string) => { uiStore.activeTab = val; }
  });

  const tradeClaimsCount = computed(() => {
    return (gameStore.state.claimQueue || []).filter(
      (c: ClaimItem) => c.source_type === 'trade' || c.source_type === 'trade_refund'
    ).length;
  });

  const totalSocialNotifications = computed(() => {
    return socialStore.notifications.total + tradeClaimsCount.value;
  });

  const ballsList = computed(() => {
    const inventory = gameStore.state.inventory || {};
    return Object.entries(inventory)
      .map(([name, qty]) => {
        const count = qty as number;
        if (count <= 0) return null;
        const found = isItemId(name) ? getItemById(name) : null;
        if (found?.cat === "pokeballs" || name.toLowerCase().includes("ball")) {
          return { name: found?.name || name, qty: count };
        }
        return null;
      })
      .filter(Boolean) as { name: string; qty: number }[];
  });

  const materialItems = computed(() => {
    const inventory = gameStore.state.inventory || {};
    const list: { name: string; qty: number; tier: number; icon: string }[] = [];
    
    for (const [key, qty] of Object.entries(inventory)) {
      const count = qty as number;
      if (count <= 0) continue;
      const found = isItemId(key) ? getItemById(key) : null;
      if (found) {
        let tier: number | null = null;
        if (found.cat === "raw_material" || found.sprite?.includes("crafting/tier0/")) {
          tier = 0;
        } else if (found.cat === "refined_material" || found.sprite?.includes("crafting/tier1/")) {
          tier = 1;
        } else if (found.cat === "component" || found.sprite?.includes("crafting/tier2/")) {
          tier = 2;
        }
        
        if (tier !== null) {
          list.push({
            name: found.name,
            qty: count,
            tier,
            icon: found.icon || "📦"
          });
        }
      }
    }
    return list;
  });

  const mochilaTooltipDescription = computed(() => {
    const lines: string[] = []; // text-ok: UI text display localization string
    
    // Section 1: Poké Balls first
    lines.push("🔴 POKÉ BALLS");
    if (ballsList.value.length === 0) {
      lines.push("• Ninguna");
    } else {
      ballsList.value.forEach(i => lines.push(`• ${i.name}: ${i.qty}`));
    }
    
    lines.push(""); // empty line
    
    // Section 2: Materials second
    lines.push("📦 MATERIALES");
    const t0 = materialItems.value.filter(i => i.tier === 0);
    const t1 = materialItems.value.filter(i => i.tier === 1);
    const t2 = materialItems.value.filter(i => i.tier === 2);
    
    if (materialItems.value.length === 0) {
      lines.push("• Ninguno");
    } else {
      if (t0.length > 0) {
        t0.forEach(i => lines.push(`• ${i.icon} ${i.name}: ${i.qty}`));
      }
      if (t1.length > 0) {
        t1.forEach(i => lines.push(`• ${i.icon} ${i.name}: ${i.qty}`));
      }
      if (t2.length > 0) {
        t2.forEach(i => lines.push(`• ${i.icon} ${i.name}: ${i.qty}`));
      }
    }
    
    lines.push("");
    lines.push("Haz clic para abrir el inventario.");
    return lines.join("\n");
  });

  const gymRematchesCount = computed(() => {
    return gymsStore.availableRematchesCount;
  });

  const medalsBreakdown = computed(() => {
    const defeated = gameStore.state.defeatedGyms || [];
    if (defeated.length === 0) {
      return "No has ganado ninguna medalla todavía.\n¡Desafía a los Líderes de Gimnasio para obtenerlas!";
    }
    
    const earnedList = gymsStore.gyms
      .filter(g => defeated.includes(g.id))
      .map(g => `${g.badge} ${g.badgeName} (${g.leader})`);
      
    const rematchNote = gymsStore.availableRematchesCount > 0
      ? `\n\n🔥 ¡Hay ${gymsStore.availableRematchesCount} revancha${gymsStore.availableRematchesCount > 1 ? 's' : ''} diaria${gymsStore.availableRematchesCount > 1 ? 's' : ''} disponible${gymsStore.availableRematchesCount > 1 ? 's' : ''}!`
      : "";

    return `Medallas obtenidas (${defeated.length}/8):\n${earnedList.map(item => `• ${item}`).join("\n")}${rematchNote}\n\nDesbloquean nuevas zonas y Pokémon.\n\nHaz clic para ver los Gimnasios.`;
  });

  const warehouseEggsCount = computed(() => breedingStore.warehouseEggs?.length || 0);
  const walkingEggsCount = computed(() => (gameStore.state.eggs || []).length);
  const freeEggSlots = computed(() => Math.max(0, 6 - walkingEggsCount.value));

  const crianzaBadgeValue = computed(() => {
    const ready = readyEggsCount.value;
    if (ready > 0) return ready;

    if (freeEggSlots.value > 0 && warehouseEggsCount.value > 0) {
      return Math.min(freeEggSlots.value, warehouseEggsCount.value);
    }
    return 0;
  });

  const eggsBreakdown = computed(() => {
    const incubating = gameStore.state.eggs || [];
    const warehouse = breedingStore.warehouseEggs || [];
    
    const lines: string[] = []; // text-ok: UI text display localization string
    
    if (incubating.length === 0 && warehouse.length === 0) {
      return "No tienes huevos en incubación ni en la guardería.\n¡Haz clic para ir a la Guardería!";
    }
    
    if (incubating.length > 0) {
      lines.push(`Incubando: ${incubating.length} / 6 huevos`);
      incubating.forEach((egg, idx) => {
        if (egg.ready || egg.steps <= 0) {
          lines.push(`• Huevo ${idx + 1}: ¡Listo para nacer!🐣`);
        } else {
          const total = egg.totalSteps ?? egg.steps;
          const walked = Math.max(0, total - egg.steps);
          lines.push(`• Huevo ${idx + 1}: ${Math.floor(walked).toLocaleString()} / ${total.toLocaleString()} pasos`);
        }
      });
    } else {
      lines.push("No hay huevos en incubación.");
    }
    
    lines.push(""); // Separador de secciones
    
    if (warehouse.length > 0) {
      lines.push(`En Guardería: ${warehouse.length} huevos sin reclamar🥚`);
    } else {
      lines.push("No hay huevos pendientes en la Guardería.");
    }
    
    lines.push("");
    lines.push("Haz clic para abrir la Guardería.");
    
    return lines.join("\n");
  });

  const handleMouseEnter = (group: string) => {
    if (window.matchMedia("(hover: hover)").matches) {
      uiStore.openHudGroup = group;
    }
  };

  const handleMouseLeave = (group: string) => {
    if (window.matchMedia("(hover: hover)").matches) {
      if (uiStore.openHudGroup === group) {
        uiStore.openHudGroup = null;
      }
    }
  };

  const handleTabChange = (tab: string, _event?: Event) => {
    const modalName = TAB_MODAL_MAP[tab];
    if (modalName) {
      modalStore.open(modalName);
      return;
    }

    if (tab === "social" || tab === "friends") {
      modalStore.open("SocialCenter", { initialTab: resolveSocialInitialTab(socialStore.notifications) });
      return;
    }
    
    activeTab.value = tab;
    uiStore.openHudGroup = null;
  };

  const toggleGroupMenu = (name: string) => {
    uiStore.toggleHudGroup(name);
  };

  const beforeEnter = (el: Element, position: string = "top") => {
    gsap.killTweensOf(el);
    gsap.set(el, { 
      opacity: 0, 
      xPercent: HUD_NAV_CENTERING_X_PERCENT,
      y: position === "top" ? -HUD_NAV_ENTER_Y_OFFSET_PX : HUD_NAV_ENTER_Y_OFFSET_PX,
      scale: HUD_NAV_INITIAL_SCALE,
      transformOrigin: HUD_NAV_TRANSFORM_ORIGIN_CENTER
    });
  };

  const enter = (el: Element, done: () => void) => {
    gsap.killTweensOf(el);
    gsap.to(el, {
      opacity: 1,
      y: 0,
      scale: 1,
      duration: NAV_ENTER_ANIM_DURATION_SEC,
      ease: "back.out(1.2)",
      onComplete: done
    });
  };

  const leave = (el: Element, position: string = "top", done?: () => void) => {
    gsap.killTweensOf(el);
    gsap.to(el, {
      opacity: 0,
      y: position === "top" ? -HUD_NAV_LEAVE_Y_OFFSET_PX : HUD_NAV_LEAVE_Y_OFFSET_PX,
      scale: HUD_NAV_LEAVE_SCALE,
      duration: NAV_LEAVE_ANIM_DURATION_SEC,
      ease: "power2.in",
      onComplete: done
    });
  };

  return {
    gameStore,
    uiStore,
    socialStore,
    modalStore,
    gtsStore,
    breedingStore,
    gymsStore,
    activeTab,
    totalHomeNotifications,
    homeTooltipDescription,
    totalSocialNotifications,
    tradeClaimsCount,
    mochilaTooltipDescription,
    gymRematchesCount,
    medalsBreakdown,
    crianzaBadgeValue,
    eggsBreakdown,
    handleMouseEnter,
    handleMouseLeave,
    handleTabChange,
    toggleGroupMenu,
    beforeEnter,
    enter,
    leave
  };
}
