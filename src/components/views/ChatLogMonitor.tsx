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
  event_type:
    | 'hit'
    | 'crit'
    | 'player_miss'
    | 'player_dodge'
    | 'player_evade'
    | 'enemy_miss'
    | 'enemy_evade';
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
  gain: number;
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
  const pendingPayloadRef = useRef('');
  const coalesceTimerRef = useRef<number | null>(null);
  const parseInProgressRef = useRef(false);
  const reparseQueuedRef = useRef(false);

  const parseTimestamp = (ts: string): number => {
    // Manually extract components to avoid Date(string) parsing inconsistencies
    const match = ts.match(/(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2}):(\d{2})/);
    if (match) {
      const [, y, mo, d, h, mi, s] = match.map(Number);
      return new Date(y, mo - 1, d, h, mi, s).getTime();
    }
    return Date.now();
  };

  const debugLog = (..._args: unknown[]) => {
    // Development debug logs removed
  };

  const debugDetail = (..._args: unknown[]) => {
    // Development debug logs removed
  };

  // Use more specific selectors to ensure proper reactivity
  const avatarName = useHuntStore((state) => state.settings.avatarName);
  const chatLogPath = useHuntStore((state) => state.settings.chatLogPath);
  const autoStartSession = useHuntStore((state) => state.settings.autoStartSession);
  const updateSettings = useHuntStore((state) => state.updateSettings);
  const activeSession = useHuntStore(
    (state) => state.sessions.find((s) => s.id === state.activeSessionId) || null
  );

  debugLog('[ChatLogMonitor] Component render:', {
    avatarName,
    chatLogPath,
    autoStartSession,
    listenerReady,
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
      debugLog('[ChatLogMonitor] Detection already in progress, skipping...');
      return;
    }

    detectionInProgress.current = true;
    try {
      debugLog('[ChatLogMonitor] Attempting to detect chat log path...');
      const detected: string | null = await invoke('detect_chat_log_path');
      if (detected) {
        debugLog('[ChatLogMonitor] Chat log detected:', detected);
        updateSettings({ chatLogPath: detected });
      } else {
        debugLog('[ChatLogMonitor] No chat log path detected');
      }
    } catch (error) {
      console.error('[ChatLogMonitor] Error detecting chat log:', error);
    } finally {
      detectionInProgress.current = false;
    }
  };

  const startWatching = async () => {
    const pathToWatch = chatLogPath;
    debugLog('[ChatLogMonitor] startWatching called. pathToWatch:', pathToWatch);
    if (!pathToWatch) {
      console.warn('[ChatLogMonitor] No path to watch, returning');
      return;
    }

    try {
      debugLog('[ChatLogMonitor] Invoking start_watching_file with path:', pathToWatch);
      await invoke('start_watching_file', { path: pathToWatch });
      debugLog('[ChatLogMonitor] start_watching_file succeeded');
    } catch (error) {
      console.error('Error starting watch:', error);
    }
  };

  const stopWatching = async () => {
    try {
      debugLog('[ChatLogMonitor] stopWatching called');
      await invoke('stop_watching_file');
      debugLog('[ChatLogMonitor] stop_watching_file succeeded');
    } catch (error) {
      console.error('[ChatLogMonitor] Error stopping watch:', error);
    }
  };

  // Auto-detect chat log path when avatar name is set but chat log path is empty
  // Wait for listener to be ready before attempting detection
  useEffect(() => {
    debugLog('[ChatLogMonitor] ==== Detection Effect Fired ====');
    debugLog('[ChatLogMonitor] Detection effect check:', {
      avatarName,
      avatarNameLength: avatarName?.length,
      avatarNameTruthy: !!avatarName,
      chatLogPath,
      chatLogPathLength: chatLogPath?.length,
      chatLogPathFalsy: !chatLogPath,
      listenerReady,
      detectionInProgress: detectionInProgress.current,
    });

    if (avatarName && !chatLogPath && listenerReady && !detectionInProgress.current) {
      debugLog('[ChatLogMonitor] All conditions met - starting detection...');
      detectAndSetChatLogPath();
    } else {
      debugLog('[ChatLogMonitor] Conditions NOT met:');
      if (!avatarName) debugLog('   - No avatar name');
      if (chatLogPath) debugLog('   - Chat log path already set:', chatLogPath);
      if (!listenerReady) debugLog('   - Listener not ready yet');
      if (detectionInProgress.current) debugLog('   - Detection already in progress');
    }
    debugLog('[ChatLogMonitor] ==== Detection Effect Complete ====');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [avatarName, chatLogPath, listenerReady]);

  // Auto-start monitoring based on settings and session status
  // IMPORTANT: Only runs after event listener is ready to avoid race condition
  useEffect(() => {
    debugLog('[ChatLogMonitor] Auto-start effect triggered');
    debugLog('[ChatLogMonitor] - listenerReady:', listenerReady);
    debugLog(
      '[ChatLogMonitor] - activeSession:',
      activeSession?.id,
      'status:',
      activeSession?.status
    );
    debugLog('[ChatLogMonitor] - chatLogPath:', chatLogPath);
    debugLog('[ChatLogMonitor] - autoStartSession:', autoStartSession);

    if (!listenerReady) {
      debugLog('[ChatLogMonitor] Waiting for event listener to be ready...');
      return;
    }

    if (!chatLogPath) {
      debugLog('[ChatLogMonitor] No chat log path set');
      return;
    }

    const ensureWatching = async () => {
      const watching = await getIsWatching();
      const currentPrimaryLoadout = useHuntStore.getState().getPrimaryLoadout();

      if (autoStartSession) {
        // If we have an active session that is paused, we should NOT be watching
        if (activeSession && activeSession.status === 'paused') {
          if (watching) {
            debugLog('[ChatLogMonitor] Session paused, stopping watcher (auto-start enabled)');
            stopWatching();
          }
          return;
        }

        // Check if there's a primary loadout before auto-starting
        if (!currentPrimaryLoadout) {
          debugLog('[ChatLogMonitor] Auto-start disabled: No primary loadout set');
          if (watching) {
            debugLog('[ChatLogMonitor] Stopping watcher due to missing loadout');
            stopWatching();
          }
          return;
        }

        // Always watch when auto-start is enabled and session isn't paused
        if (!watching) {
          debugLog('[ChatLogMonitor] Auto-start enabled, starting watcher');
          startWatching();
        } else {
          debugLog('[ChatLogMonitor] Auto-start enabled, watcher already running');
        }
        return;
      }

      // Auto-start disabled: only watch while an active session is running
      if (activeSession && activeSession.status === 'active') {
        if (!watching) {
          debugLog('[ChatLogMonitor] Active session detected, starting watcher');
          // Reset processed event timestamps for new session
          processedEventsRef.current = new Set();
          startWatching();
        } else {
          debugLog('[ChatLogMonitor] Active session detected, watcher already running');
        }
      } else if (watching) {
        debugLog(
          '[ChatLogMonitor] No active session (or paused) and auto-start disabled, stopping watcher'
        );
        stopWatching();
      } else {
        debugLog('[ChatLogMonitor] No active session and watcher is already stopped');
      }
    };

    ensureWatching();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listenerReady, activeSession?.id, activeSession?.status, chatLogPath, autoStartSession]);

  // Setup event listener on mount FIRST - before any auto-start can happen
  useEffect(() => {
    debugLog('[ChatLogMonitor] Setting up event listener on mount');
    let unlistenFn: UnlistenFn | null = null;
    let isMounted = true;

    const setupListener = async () => {
      try {
        debugLog('[ChatLogMonitor] Starting setupListener...');

        const parseBufferedPayload = async () => {
          if (parseInProgressRef.current) {
            reparseQueuedRef.current = true;
            return;
          }

          const content = pendingPayloadRef.current;
          if (!content) {
            return;
          }

          pendingPayloadRef.current = '';
          parseInProgressRef.current = true;

          try {
            debugDetail('[ChatLogMonitor] Parsing coalesced content. Length:', content.length);
            const result: ParseResult = await invoke('parse_chat_log', { content });
            const events = result.loot_events;
            const damageEvents = result.damage_events;
            const combatEvents = result.combat_events;
            const healingEvents = result.healing_events;
            const damageTakenEvents = result.damage_taken_events;
            const skillGains = result.skill_gains;

            debugDetail(
              `[ChatLogMonitor] Parsed: ${events.length} loot, ${damageEvents.length} damage, ${combatEvents.length} combat, ${healingEvents.length} healing, ${damageTakenEvents.length} damage taken, ${skillGains.length} skills`
            );

            // Process new events - get fresh state each time
            let activeSession = useHuntStore.getState().getActiveSession();
            const storeSettings = useHuntStore.getState().settings;
            debugDetail('[ChatLogMonitor] Current active session:', activeSession?.id);

            // If there's no active session but we have events (loot, damage, combat, healing, damage taken) and auto-start is enabled, auto-create one
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
                  return;
                }

                const storeActions = useHuntStore.getState();
                debugDetail(
                  '[ChatLogMonitor] No active session — creating auto session to capture events'
                );
                storeActions.createSession({
                  name: 'Auto Session (Chat Monitor)',
                  weapon: primaryLoadout.name || 'No Loadout',
                  loadoutId: primaryLoadout.id,
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
              // Get the last few events (avoid duplicates)
              const recentEvents = events.slice(-10);
              const storeActions = useHuntStore.getState();
              const storeState = useHuntStore.getState();

              recentEvents.forEach((evt) => {
                // Determine if this is a system pickup (no player) or a global (has player)
                const isSystemPickup = !evt.player || evt.player.trim() === '';

                if (isSystemPickup) {
                  // Create unique key for duplicate detection
                  const eventKey = `loot:${evt.timestamp}:${evt.creature}:${evt.value}`;

                  if (!processedEventsRef.current.has(eventKey)) {
                    // Check if item is in ignore list
                    const ignoreList = storeSettings.ignoreListItems || [];
                    if (ignoreList.includes(evt.creature)) {
                      debugDetail('[ChatLogMonitor] Skipping ignored item:', evt.creature);
                      processedEventsRef.current.add(eventKey);
                      return;
                    }

                    // System pickups should be added as loot items
                    debugDetail('[ChatLogMonitor] Adding system pickup:', evt.creature, evt.value);

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
                      timestamp: parseTimestamp(evt.timestamp),
                    });

                    processedEventsRef.current.add(eventKey);
                  } else {
                    debugDetail('[ChatLogMonitor] Skipping duplicate loot event');
                  }
                } else if (
                  storeSettings.avatarName &&
                  evt.player.includes(storeSettings.avatarName)
                ) {
                  // Create unique key for duplicate detection
                  const eventKey = `global:${evt.timestamp}:${evt.creature}:${evt.value}:${evt.is_hof}`;

                  if (!processedEventsRef.current.has(eventKey)) {
                    // Only add globals if avatar name is set AND it matches the player
                    debugDetail('[ChatLogMonitor] Adding global:', evt.creature, evt.value);
                    storeActions.addGlobal(activeSession.id, {
                      creature: evt.creature,
                      value: evt.value,
                      isHoF: evt.is_hof,
                      timestamp: parseTimestamp(evt.timestamp),
                    });

                    processedEventsRef.current.add(eventKey);
                  } else {
                    debugDetail('[ChatLogMonitor] Skipping duplicate global event');
                  }
                }
              });
            }

            // Process damage events (independent of loot events)
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
                const eventKey = `dmg:${dmg.timestamp}:${dmg.damage}:${dmg.is_critical}`;
                if (!processedEventsRef.current.has(eventKey)) {
                  debugDetail(
                    '[ChatLogMonitor] Adding damage event:',
                    dmg.damage,
                    'damage, critical:',
                    dmg.is_critical
                  );
                  const timestampMs = parseTimestamp(dmg.timestamp);
                  storeActions.addDamageEvent(
                    activeSession.id,
                    dmg.damage,
                    dmg.is_critical,
                    timestampMs
                  );
                  // Generate a combat event for this hit to charge shot costs
                  const combatEventType = dmg.is_critical ? 'crit' : 'hit';
                  storeActions.addCombatEvent(activeSession.id, combatEventType, timestampMs);
                  processedEventsRef.current.add(eventKey);
                  addedCount++;
                } else {
                  debugDetail('[ChatLogMonitor] Skipping duplicate damage event');
                }
              });
              debugDetail('[ChatLogMonitor] Added', addedCount, 'new damage events');
            }

            // Process combat events (miss, dodge, evade, hit, crit)
            if (activeSession && combatEvents.length > 0) {
              debugDetail('[ChatLogMonitor] Processing combat events:', combatEvents.length);
              const storeActions = useHuntStore.getState();
              let addedCount = 0;
              combatEvents.forEach((combat) => {
                const eventKey = `combat:${combat.timestamp}:${combat.event_type}`;
                if (!processedEventsRef.current.has(eventKey)) {
                  debugDetail('[ChatLogMonitor] Adding combat event:', combat.event_type);
                  storeActions.addCombatEvent(
                    activeSession.id,
                    combat.event_type,
                    parseTimestamp(combat.timestamp)
                  );
                  processedEventsRef.current.add(eventKey);
                  addedCount++;
                }
              });
              debugDetail('[ChatLogMonitor] Added', addedCount, 'new combat events');
            }

            // Process healing events
            if (activeSession && healingEvents.length > 0) {
              debugDetail('[ChatLogMonitor] Processing healing events:', healingEvents.length);
              const storeActions = useHuntStore.getState();
              let addedCount = 0;
              healingEvents.forEach((heal) => {
                const eventKey = `heal:${heal.timestamp}:${heal.amount}`;
                if (!processedEventsRef.current.has(eventKey)) {
                  debugDetail('[ChatLogMonitor] Adding healing event:', heal.amount);
                  storeActions.addHealingEvent(
                    activeSession.id,
                    heal.amount,
                    parseTimestamp(heal.timestamp)
                  );
                  processedEventsRef.current.add(eventKey);
                  addedCount++;
                }
              });
              debugDetail('[ChatLogMonitor] Added', addedCount, 'new healing events');
            }

            // Process damage taken events
            if (activeSession && damageTakenEvents.length > 0) {
              debugDetail(
                '[ChatLogMonitor] Processing damage taken events:',
                damageTakenEvents.length
              );
              const storeActions = useHuntStore.getState();
              let addedCount = 0;
              damageTakenEvents.forEach((dmgTaken) => {
                const eventKey = `dmgtaken:${dmgTaken.timestamp}:${dmgTaken.damage}:${dmgTaken.is_critical}`;
                if (!processedEventsRef.current.has(eventKey)) {
                  debugDetail('[ChatLogMonitor] Adding damage taken event:', dmgTaken.damage);
                  storeActions.addDamageTakenEvent(
                    activeSession.id,
                    dmgTaken.damage,
                    dmgTaken.is_critical,
                    parseTimestamp(dmgTaken.timestamp)
                  );
                  processedEventsRef.current.add(eventKey);
                  addedCount++;
                }
              });
              debugDetail('[ChatLogMonitor] Added', addedCount, 'new damage taken events');
            }

            // Process skill gains
            if (activeSession && skillGains.length > 0) {
              debugDetail('[ChatLogMonitor] Processing skill gains:', skillGains.length);
              const storeActions = useHuntStore.getState();
              let addedCount = 0;
              skillGains.forEach((skill) => {
                const eventKey = `skill:${skill.timestamp}:${skill.skill_name}:${skill.gain}`;
                if (!processedEventsRef.current.has(eventKey)) {
                  debugDetail('[ChatLogMonitor] Adding skill gain:', skill.skill_name, skill.gain);
                  storeActions.addSkillGain(activeSession.id, {
                    skillName: skill.skill_name,
                    gainAmount: skill.gain,
                    timestamp: parseTimestamp(skill.timestamp),
                  });
                  processedEventsRef.current.add(eventKey);
                  addedCount++;
                }
              });
              debugDetail('[ChatLogMonitor] Added', addedCount, 'new skill gains');
            }
          } catch (error) {
            console.error('[ChatLogMonitor] Error parsing chat log:', error);
          } finally {
            parseInProgressRef.current = false;
            if (reparseQueuedRef.current || pendingPayloadRef.current.length > 0) {
              reparseQueuedRef.current = false;
              coalesceTimerRef.current = window.setTimeout(() => {
                coalesceTimerRef.current = null;
                void parseBufferedPayload();
              }, 50);
            }
          }
        };

        const scheduleParse = () => {
          if (coalesceTimerRef.current !== null) {
            return;
          }

          coalesceTimerRef.current = window.setTimeout(() => {
            coalesceTimerRef.current = null;
            void parseBufferedPayload();
          }, 100);
        };

        // Listen for file updates - await to ensure it's registered before we continue
        debugLog('[ChatLogMonitor] Registering event listener for chat-log-updated...');
        unlistenFn = await listen<string>('chat-log-updated', (event) => {
          pendingPayloadRef.current += event.payload;
          if (!event.payload.endsWith('\n')) {
            pendingPayloadRef.current += '\n';
          }
          debugDetail(
            '[ChatLogMonitor] Queued payload chunk. Total buffered bytes:',
            pendingPayloadRef.current.length
          );
          scheduleParse();
        });

        // Check again if component is still mounted before updating state
        if (!isMounted) {
          debugLog('[ChatLogMonitor] Component unmounted before setState, cleaning up listener');
          if (unlistenFn) unlistenFn();
          return;
        }

        debugLog('[ChatLogMonitor] Event listener registered successfully');
        debugLog('[ChatLogMonitor] Setting listenerReady to true');
        setListenerReady(true);
        debugLog('[ChatLogMonitor] listenerReady state updated');
      } catch (error) {
        console.error('[ChatLogMonitor] Failed to setup event listener:', error);
        console.error('[ChatLogMonitor] Error details:', JSON.stringify(error, null, 2));
      }
    };

    debugLog('[ChatLogMonitor] Calling setupListener()...');
    setupListener();
    debugLog('[ChatLogMonitor] setupListener() called (async, will complete later)');

    return () => {
      debugLog('[ChatLogMonitor] Cleaning up event listener');
      isMounted = false;
      if (coalesceTimerRef.current !== null) {
        window.clearTimeout(coalesceTimerRef.current);
        coalesceTimerRef.current = null;
      }
      if (unlistenFn) {
        debugLog('[ChatLogMonitor] Calling unlisten function');
        unlistenFn();
      }
      setListenerReady(false);
      debugLog('[ChatLogMonitor] Cleanup complete');
    };
  }, []); // Empty dependency array - set up listener only once on mount

  // This component has no UI - it only handles logic
  // UI is in ChatLogMonitorPanel.tsx
  return null;
}
