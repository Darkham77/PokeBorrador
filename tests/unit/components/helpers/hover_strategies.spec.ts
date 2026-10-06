// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { getHoverEnterStrategy, getHoverLeaveStrategy } from '@/logic/hover/hoverStrategies';

describe('Hover Strategies Domain Suite (Tier 1)', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  describe('getHoverEnterStrategy', () => {
    it('handles accordion-toggle and no-scale-hover bypasses', () => {
      const el = document.createElement('div');
      el.className = 'accordion-toggle';
      expect(getHoverEnterStrategy(el)).toEqual({
        scale: 1,
        y: 0,
        duration: 0.15,
        ease: 'power1.out'
      });

      const elNoScale = document.createElement('div');
      elNoScale.className = 'no-scale-hover';
      expect(getHoverEnterStrategy(elNoScale)).toEqual({
        scale: 1,
        y: 0,
        duration: 0.15,
        ease: 'power1.out'
      });
    });

    it('calculates submenu navigation button hover', () => {
      const parent = document.createElement('div');
      parent.className = 'hud-submenu';
      const btn = document.createElement('button');
      btn.className = 'hud-nav-btn';
      parent.appendChild(btn);

      const res = getHoverEnterStrategy(btn);
      expect(res.scale).toBe(1);
      expect(res.y).toBe(0);
      expect(res.x).toBe(6);

      const warBtn = document.createElement('button');
      warBtn.className = 'hud-nav-btn war-shop-nav-btn';
      parent.appendChild(warBtn);
      const warRes = getHoverEnterStrategy(warBtn);
      expect(warRes.x).toBe(6);
    });

    it('calculates HUD buttons hover (hud-nav-btn, hud-sq-btn)', () => {
      const navBtn = document.createElement('button');
      navBtn.className = 'hud-nav-btn';
      const navRes = getHoverEnterStrategy(navBtn);
      expect(navRes.scale).toBe(1.03);
      expect(navRes.y).toBe(-1.5);

      const sqBtn = document.createElement('button');
      sqBtn.className = 'hud-sq-btn';
      const sqRes = getHoverEnterStrategy(sqBtn);
      expect(sqRes.scale).toBe(1.05);
      expect(sqRes.y).toBe(-2);
    });

    it('handles banners hover (pokecenter-banner, pc-banner)', () => {
      const pokeBanner = document.createElement('div');
      pokeBanner.className = 'pokecenter-banner';
      expect(getHoverEnterStrategy(pokeBanner).scale).toBe(1.02);

      const cooldownBanner = document.createElement('div');
      cooldownBanner.className = 'pokecenter-banner on-cooldown';
      expect(getHoverEnterStrategy(cooldownBanner)).toEqual({
        scale: 1,
        y: 0,
        duration: 0.1
      });

      const pcBanner = document.createElement('div');
      pcBanner.className = 'pc-banner';
      expect(getHoverEnterStrategy(pcBanner).scale).toBe(1.02);
    });

    it('handles item cards hover (quick-item-card, btn-catch-ball, inventory-item-card, shop-item-card)', () => {
      const quickRare = document.createElement('div');
      quickRare.className = 'quick-item-card tier-rare';
      expect(getHoverEnterStrategy(quickRare).scale).toBe(1.02);

      const quickEpic = document.createElement('div');
      quickEpic.className = 'quick-item-card tier-epic';
      expect(getHoverEnterStrategy(quickEpic).scale).toBe(1.02);

      const quickLegend = document.createElement('div');
      quickLegend.className = 'quick-item-card tier-legend';
      expect(getHoverEnterStrategy(quickLegend).scale).toBe(1.02);

      const catchBall = document.createElement('button');
      catchBall.className = 'btn-catch-ball';
      const ballRes = getHoverEnterStrategy(catchBall);
      expect(ballRes.scale).toBe(1.1);
      expect(ballRes.rotation).toBe(5);

      const invCard = document.createElement('div');
      invCard.className = 'inventory-item-card';
      expect(getHoverEnterStrategy(invCard).scale).toBe(1.08);

      const shopCard = document.createElement('div');
      shopCard.className = 'shop-item-card';
      expect(getHoverEnterStrategy(shopCard).scale).toBe(1.02);
    });

    it('handles entity cards hover (pokemon-display-card, friend-card, map-row, trainer-card)', () => {
      const pokeCard = document.createElement('div');
      pokeCard.className = 'pokemon-display-card';
      expect(getHoverEnterStrategy(pokeCard).scale).toBe(1.02);

      const friendCard = document.createElement('div');
      friendCard.className = 'friend-card';
      expect(getHoverEnterStrategy(friendCard).x).toBe(4);

      const pendingFriend = document.createElement('div');
      pendingFriend.className = 'friend-card pending';
      expect(getHoverEnterStrategy(pendingFriend).x).toBe(4);
    });

    it('handles misc elements hover (hud-pill, avatar, badge-icon, main-sprite, upd-tab-btn, info-item)', () => {
      const pill = document.createElement('div');
      pill.className = 'hud-pill';
      expect(getHoverEnterStrategy(pill).scale).toBe(1.03);

      const avatar = document.createElement('div');
      avatar.className = 'trainer-avatar-container';
      expect(getHoverEnterStrategy(avatar).scale).toBe(1.1);

      const badge = document.createElement('div');
      badge.className = 'badge-icon';
      expect(getHoverEnterStrategy(badge).scale).toBe(1.3);

      const sprite = document.createElement('div');
      sprite.className = 'main-sprite';
      expect(getHoverEnterStrategy(sprite).scale).toBe(1.05);

      const editNick = document.createElement('button');
      editNick.className = 'edit-nick-btn';
      expect(getHoverEnterStrategy(editNick).scale).toBe(1.2);

      const activeTab = document.createElement('button');
      activeTab.className = 'upd-tab-btn active';
      expect(getHoverEnterStrategy(activeTab)).toEqual({});

      const tab = document.createElement('button');
      tab.className = 'upd-tab-btn';
      expect(getHoverEnterStrategy(tab).scale).toBe(1);

      const infoItem = document.createElement('div');
      infoItem.className = 'info-item';
      infoItem.style.setProperty('--type-color', '#ff0000');
      const infoRes = getHoverEnterStrategy(infoItem);
      expect(infoRes.scale).toBe(1.02);
    });

    it('returns empty object when no strategy matches', () => {
      const plain = document.createElement('div');
      expect(getHoverEnterStrategy(plain)).toEqual({});
    });
  });

  describe('getHoverLeaveStrategy', () => {
    it('returns null borders if element has no visual borders', () => {
      const plain = document.createElement('div');
      expect(getHoverLeaveStrategy(plain)).toEqual({
        targetBorderColor: null,
        targetBoxShadow: null
      });
    });

    it('handles special cards leave borders', () => {
      const trainerCard = document.createElement('div');
      trainerCard.className = 'trainer-card';
      expect(getHoverLeaveStrategy(trainerCard).targetBorderColor).toBe('rgba(255, 255, 255, 0.1)');

      const invSelected = document.createElement('div');
      invSelected.className = 'inventory-item-card selected';
      expect(getHoverLeaveStrategy(invSelected).targetBorderColor).toBeTruthy();

      const invNormal = document.createElement('div');
      invNormal.className = 'inventory-item-card';
      expect(getHoverLeaveStrategy(invNormal).targetBorderColor).toBeTruthy();

      const quickRare = document.createElement('div');
      quickRare.className = 'quick-item-card tier-rare';
      expect(getHoverLeaveStrategy(quickRare).targetBorderColor).toBe('rgba(59, 130, 246, 0.55)');

      const quickEpic = document.createElement('div');
      quickEpic.className = 'quick-item-card tier-epic';
      expect(getHoverLeaveStrategy(quickEpic).targetBorderColor).toBe('rgba(168, 85, 247, 0.55)');

      const quickLegend = document.createElement('div');
      quickLegend.className = 'quick-item-card tier-legend';
      expect(getHoverLeaveStrategy(quickLegend).targetBorderColor).toBe('rgba(245, 158, 11, 0.65)');

      const trainerPending = document.createElement('div');
      trainerPending.className = 'trainer-card pending';
      expect(getHoverLeaveStrategy(trainerPending).targetBorderColor).toBe('rgba(157, 78, 221, 0.25)');
    });

    it('handles display cards leave borders (pokemon-display-card, shop-item-card, box-pokemon-card)', () => {
      const pokeCard = document.createElement('div');
      pokeCard.className = 'pokemon-display-card selected';
      expect(getHoverLeaveStrategy(pokeCard).targetBorderColor).toBeTruthy();

      const shopCard = document.createElement('div');
      shopCard.className = 'shop-item-card';
      expect(getHoverLeaveStrategy(shopCard).targetBorderColor).toBeTruthy();

      const boxCard = document.createElement('div');
      boxCard.className = 'box-pokemon-card';
      expect(getHoverLeaveStrategy(boxCard).targetBorderColor).toBeTruthy();
    });

    it('handles misc leave borders (hud-nav-btn, gym-card, egg-card, pokecenter-banner, hud-sq-btn, info-item)', () => {
      const navBtn = document.createElement('button');
      navBtn.className = 'hud-nav-btn';
      expect(getHoverLeaveStrategy(navBtn).targetBorderColor).toBe('rgba(255, 255, 255, 0.08)');

      const gymCard = document.createElement('div');
      gymCard.className = 'gym-card';
      expect(getHoverLeaveStrategy(gymCard).targetBorderColor).toBe('rgba(255, 255, 255, 0.08)');

      const eggReady = document.createElement('div');
      eggReady.className = 'egg-card is-ready';
      expect(getHoverLeaveStrategy(eggReady).targetBorderColor).toBe('rgba(34, 197, 94, 0.3)');

      const eggNotReady = document.createElement('div');
      eggNotReady.className = 'egg-card';
      expect(getHoverLeaveStrategy(eggNotReady).targetBorderColor).toBe('rgba(255, 255, 255, 0.08)');

      const pcBanner = document.createElement('div');
      pcBanner.className = 'pokecenter-banner';
      expect(getHoverLeaveStrategy(pcBanner).targetBorderColor).toBe('rgba(255, 0, 127, 1)');

      const sqActive = document.createElement('button');
      sqActive.className = 'hud-sq-btn active';
      expect(getHoverLeaveStrategy(sqActive).targetBorderColor).toBeTruthy();

      const sqInactive = document.createElement('button');
      sqInactive.className = 'hud-sq-btn';
      expect(getHoverLeaveStrategy(sqInactive).targetBorderColor).toBe('rgba(255, 255, 255, 0.1)');

      const infoItem = document.createElement('div');
      infoItem.className = 'info-item';
      expect(getHoverLeaveStrategy(infoItem).targetBorderColor).toBe('rgba(255, 255, 255, 0.05)');
    });
  });
});
