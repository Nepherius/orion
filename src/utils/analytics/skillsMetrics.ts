import { HuntSession } from '../../types';
import { calculateVariance } from './stats';

/**
 * Calculate skills grouped by location
 */
export function calculateSkillsByLocation(sessions: HuntSession[]): Record<string, number> {
  return sessions.reduce(
    (acc, session) => {
      const location = session.location || 'Unknown';
      const skillGains = session.skills.reduce((sum, skill) => sum + skill.gainAmount, 0);
      acc[location] = (acc[location] || 0) + skillGains;
      return acc;
    },
    {} as Record<string, number>
  );
}

/**
 * Calculate skills grouped by weapon
 */
export function calculateSkillsByWeapon(sessions: HuntSession[]): Record<string, number> {
  return sessions.reduce(
    (acc, session) => {
      const weapon = session.weapon || 'Unknown';
      const skillGains = session.skills.reduce((sum, skill) => sum + skill.gainAmount, 0);
      acc[weapon] = (acc[weapon] || 0) + skillGains;
      return acc;
    },
    {} as Record<string, number>
  );
}

/**
 * Calculate skill gain variance across sessions
 */
export function calculateSkillGainVariance(sessions: HuntSession[]): number {
  if (sessions.length < 2) return 0;

  const skillGains = sessions.map((s) =>
    s.skills.reduce((sum, skill) => sum + skill.gainAmount, 0)
  );

  return calculateVariance(skillGains);
}

/**
 * Calculate skill value per PED spent (efficiency)
 */
export function calculateSkillValuePerCost(sessions: HuntSession[]): number {
  const totalCost = sessions.reduce((sum, s) => sum + s.stats.totalCost, 0);
  const totalSkills = sessions.reduce(
    (sum, s) => sum + s.skills.reduce((skillSum, skill) => skillSum + skill.gainAmount, 0),
    0
  );

  if (totalCost === 0) return 0;
  return totalSkills / totalCost;
}

/**
 * Get all unique skill names from sessions (for debugging)
 */
export function getAllSkillNames(sessions: HuntSession[]): string[] {
  const skillSet = new Set<string>();
  sessions.forEach((session) => {
    session.skills.forEach((skill) => {
      skillSet.add(skill.skillName);
    });
  });
  return Array.from(skillSet).sort();
}

/**
 * Attribute skill list
 */
const ATTRIBUTES = ['Agility', 'Health', 'Intelligence', 'Psyche', 'Stamina', 'Strength'] as const;

/**
 * Calculate attribute gains for a single session
 */
export function calculateSessionAttributeGains(
  session: HuntSession
): Record<string, { gains: number; count: number }> {
  const attributeGains: Record<string, { gains: number; count: number }> = {
    Agility: { gains: 0, count: 0 },
    Health: { gains: 0, count: 0 },
    Intelligence: { gains: 0, count: 0 },
    Psyche: { gains: 0, count: 0 },
    Stamina: { gains: 0, count: 0 },
    Strength: { gains: 0, count: 0 },
  };

  session.skills.forEach((skill) => {
    if (ATTRIBUTES.includes(skill.skillName as (typeof ATTRIBUTES)[number])) {
      attributeGains[skill.skillName].gains += skill.gainAmount;
      attributeGains[skill.skillName].count += 1;
    }
  });

  return attributeGains;
}

/**
 * Calculate lifetime attribute gains across multiple sessions
 */
export function calculateLifetimeAttributeGains(
  sessions: HuntSession[]
): Record<string, { gains: number; count: number }> {
  const attributeGains: Record<string, { gains: number; count: number }> = {
    Agility: { gains: 0, count: 0 },
    Health: { gains: 0, count: 0 },
    Intelligence: { gains: 0, count: 0 },
    Psyche: { gains: 0, count: 0 },
    Stamina: { gains: 0, count: 0 },
    Strength: { gains: 0, count: 0 },
  };

  sessions.forEach((session) => {
    session.skills.forEach((skill) => {
      if (ATTRIBUTES.includes(skill.skillName as (typeof ATTRIBUTES)[number])) {
        attributeGains[skill.skillName].gains += skill.gainAmount;
        attributeGains[skill.skillName].count += 1;
      }
    });
  });

  return attributeGains;
}
