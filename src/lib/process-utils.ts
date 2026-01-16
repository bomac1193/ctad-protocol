/**
 * CTAD Process Declaration Utilities
 *
 * Validation, reward calculation, and helper functions for
 * processing contributions from Refyn extension.
 */

import { prisma } from './prisma';
import type {
  ProcessDeclarationInput,
  ContributorReward,
  ContributorTier,
  AIPlatform,
  TIER_THRESHOLDS,
  PLATFORM_RARITY,
} from './types/process';

// Re-export constants for use in this module
const TIER_THRESHOLDS_LOCAL: Record<ContributorTier, { min: number; max: number }> = {
  explorer: { min: 0, max: 99 },
  curator: { min: 100, max: 499 },
  tastemaker: { min: 500, max: 1999 },
  oracle: { min: 2000, max: Infinity },
};

const PLATFORM_RARITY_LOCAL: Record<string, number> = {
  MIDJOURNEY: 0.8,
  CHATGPT: 0.7,
  DALLE: 0.9,
  STABLE_DIFFUSION: 1.0,
  SUNO: 1.2,
  UDIO: 1.3,
  RUNWAY: 1.4,
  PIKA: 1.5,
  HIGGSFIELD: 1.8,
  FLUX: 1.3,
  LEONARDO: 1.1,
  CLAUDE: 0.9,
  UNKNOWN: 1.0,
};

/**
 * Validation result type
 */
export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validates incoming process declaration input
 */
export function validateProcessInput(input: ProcessDeclarationInput): ValidationResult {
  // Required fields
  if (!input.platform) {
    return { valid: false, error: 'Platform is required' };
  }

  if (!input.sessionStartedAt) {
    return { valid: false, error: 'Session start time is required' };
  }

  // Validate ISO date format
  const startDate = new Date(input.sessionStartedAt);
  if (isNaN(startDate.getTime())) {
    return { valid: false, error: 'Invalid session start time format (expected ISO 8601)' };
  }

  // Validate arrays
  if (!Array.isArray(input.promptLineage)) {
    return { valid: false, error: 'Prompt lineage must be an array' };
  }

  if (!Array.isArray(input.rejectedOutputs)) {
    return { valid: false, error: 'Rejected outputs must be an array' };
  }

  // Validate prompt lineage entries
  for (let i = 0; i < input.promptLineage.length; i++) {
    const version = input.promptLineage[i];
    if (!version.id || !version.content || !version.timestamp || !version.mode) {
      return {
        valid: false,
        error: `Invalid prompt version at index ${i}: missing required fields (id, content, timestamp, mode)`,
      };
    }
  }

  // Validate rejected outputs entries
  for (let i = 0; i < input.rejectedOutputs.length; i++) {
    const rejection = input.rejectedOutputs[i];
    if (!rejection.id || !rejection.promptVersionId || !rejection.timestamp) {
      return {
        valid: false,
        error: `Invalid rejected output at index ${i}: missing required fields (id, promptVersionId, timestamp)`,
      };
    }
  }

  // Validate selected output if present
  if (input.selectedOutput) {
    const selection = input.selectedOutput;
    if (!selection.id || !selection.promptVersionId || !selection.timestamp) {
      return {
        valid: false,
        error: 'Invalid selected output: missing required fields (id, promptVersionId, timestamp)',
      };
    }
  }

  // Consent validation
  if (input.consentForTrainingData && !input.consentTimestamp) {
    return {
      valid: false,
      error: 'Consent timestamp required when consent is given',
    };
  }

  return { valid: true };
}

/**
 * Maps platform string to Prisma enum value
 */
export function mapPlatformToEnum(platform: string): string {
  const platformMap: Record<string, string> = {
    'midjourney': 'MIDJOURNEY',
    'suno': 'SUNO',
    'udio': 'UDIO',
    'runway': 'RUNWAY',
    'pika': 'PIKA',
    'dalle': 'DALLE',
    'flux': 'FLUX',
    'leonardo': 'LEONARDO',
    'stable-diffusion': 'STABLE_DIFFUSION',
    'higgsfield': 'HIGGSFIELD',
    'chatgpt': 'CHATGPT',
    'claude': 'CLAUDE',
  };

  return platformMap[platform.toLowerCase()] || 'UNKNOWN';
}

/**
 * Determines contributor tier based on total points
 */
export function calculateTier(totalPoints: number): ContributorTier {
  if (totalPoints >= TIER_THRESHOLDS_LOCAL.oracle.min) return 'oracle';
  if (totalPoints >= TIER_THRESHOLDS_LOCAL.tastemaker.min) return 'tastemaker';
  if (totalPoints >= TIER_THRESHOLDS_LOCAL.curator.min) return 'curator';
  return 'explorer';
}

/**
 * Maps tier string to Prisma enum
 */
function tierToPrismaEnum(tier: ContributorTier): string {
  return tier.toUpperCase();
}

/**
 * Calculates contribution reward and updates contributor stats
 */
export async function calculateContributionReward(
  contributorId: string,
  processDeclarationId: string,
  input: ProcessDeclarationInput
): Promise<ContributorReward> {
  // ========================================
  // Calculate Base Points
  // ========================================

  let basePoints = 10; // Base reward for any contribution

  // Points for prompt lineage depth (more iterations = more valuable signal)
  // Cap at 20 points to prevent gaming
  basePoints += Math.min(input.promptLineage.length * 2, 20);

  // Points for rejections documented (explicit preference signals are gold)
  // 3 points per rejection, capped at 30
  basePoints += Math.min(input.rejectedOutputs.length * 3, 30);

  // Points for providing feedback on selection
  if (input.selectedOutput) {
    basePoints += 10; // Base for having a selection

    if (input.selectedOutput.likeReason) {
      basePoints += 5; // Bonus for categorized reason
    }

    if (input.selectedOutput.customFeedback) {
      basePoints += 10; // Bonus for detailed feedback
    }
  }

  // Points for session duration (longer = more considered decisions)
  if (input.sessionDuration) {
    const minutes = input.sessionDuration / 60;
    if (minutes >= 15) basePoints += 10;
    else if (minutes >= 5) basePoints += 5;
    else if (minutes >= 2) basePoints += 2;
  }

  // Points for expertise tags
  if (input.expertiseTags && input.expertiseTags.length > 0) {
    basePoints += Math.min(input.expertiseTags.length * 2, 6);
  }

  // ========================================
  // Get or Create Contributor
  // ========================================

  let contributor = await prisma.contributor.findUnique({
    where: { anonymousId: contributorId },
  });

  if (!contributor) {
    contributor = await prisma.contributor.create({
      data: {
        anonymousId: contributorId,
        totalContributions: 0,
        totalPoints: 0,
        currentTier: 'EXPLORER',
        tasteScore: 0.5, // Default neutral taste score
        expertiseTags: input.expertiseTags || [],
      },
    });
  }

  // ========================================
  // Calculate Multipliers
  // ========================================

  // Quality multiplier based on taste score (0.5 - 1.5x)
  // Higher taste score = selections align with consensus quality
  const qualityMultiplier = 0.5 + contributor.tasteScore;

  // Rarity bonus based on platform scarcity
  const platformEnum = mapPlatformToEnum(input.platform);
  const rarityBonus = PLATFORM_RARITY_LOCAL[platformEnum] || 1.0;

  // ========================================
  // Calculate Final Points
  // ========================================

  const pointsEarned = Math.round(basePoints * qualityMultiplier * rarityBonus);
  const newTotal = contributor.totalPoints + pointsEarned;

  // Determine new tier
  const previousTier = contributor.currentTier.toLowerCase() as ContributorTier;
  const newTier = calculateTier(newTotal);
  const tierChanged = newTier !== previousTier;

  // ========================================
  // Update Contributor Record
  // ========================================

  // Merge expertise tags
  const existingTags = new Set(contributor.expertiseTags || []);
  (input.expertiseTags || []).forEach(tag => existingTags.add(tag));
  const mergedTags = Array.from(existingTags);

  // Update platform stats
  const platformStats = (contributor.platformStats as Record<string, { contributions: number; accuracy: number }>) || {};
  const platformKey = input.platform.toLowerCase();
  if (!platformStats[platformKey]) {
    platformStats[platformKey] = { contributions: 0, accuracy: 0.5 };
  }
  platformStats[platformKey].contributions += 1;

  await prisma.contributor.update({
    where: { id: contributor.id },
    data: {
      totalContributions: contributor.totalContributions + 1,
      totalPoints: newTotal,
      currentTier: tierToPrismaEnum(newTier) as any,
      expertiseTags: mergedTags,
      platformStats: platformStats,
      consentVersion: input.consentVersion,
      consentTimestamp: input.consentTimestamp ? new Date(input.consentTimestamp) : undefined,
    },
  });

  // ========================================
  // Return Reward Info
  // ========================================

  return {
    pointsEarned,
    newTotal,
    tierChange: tierChanged
      ? { from: previousTier, to: newTier }
      : undefined,
    qualityMultiplier,
    rarityBonus,
  };
}

/**
 * Updates a contributor's taste score based on selection alignment
 * Called periodically or when consensus data is available
 */
export async function updateTasteScore(
  contributorId: string,
  alignmentScore: number // 0-1, how well recent selections aligned with consensus
): Promise<number> {
  const contributor = await prisma.contributor.findUnique({
    where: { anonymousId: contributorId },
  });

  if (!contributor) {
    return 0.5; // Default
  }

  // Exponential moving average for taste score
  // Gives more weight to recent performance while maintaining history
  const alpha = 0.2; // Learning rate
  const newTasteScore = contributor.tasteScore * (1 - alpha) + alignmentScore * alpha;

  // Clamp to valid range
  const clampedScore = Math.max(0, Math.min(1, newTasteScore));

  await prisma.contributor.update({
    where: { id: contributor.id },
    data: { tasteScore: clampedScore },
  });

  return clampedScore;
}

/**
 * Gets contributor statistics for display in extension UI
 */
export async function getContributorStats(contributorId: string) {
  const contributor = await prisma.contributor.findUnique({
    where: { anonymousId: contributorId },
  });

  if (!contributor) {
    return null;
  }

  return {
    totalContributions: contributor.totalContributions,
    totalPoints: contributor.totalPoints,
    currentTier: contributor.currentTier.toLowerCase() as ContributorTier,
    tasteScore: contributor.tasteScore,
    expertiseTags: contributor.expertiseTags,
    platformStats: contributor.platformStats,
    createdAt: contributor.createdAt,
  };
}

/**
 * Gets platform distribution for rarity calculations
 * Used to dynamically adjust rarity bonuses based on actual data
 */
export async function getPlatformDistribution(): Promise<Record<string, number>> {
  const results = await prisma.processDeclaration.groupBy({
    by: ['platform'],
    _count: { platform: true },
    where: {
      consentForTrainingData: true,
    },
  });

  const distribution: Record<string, number> = {};
  for (const result of results) {
    distribution[result.platform] = result._count.platform;
  }

  return distribution;
}
