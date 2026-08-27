import { computed } from "vue";
import { gsap } from "gsap";
import { useGameStore } from "@/stores/game";
import { useUIStore } from "@/stores/ui";
import { useSocialStore } from "@/stores/social/social";
import { useModalStore } from "@/stores/modals";
import { useGTSStore } from "@/stores/gts";
import { useBreedingStore } from "@/stores/breeding";
import { useEventStore } from "@/stores/events";
import { useGymsStore } from "@/stores/gyms";
import { getItemById } from "@/data/inventory/items";

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
  const eventStore = useEventStore();
  const gymsStore = useGymsStore();

  const activeTab = computed({
    get: () => uiStore.activeTab,
    set: (val: string) => { uiStore.activeTab = val; }
  });

  const totalSocialNotifications = computed(() => {
    return socialStore.notifications.total +
           gameStore.state.claimQueue.length +
           eventStore.pendingAwards.length;
  });

  const readyEggsCount = computed(() => {
    return (gameStore.state.eggs || []).filter(egg => egg.ready === true || egg.steps <= 0).length;
  });

  const ballsList = computed(() => {
    const inventory = gameStore.state.inventory || {};
    return Object.entries(inventory)
      .map(([name, qty]) => {
        const count = qty as number;
        if (count <= 0) return null;
        let found = null;
        try {
          found = getItemById(name);
        } catch {
          // ignore
        }
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
      let found = null;
      try {
        found = getItemById(key);
      } catch {
        // ignore
      }
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
    const lines: string[] = []; // text-ok
    
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
    const defeatedIds = gameStore.state.defeatedGyms || [];
    return gymsStore.gyms.filter(g => !defeatedIds.includes(g.id)).length;
  });

  const medalsBreakdown = computed(() => {
    const defeated = gameStore.state.defeatedGyms || [];
    if (defeated.length === 0) {
      return "No has ganado ninguna medalla todavía.\n¡Desafía a los Líderes de Gimnasio para obtenerlas!";
    }
    
    const earnedList = gymsStore.gyms
      .filter(g => defeated.includes(g.id))
      .map(g => `${g.badge} ${g.badgeName} (${g.leader})`);
      
    return `Medallas obtenidas (${defeated.length}/8):\n${earnedList.map(item => `• ${item}`).join("\n")}\n\nDesbloquean nuevas zonas y Pokémon.\n\nHaz clic para ver los Gimnasios.`;
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
    
    const lines: string[] = []; // text-ok
    
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
    if (tab === "bag") {
      modalStore.open("Inventory");
      return;
    }

    if (tab === "market") {
      modalStore.open("Shop");
      return;
    }

    if (tab === "online-market") {
      modalStore.open("GlobalMarket");
      return;
    }

    if (tab === "trainer-shop") {
      modalStore.open("BCShop");
      return;
    }

    if (tab === "reputation-shop") {
      modalStore.open("ReputationShop");
      return;
    }

    if (tab === "war-shop") {
      modalStore.open("WarShop");
      return;
    }

    if (tab === "team") {
      modalStore.open("TeamManagement");
      return;
    }

    if (tab === "daycare") {
      modalStore.open("Daycare");
      return;
    }

    if (["social", "friends"].includes(tab)) {
      const initialTab = (socialStore.notifications.trades > 0 && (socialStore.notifications.chats + socialStore.notifications.friends) === 0)
        ? "trades"
        : (socialStore.notifications.friends > 0 && socialStore.notifications.chats === 0)
          ? "requests"
          : "friends";
      modalStore.open("SocialCenter", { initialTab });
      return;
    }

    if (tab === "missions") {
      modalStore.open("EventMissions");
      return;
    }

    if (tab === "ranking") {
      modalStore.open("Ranking");
      return;
    }

    if (tab === "arena") {
      modalStore.open("Arena");
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
    eventStore,
    gymsStore,
    activeTab,
    totalSocialNotifications,
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
