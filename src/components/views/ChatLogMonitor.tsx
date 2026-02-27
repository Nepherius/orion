import { useState, useEffect, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import { useHuntStore } from '../../store';

interface LootEvent {
  timestamp: string;
  player: string;
  creature: string;
  value: number;
  is_hof: boolean;
}

interface DamageEvent {
  timestamp: string;
  damage: number;
  is_critical: boolean;
}

interface CombatEvent {
  timestamp: string;
  event_type: 'miss' | 'dodge' | 'evade' | 'hit' | 'crit';
}

interface HealingEvent {
  timestamp: string;
  amount: number;
}

interface DamageTakenEvent {
  timestamp: string;
  damage: number;
  is_critical: boolean;
}

interface SkillGain {
  timestamp: string;
  skill_name: string;
  amount: number;
}

interface ParseResult {
  loot_events: LootEvent[];
  damage_events: DamageEvent[];
  combat_events: CombatEvent[];
  healing_events: HealingEvent[];
  damage_taken_events: DamageTakenEvent[];
  skill_gains: SkillGain[];
}

/**
 * Chat Log Monitor - Logic Only
 * Handles event listening and auto-start functionality
 * UI is in ChatLogMonitorPanel.tsx
 */
export function ChatLogMonitor() {
  const [listenerReady, setListenerReady] = useState(false);
  // Track processed event timestamps to avoid duplicates - use ref since we don't need re-renders
  const processedEventsRef = useRef<Set<string>>(new Set());
  const detectionInProgress = useRef(false);

  // Use more specific selectors to ensure proper reactivity
  const avatarName = useHuntStore((state) => state.settings.avatarName);
  const chatLogPath = useHuntStore((state) => state.settings.chatLogPath);
  const autoStartSession = useHuntStore((state) => state.settings.autoStartSession);
  const updateSettings = useHuntStore((state) => state.updateSettings);
  const activeSession = useHuntStore((state) => state.getActiveSession());

  console.log('[ChatLogMonitor] Component render:', {
    avatarName,
    chatLogPath,
    autoStartSession,
    listenerReady
  });

  const getIsWatching = async () => {
    try {
      const watching: boolean = await invoke('is_watching');
      return watching;
    } catch (error) {
      console.error('[ChatLogMonitor] Error checking watch status:', error);
      return false;
    }
  };

  const detectAndSetChatLogPath = async () => {
    if (detectionInProgress.current) {
      console.log('[ChatLogMonitor] Detection already in progress, skipping...');
      return;
    }
    
    detectionInProgress.current = true;
    try {
      console.log('[ChatLogMonitor] Attempting to detect chat log path...');
      const detected: string | null = await invoke('detect_chat_log_path');
      if (detected) {
        console.log('[ChatLogMonitor] Chat log detected:', detected);
        updateSettings({ chatLogPath: detected });
      } else {
        console.log('[ChatLogMonitor] No chat log path detected');
      }
    } catch (error) {
      console.error('[ChatLogMonitor] Error detecting chat log:', error);
    } finally {
      detectionInProgress.current = false;
    }
  };

  const startWatching = async () => {
    const pathToWatch = chatLogPath;
    console.log('[ChatLogMonitor] startWatching called. pathToWatch:', pathToWatch);
    if (!pathToWatch) {
      console.warn('[ChatLogMonitor] No path to watch, returning');
      return;
    }

    try {
      console.log('[ChatLogMonitor] Invoking start_watching_file with path:', pathToWatch);
      await invoke('start_watching_file', { path: pathToWatch });
      console.log('[ChatLogMonitor] start_watching_file succeeded');
    } catch (error) {
      console.error('Error starting watch:', error);
    }
  };

  const stopWatching = async () => {
    try {
      console.log('[ChatLogMonitor] stopWatching called');
      await invoke('stop_watching_file');
      console.log('[ChatLogMonitor] stop_watching_file succeeded');
    } catch (error) {
      console.error('[ChatLogMonitor] Error stopping watch:', error);
    }
  };

  // Auto-detect chat log path when avatar name is set but chat log path is empty
  // Wait for listener to be ready before attempting detection
  useEffect(() => {
    console.log('[ChatLogMonitor] ==== Detection Effect Fired ====');
    console.log('[ChatLogMonitor] Detection effect check:', {
      avatarName,
      avatarNameLength: avatarName?.length,
      avatarNameTruthy: !!avatarName,
      chatLogPath,
      chatLogPathLength: chatLogPath?.length,
      chatLogPathFalsy: !chatLogPath,
      listenerReady,
      detectionInProgress: detectionInProgress.current
    });
    
    if (avatarName && !chatLogPath && listenerReady && !detectionInProgress.current) {
      console.log('[ChatLogMonitor] All conditions met - starting detection...');
      detectAndSetChatLogPath();
    } else {
      console.log('[ChatLogMonitor] Conditions NOT met:');
      if (!avatarName) console.log('   - No avatar name');
      if (chatLogPath) console.log('   - Chat log path already set:', chatLogPath);
      if (!listenerReady) console.log('   - Listener not ready yet');
      if (detectionInProgress.current) console.log('   - Detection already in progress');
    }
    console.log('[ChatLogMonitor] ==== Detection Effect Complete ====');
  }, [avatarName, chatLogPath, listenerReady]);

  // Auto-start monitoring based on settings and session status
  // IMPORTANT: Only runs after event listener is ready to avoid race condition
  useEffect(() => {
    console.log('[ChatLogMonitor] Auto-start effect triggered');
    console.log('[ChatLogMonitor] - listenerReady:', listenerReady);
    console.log('[ChatLogMonitor] - activeSession:', activeSession?.id, 'status:', activeSession?.status);
    console.log('[ChatLogMonitor] - chatLogPath:', chatLogPath);
    console.log('[ChatLogMonitor] - autoStartSession:', autoStartSession);
    
    if (!listenerReady) {
      console.log('[ChatLogMonitor] Waiting for event listener to be ready...');
      return;
    }
    
    if (!chatLogPath) {
      console.log('[ChatLogMonitor] No chat log path set');
      return;
    }

    const ensureWatching = async () => {
      const watching = await getIsWatching();
      const currentActiveLoadout = useHuntStore.getState().getActiveLoadout();

      if (autoStartSession) {
        // Check if there's an active loadout before auto-starting
        if (!currentActiveLoadout) {
          console.log('[ChatLogMonitor] Auto-start disabled: No active loadout set');
          if (watching) {
            console.log('[ChatLogMonitor] Stopping watcher due to missing loadout');
            stopWatching();
          }
          return;
        }
        
        // Always watch when auto-start is enabled
        if (!watching) {
          console.log('[ChatLogMonitor] Auto-start enabled, starting watcher');
          startWatching();
        } else {
          console.log('[ChatLogMonitor] Auto-start enabled, watcher already running');
        }
        return;
      }

      // Auto-start disabled: only watch while an active session is running
      if (activeSession && activeSession.status === 'active') {
        if (!watching) {
          console.log('[ChatLogMonitor] Active session detected, starting watcher');
          // Reset processed event timestamps for new session
          processedEventsRef.current = new Set();
          startWatching();
        } else {
          console.log('[ChatLogMonitor] Active session detected, watcher already running');
        }
      } else if (watching) {
        console.log('[ChatLogMonitor] No active session and auto-start disabled, stopping watcher');
        stopWatching();
      } else {
        console.log('[ChatLogMonitor] No active session and watcher is already stopped');
      }
    };

    ensureWatching();
  }, [
    listenerReady,
    activeSession?.id,
    activeSession?.status,
    chatLogPath,
    autoStartSession,
  ]);

  // Setup event listener on mount FIRST - before any auto-start can happen
  useEffect(() => {
    console.log('[ChatLogMonitor] Setting up event listener on mount');
    let unlistenFn: UnlistenFn | null = null;
    let isMounted = true;

    const setupListener = async () => {
      try {
        console.log('[ChatLogMonitor] Starting setupListener...');
        
        // Listen for file updates - await to ensure it's registered before we continue
        console.log('[ChatLogMonitor] Registering event listener for chat-log-updated...');
        unlistenFn = await listen<string>('chat-log-updated', async (event) => {
          console.log('[ChatLogMonitor] RECEIVED chat-log-updated EVENT');
      try {
        const content = event.payload;
        console.debug('[ChatLogMonitor] File updated, parsing content... Length:', content.length);
        console.debug('[ChatLogMonitor] Content preview:', JSON.stringify(content.substring(0, 200)));
        const result: ParseResult = await invoke('parse_chat_log', { content });
        const events = result.loot_events;
        const damageEvents = result.damage_events;
        const combatEvents = result.combat_events;
        const healingEvents = result.healing_events;
        const damageTakenEvents = result.damage_taken_events;
        const skillGains = result.skill_gains;

        console.debug(`[ChatLogMonitor] Parsed: ${events.length} loot, ${damageEvents.length} damage, ${combatEvents.length} combat, ${healingEvents.length} healing, ${damageTakenEvents.length} damage taken, ${skillGains.length} skills`);

        // Process new events - get fresh state each time
        let activeSession = useHuntStore.getState().getActiveSession();
        const storeSettings = useHuntStore.getState().settings;
        console.debug('[ChatLogMonitor] Current active session:', activeSession?.id);
        
        // If there's no active session but we have events (loot, damage, combat, healing, damage taken) and auto-start is enabled, auto-create one
        const hasAnyEvents = events.length > 0 || damageEvents.length > 0 || combatEvents.length > 0 || healingEvents.length > 0 || damageTakenEvents.length > 0;
        if (!activeSession && storeSettings.autoStartSession && hasAnyEvents) {
          const hasSystemPickup = events.some((e) => !e.player || e.player.trim() === '');
          if (hasSystemPickup || damageEvents.length > 0) {
            const activeLoadout = useHuntStore.getState().getActiveLoadout();
            
            // Cancel auto-start if no active loadout is set
            if (!activeLoadout) {
              console.warn('[ChatLogMonitor] Auto-start cancelled: No active loadout set. User must create and activate a loadout first.');
              return;
            }
            
            const storeActions = useHuntStore.getState();
            console.debug('[ChatLogMonitor] No active session — creating auto session to capture events');
            storeActions.createSession({
              name: 'Auto Session (Chat Monitor)',
              weapon: activeLoadout.name || 'No Loadout',
              loadoutId: activeLoadout.id,
              armor: '',
              location: 'Auto',
              startTime: Date.now(),
              status: 'active',
              ammoCost: 0,
              repairCost: 0,
              armorDecay: 0,
              healingCost: 0,
              otherCosts: 0,
              notes: 'Automatically created to capture events from chat.log',
            });
            // Get the newly created session from store state
            const state = useHuntStore.getState();
            const newId = state.sessions[0]?.id;
            console.debug('[ChatLogMonitor] New session ID:', newId, 'Total sessions:', state.sessions.length);
            if (newId) {
              state.startSession(newId);
              activeSession = state.getActiveSession();
              console.debug('[ChatLogMonitor] Auto session created and started:', newId, 'Status:', activeSession?.status);
            } else {
              console.error('[ChatLogMonitor] Failed to create session - no ID returned');
            }
          }
        }

        if (activeSession && events.length > 0) {
          console.debug('[ChatLogMonitor] Processing loot events for session:', activeSession.id);
          // Get the last few events (avoid duplicates)
          const recentEvents = events.slice(-10);
          const storeActions = useHuntStore.getState();
          const storeState = useHuntStore.getState();

          recentEvents.forEach((evt) => {
            // Determine if this is a system pickup (no player) or a global (has player)
            const isSystemPickup = !evt.player || evt.player.trim() === '';
            
            if (isSystemPickup) {
              // System pickups should be added as loot items
              console.debug('[ChatLogMonitor] Adding system pickup:', evt.creature, evt.value);
              
              // Check if item exists in database and use its markup
              const customItem = storeState.itemDatabase.find(
                (item) => item.name.toLowerCase() === evt.creature.toLowerCase()
              );
              const markup = customItem?.defaultMarkup || storeSettings.defaultMarkup || 100;
              
              storeActions.addLoot(activeSession.id, {
                name: evt.creature,
                quantity: 1,
                value: evt.value,
                markup: markup,
                totalValue: evt.value * (markup / 100),
              });
            } else if (storeSettings.avatarName && evt.player.includes(storeSettings.avatarName)) {
              // Only add globals if avatar name is set AND it matches the player
              console.debug('[ChatLogMonitor] Adding global:', evt.creature, evt.value);
              storeActions.addGlobal(activeSession.id, {
                creature: evt.creature,
                value: evt.value,
                isHoF: evt.is_hof,
              });
            }
          });
        }
          
        // Process damage events (independent of loot events)
        if (activeSession && damageEvents.length > 0) {
          console.debug('[ChatLogMonitor] Processing damage events:', damageEvents.length, 'for session:', activeSession.id);
          const storeActions = useHuntStore.getState();
          let addedCount = 0;
          const recentDamage = damageEvents.slice(-20);
          recentDamage.forEach((dmg) => {
            const eventKey = `dmg:${dmg.timestamp}:${dmg.damage}:${dmg.is_critical}`;
            if (!processedEventsRef.current.has(eventKey)) {
              console.debug('[ChatLogMonitor] Adding damage event:', dmg.damage, 'damage, critical:', dmg.is_critical);
              storeActions.addDamageEvent(activeSession.id, dmg.damage, dmg.is_critical);
              processedEventsRef.current.add(eventKey);
              addedCount++;
            } else {
              console.debug('[ChatLogMonitor] Skipping duplicate damage event');
            }
          });
          console.debug('[ChatLogMonitor] Added', addedCount, 'new damage events');
        }

        // Process combat events (miss, dodge, evade, hit, crit)
        if (activeSession && combatEvents.length > 0) {
          console.debug('[ChatLogMonitor] Processing combat events:', combatEvents.length);
          const storeActions = useHuntStore.getState();
          let addedCount = 0;
          const recentCombat = combatEvents.slice(-20);
          recentCombat.forEach((combat) => {
            const eventKey = `combat:${combat.timestamp}:${combat.event_type}`;
            if (!processedEventsRef.current.has(eventKey)) {
              console.debug('[ChatLogMonitor] Adding combat event:', combat.event_type);
              storeActions.addCombatEvent(activeSession.id, combat.event_type);
              processedEventsRef.current.add(eventKey);
              addedCount++;
            }
          });
          console.debug('[ChatLogMonitor] Added', addedCount, 'new combat events');
        }

        // Process healing events
        if (activeSession && healingEvents.length > 0) {
          console.debug('[ChatLogMonitor] Processing healing events:', healingEvents.length);
          const storeActions = useHuntStore.getState();
          let addedCount = 0;
          const recentHealing = healingEvents.slice(-20);
          recentHealing.forEach((heal) => {
            const eventKey = `heal:${heal.timestamp}:${heal.amount}`;
            if (!processedEventsRef.current.has(eventKey)) {
              console.debug('[ChatLogMonitor] Adding healing event:', heal.amount);
              storeActions.addHealingEvent(activeSession.id, heal.amount);
              processedEventsRef.current.add(eventKey);
              addedCount++;
            }
          });
          console.debug('[ChatLogMonitor] Added', addedCount, 'new healing events');
        }

        // Process damage taken events
        if (activeSession && damageTakenEvents.length > 0) {
          console.debug('[ChatLogMonitor] Processing damage taken events:', damageTakenEvents.length);
          const storeActions = useHuntStore.getState();
          let addedCount = 0;
          const recentDamageTaken = damageTakenEvents.slice(-20);
          recentDamageTaken.forEach((dmgTaken) => {
            const eventKey = `dmgtaken:${dmgTaken.timestamp}:${dmgTaken.damage}:${dmgTaken.is_critical}`;
            if (!processedEventsRef.current.has(eventKey)) {
              console.debug('[ChatLogMonitor] Adding damage taken event:', dmgTaken.damage);
              storeActions.addDamageTakenEvent(activeSession.id, dmgTaken.damage, dmgTaken.is_critical);
              processedEventsRef.current.add(eventKey);
              addedCount++;
            }
          });
          console.debug('[ChatLogMonitor] Added', addedCount, 'new damage taken events');
        }

        // Process skill gains (we could add these to session later if needed)
        if (activeSession && skillGains.length > 0) {
          console.debug('Processing skill gains:', skillGains.length);
          // Skill gains could be tracked separately in the future
        }
      } catch (error) {
        console.error('[ChatLogMonitor] Error parsing chat log:', error);
      }
        });

        // Check again if component is still mounted before updating state
        if (!isMounted) {
          console.log('[ChatLogMonitor] Component unmounted before setState, cleaning up listener');
          if (unlistenFn) unlistenFn();
          return;
        }

        console.log('[ChatLogMonitor] Event listener registered successfully');
        console.log('[ChatLogMonitor] Setting listenerReady to true');
        setListenerReady(true);
        console.log('[ChatLogMonitor] listenerReady state updated');
      } catch (error) {
        console.error('[ChatLogMonitor] Failed to setup event listener:', error);
        console.error('[ChatLogMonitor] Error details:', JSON.stringify(error, null, 2));
      }
    };

    console.log('[ChatLogMonitor] Calling setupListener()...');
    setupListener();
    console.log('[ChatLogMonitor] setupListener() called (async, will complete later)');


    return () => {
      console.log('[ChatLogMonitor] Cleaning up event listener');
      isMounted = false;
      if (unlistenFn) {
        console.log('[ChatLogMonitor] Calling unlisten function');
        unlistenFn();
      }
      setListenerReady(false);
      console.log('[ChatLogMonitor] Cleanup complete');
    };
  }, []); // Empty dependency array - set up listener only once on mount

  // This component has no UI - it only handles logic
  // UI is in ChatLogMonitorPanel.tsx
  return null;
}
