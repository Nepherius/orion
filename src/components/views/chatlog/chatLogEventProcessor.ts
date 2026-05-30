import { invoke } from '@tauri-apps/api/core';
import { useHuntStore } from '../../../store';
import {
  classifyFapHealingFromLogLines,
  getHealToolProfile,
  type FapHotClassifierState,
  type HealHotMode,
} from '../../../utils/fapHotClassifier';
import type { ParseResult } from './chatLogTypes';

interface ProcessRecentChatLinesParams {
  recentLines: string;
  processedEvents: Set<string>;
  fapHotState: FapHotClassifierState;
  debugDetail: (...args: Parameters<typeof console.log>) => void;
}

const normalizeLootItemName = (name: string): string =>
  name
    .replace(/\s*\((m|f)\)$/i, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

const parseTimestamp = (ts: string): number => {
  // Manually extract components to avoid Date(string) parsing inconsistencies
  const match = ts.match(/(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2}):(\d{2})/);
  if (match) {
    const [, y, mo, d, h, mi, s] = match.map(Number);
    return Date.UTC(y, mo - 1, d, h, mi, s);
  }
  return Date.now();
};

const createOccurrenceKeyer = () => {
  const occurrences = new Map<string, number>();

  return (baseKey: string): string => {
    const occurrence = occurrences.get(baseKey) ?? 0;
    occurrences.set(baseKey, occurrence + 1);
    return `${baseKey}#${occurrence}`;
  };
};

export async function processRecentChatLines({
  recentLines,
  processedEvents,
  fapHotState,
  debugDetail,
}: ProcessRecentChatLinesParams): Promise<FapHotClassifierState> {
  const result: ParseResult = await invoke('parse_chat_log', { content: recentLines });
  const events = result.loot_events;
  const damageEvents = result.damage_events;
  const combatEvents = result.combat_events;
  const healingEvents = result.healing_events;
  const damageTakenEvents = result.damage_taken_events;
  const skillGains = result.skill_gains;

  // Get fresh state and active session for loadout lookup
  const currentState = useHuntStore.getState();
  let activeSession = currentState.getActiveSession();

  // Determine heal window duration based on active session's loadout heal tool
  let healWindowDurationMs: number | undefined;
  let healHotMode: HealHotMode | undefined;
  if (activeSession?.loadoutId) {
    const sessionLoadout = currentState.loadouts.find((l) => l.id === activeSession?.loadoutId);
    if (sessionLoadout?.medicalTool) {
      const healToolProfile = getHealToolProfile(sessionLoadout.medicalTool);
      healWindowDurationMs = healToolProfile.windowDurationMs;
      healHotMode = healToolProfile.hotMode;
      debugDetail(
        `[ChatLogMonitor] Heal tool: ${sessionLoadout.medicalTool}, window: ${healWindowDurationMs}ms, mode: ${healHotMode}`
      );
    }
  }

  const fapClassifiedHealing = classifyFapHealingFromLogLines(
    recentLines,
    fapHotState,
    healWindowDurationMs,
    healHotMode
  );

  debugDetail(
    `[ChatLogMonitor] Parsed: ${events.length} loot, ${damageEvents.length} damage, ${combatEvents.length} combat, ${healingEvents.length} healing, ${damageTakenEvents.length} damage taken, ${skillGains.length} skills`
  );
  const storeSettings = currentState.settings;
  debugDetail('[ChatLogMonitor] Current active session:', activeSession?.id);
  const eventKeyFor = createOccurrenceKeyer();

  // If there's no active session but we have events and auto-start is enabled, auto-create one
  const hasAnyEvents =
    events.length > 0 ||
    damageEvents.length > 0 ||
    combatEvents.length > 0 ||
    healingEvents.length > 0 ||
    damageTakenEvents.length > 0;
  if (!activeSession && storeSettings.autoStartSession && hasAnyEvents) {
    const hasSystemPickup = events.some((e) => !e.player || e.player.trim() === '');
    if (hasSystemPickup || damageEvents.length > 0) {
      const primaryLoadout = useHuntStore.getState().getPrimaryLoadout();

      // Cancel auto-start if no primary loadout is set
      if (!primaryLoadout) {
        console.warn(
          '[ChatLogMonitor] Auto-start cancelled: No primary loadout set. User must create and activate a loadout first.'
        );
        return fapClassifiedHealing.nextState;
      }

      const storeActions = useHuntStore.getState();
      debugDetail('[ChatLogMonitor] No active session - creating auto session to capture events');
      storeActions.createSession({
        name: 'Auto Session (Chat Monitor)',
        weapon: primaryLoadout.name || 'No Loadout',
        loadoutId: primaryLoadout.id,
        armor: '',
        creature: 'Unknown',
        location: 'Auto',
        startTime: Date.now(),
        status: 'active',
        ammoCost: 0,
        weaponDecay: 0,
        healingCost: 0,
        otherCosts: 0,
        notes: 'Automatically created to capture events from chat.log',
      });

      const state = useHuntStore.getState();
      const newId = state.sessions[0]?.id;
      debugDetail(
        '[ChatLogMonitor] New session ID:',
        newId,
        'Total sessions:',
        state.sessions.length
      );
      if (newId) {
        state.startSession(newId);
        activeSession = state.getActiveSession();
        debugDetail(
          '[ChatLogMonitor] Auto session created and started:',
          newId,
          'Status:',
          activeSession?.status
        );
      } else {
        console.error('[ChatLogMonitor] Failed to create session - no ID returned');
      }
    }
  }

  if (activeSession && events.length > 0) {
    debugDetail('[ChatLogMonitor] Processing loot events for session:', activeSession.id);
    const recentEvents = events.slice(-10);
    const storeActions = useHuntStore.getState();
    const storeState = useHuntStore.getState();

    recentEvents.forEach((evt) => {
      const isSystemPickup = !evt.player || evt.player.trim() === '';

      if (isSystemPickup) {
        const eventKey = eventKeyFor(`loot:${evt.timestamp}:${evt.creature}:${evt.value}`);

        if (!processedEvents.has(eventKey)) {
          const ignoreList = storeSettings.ignoreListItems || [];
          if (ignoreList.includes(evt.creature)) {
            debugDetail('[ChatLogMonitor] Skipping ignored item:', evt.creature);
            processedEvents.add(eventKey);
            return;
          }

          debugDetail('[ChatLogMonitor] Adding system pickup:', evt.creature, evt.value);

          const customItem = storeState.itemDatabase.find(
            (item) => normalizeLootItemName(item.name) === normalizeLootItemName(evt.creature)
          );
          const markup = customItem?.defaultMarkup || storeSettings.defaultMarkup || 100;
          const fixedValue = customItem?.defaultFixedValue || 0;
          const totalValue = fixedValue > 0 ? evt.value + fixedValue : evt.value * (markup / 100);

          void storeActions.addLoot(activeSession.id, {
            name: evt.creature,
            quantity: 1,
            value: evt.value,
            markup: markup,
            fixedValue,
            totalValue,
            timestamp: parseTimestamp(evt.timestamp),
          });

          processedEvents.add(eventKey);
        } else {
          debugDetail('[ChatLogMonitor] Skipping duplicate loot event');
        }
      } else if (storeSettings.avatarName && evt.player.includes(storeSettings.avatarName)) {
        const eventKey = eventKeyFor(
          `global:${evt.timestamp}:${evt.creature}:${evt.value}:${evt.is_hof}`
        );

        if (!processedEvents.has(eventKey)) {
          debugDetail('[ChatLogMonitor] Adding global:', evt.creature, evt.value);
          storeActions.addGlobal(activeSession.id, {
            creature: evt.creature,
            value: evt.value,
            isHoF: evt.is_hof,
            timestamp: parseTimestamp(evt.timestamp),
          });

          processedEvents.add(eventKey);
        } else {
          debugDetail('[ChatLogMonitor] Skipping duplicate global event');
        }
      }
    });
  }

  if (activeSession && damageEvents.length > 0) {
    debugDetail(
      '[ChatLogMonitor] Processing damage events:',
      damageEvents.length,
      'for session:',
      activeSession.id
    );
    const storeActions = useHuntStore.getState();
    let addedCount = 0;
    damageEvents.forEach((dmg) => {
      const eventKey = eventKeyFor(`dmg:${dmg.timestamp}:${dmg.damage}:${dmg.is_critical}`);
      if (!processedEvents.has(eventKey)) {
        debugDetail(
          '[ChatLogMonitor] Adding damage event:',
          dmg.damage,
          'damage, critical:',
          dmg.is_critical
        );
        const timestampMs = parseTimestamp(dmg.timestamp);
        storeActions.addDamageEvent(activeSession.id, dmg.damage, dmg.is_critical, timestampMs);
        const combatEventType = dmg.is_critical ? 'crit' : 'hit';
        storeActions.addCombatEvent(activeSession.id, combatEventType, timestampMs);
        processedEvents.add(eventKey);
        addedCount++;
      } else {
        debugDetail('[ChatLogMonitor] Skipping duplicate damage event');
      }
    });
    debugDetail('[ChatLogMonitor] Added', addedCount, 'new damage events');
  }

  if (activeSession && combatEvents.length > 0) {
    debugDetail('[ChatLogMonitor] Processing combat events:', combatEvents.length);
    const storeActions = useHuntStore.getState();
    let addedCount = 0;
    combatEvents.forEach((combat) => {
      const eventKey = eventKeyFor(`combat:${combat.timestamp}:${combat.event_type}`);
      if (!processedEvents.has(eventKey)) {
        debugDetail('[ChatLogMonitor] Adding combat event:', combat.event_type);
        storeActions.addCombatEvent(
          activeSession.id,
          combat.event_type,
          parseTimestamp(combat.timestamp)
        );
        processedEvents.add(eventKey);
        addedCount++;
      }
    });
    debugDetail('[ChatLogMonitor] Added', addedCount, 'new combat events');
  }

  if (activeSession && healingEvents.length > 0) {
    const storeActions = useHuntStore.getState();
    const classifiedHealingEvents = fapClassifiedHealing.healingEvents;

    debugDetail('[ChatLogMonitor] Processing healing events:', classifiedHealingEvents.length);

    let addedCount = 0;
    classifiedHealingEvents.forEach((heal) => {
      const eventKey = eventKeyFor(`heal:${heal.timestamp}:${heal.amount}`);
      if (!processedEvents.has(eventKey)) {
        debugDetail(
          '[ChatLogMonitor] Adding healing event:',
          heal.amount,
          'directUse:',
          heal.isDirectUse
        );
        storeActions.addHealingEvent(
          activeSession.id,
          heal.amount,
          parseTimestamp(heal.timestamp),
          {
            applyCost: heal.isDirectUse,
            isDirectUse: heal.isDirectUse,
          }
        );
        processedEvents.add(eventKey);
        addedCount++;
      }
    });
    debugDetail('[ChatLogMonitor] Added', addedCount, 'new healing events');
  }

  if (activeSession && damageTakenEvents.length > 0) {
    debugDetail('[ChatLogMonitor] Processing damage taken events:', damageTakenEvents.length);
    const storeActions = useHuntStore.getState();
    let addedCount = 0;
    damageTakenEvents.forEach((dmgTaken) => {
      const eventKey = eventKeyFor(
        `dmgtaken:${dmgTaken.timestamp}:${dmgTaken.damage}:${dmgTaken.is_critical}`
      );
      if (!processedEvents.has(eventKey)) {
        debugDetail('[ChatLogMonitor] Adding damage taken event:', dmgTaken.damage);
        storeActions.addDamageTakenEvent(
          activeSession.id,
          dmgTaken.damage,
          dmgTaken.is_critical,
          parseTimestamp(dmgTaken.timestamp)
        );
        processedEvents.add(eventKey);
        addedCount++;
      }
    });
    debugDetail('[ChatLogMonitor] Added', addedCount, 'new damage taken events');
  }

  if (activeSession && skillGains.length > 0) {
    debugDetail('[ChatLogMonitor] Processing skill gains:', skillGains.length);
    const storeActions = useHuntStore.getState();
    let addedCount = 0;
    skillGains.forEach((skill) => {
      const eventKey = eventKeyFor(`skill:${skill.timestamp}:${skill.skill_name}:${skill.gain}`);
      if (!processedEvents.has(eventKey)) {
        debugDetail('[ChatLogMonitor] Adding skill gain:', skill.skill_name, skill.gain);
        storeActions.addSkillGain(activeSession.id, {
          skillName: skill.skill_name,
          gainAmount: skill.gain,
          timestamp: parseTimestamp(skill.timestamp),
        });
        processedEvents.add(eventKey);
        addedCount++;
      }
    });
    debugDetail('[ChatLogMonitor] Added', addedCount, 'new skill gains');
  }

  return fapClassifiedHealing.nextState;
}
