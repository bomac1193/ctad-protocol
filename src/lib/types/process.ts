/**
 * CTAD Process Declaration Types
 *
 * These types define the structure of process capture data
 * sent from Refyn Chrome extension to CTAD backend.
 */

/**
 * Supported AI generation platforms
 */
export type AIPlatform =
  | 'midjourney'
  | 'suno'
  | 'udio'
  | 'runway'
  | 'pika'
  | 'dalle'
  | 'flux'
  | 'leonardo'
  | 'stable-diffusion'
  | 'higgsfield'
  | 'chatgpt'
  | 'claude'
  | 'unknown';

/**
 * Optimization mode used when refining a prompt
 */
export type OptimizationMode =
  | 'manual'
  | 'enhance'
  | 'expand'
  | 'style'
  | 'params'
  | 'crazy';

/**
 * Contributor tier levels
 */
export type ContributorTier =
  | 'explorer'
  | 'curator'
  | 'tastemaker'
  | 'oracle';

/**
 * A single version in the prompt evolution chain
 */
export interface PromptVersion {
  /** Unique identifier for this version */
  id: string;

  /** The actual prompt content */
  content: string;

  /** ISO timestamp when this version was created */
  timestamp: string;

  /** ID of the parent version (null for initial prompt) */
  parentId: string | null;

  /** How this version was created */
  mode: OptimizationMode;

  /** Platform this prompt was used on */
  platform: AIPlatform;

  /** Optional metadata (preset used, preference context, etc.) */
  metadata?: {
    presetId?: string;
    preferenceContext?: string;
    platformParams?: Record<string, unknown>;
    originalPrompt?: string;
  };
}

/**
 * Record of a rejected/deleted output
 */
export interface RejectedOutput {
  /** Unique identifier for this rejection event */
  id: string;

  /** ID of the prompt version that generated the rejected output */
  promptVersionId: string;

  /** ISO timestamp when rejection occurred */
  timestamp: string;

  /** Categorized rejection reason */
  reason?: 'poor-quality' | 'wrong-style' | 'doesnt-match' | 'too-generic' | 'technical-issue' | 'other';

  /** Optional free-form feedback from user */
  customFeedback?: string;
}

/**
 * Record of the selected/liked output
 */
export interface SelectedOutput {
  /** Unique identifier for this selection event */
  id: string;

  /** ID of the prompt version that generated the selected output */
  promptVersionId: string;

  /** ISO timestamp when selection occurred */
  timestamp: string;

  /** Categorized reason for liking */
  likeReason?: 'great-style' | 'perfect-colors' | 'matches-intent' | 'unique' | 'technical-quality' | 'other';

  /** Optional free-form feedback from user */
  customFeedback?: string;

  /** SHA-256 hash of the output file if available */
  outputHash?: string;
}

/**
 * Input payload for POST /api/process-declaration
 */
export interface ProcessDeclarationInput {
  /** AI platform used */
  platform: AIPlatform;

  /** ISO timestamp when session started */
  sessionStartedAt: string;

  /** ISO timestamp when session ended (optional) */
  sessionEndedAt?: string;

  /** Duration in seconds (calculated if not provided) */
  sessionDuration?: number;

  /** Number of prompt iterations */
  iterationCount: number;

  /** Complete prompt evolution history */
  promptLineage: PromptVersion[];

  /** All rejected outputs during session */
  rejectedOutputs: RejectedOutput[];

  /** Final selected output (if any) */
  selectedOutput?: SelectedOutput;

  /** User consent for training data usage */
  consentForTrainingData: boolean;

  /** ISO timestamp when consent was given */
  consentTimestamp?: string;

  /** Version of consent UI (for compliance tracking) */
  consentVersion?: string;

  /** Anonymous contributor identifier */
  contributorId?: string;

  /** Expertise tags for this contribution */
  expertiseTags?: string[];
}

/**
 * Reward information returned after successful contribution
 */
export interface ContributorReward {
  /** Points earned for this contribution */
  pointsEarned: number;

  /** New total points after this contribution */
  newTotal: number;

  /** Tier change info if contributor leveled up */
  tierChange?: {
    from: ContributorTier;
    to: ContributorTier;
  };

  /** Quality multiplier applied (based on taste score) */
  qualityMultiplier: number;

  /** Rarity bonus multiplier (based on platform scarcity) */
  rarityBonus: number;
}

/**
 * Response from POST /api/process-declaration
 */
export interface ProcessDeclarationResponse {
  /** Success indicator */
  success: boolean;

  /** Created declaration ID */
  id?: string;

  /** Reward information (if contributor ID provided) */
  reward?: ContributorReward;

  /** Error message (if success is false) */
  error?: string;
}

/**
 * Contributor statistics for UI display
 */
export interface ContributorStats {
  /** Total number of contributions */
  totalContributions: number;

  /** Total points accumulated */
  totalPoints: number;

  /** Current tier */
  currentTier: ContributorTier;

  /** Taste score (0-1, how well selections align with consensus) */
  tasteScore: number;

  /** Expertise areas */
  expertiseTags: string[];

  /** Per-platform contribution stats */
  platformStats?: Record<AIPlatform, {
    contributions: number;
    accuracy: number;
  }>;
}

/**
 * Tier threshold configuration
 */
export const TIER_THRESHOLDS: Record<ContributorTier, { min: number; max: number }> = {
  explorer: { min: 0, max: 99 },
  curator: { min: 100, max: 499 },
  tastemaker: { min: 500, max: 1999 },
  oracle: { min: 2000, max: Infinity },
};

/**
 * Platform rarity weights for bonus calculation
 * Lower = more common (less bonus), Higher = rarer (more bonus)
 */
export const PLATFORM_RARITY: Record<AIPlatform, number> = {
  midjourney: 0.8,
  chatgpt: 0.7,
  dalle: 0.9,
  'stable-diffusion': 1.0,
  suno: 1.2,
  udio: 1.3,
  runway: 1.4,
  pika: 1.5,
  higgsfield: 1.8,
  flux: 1.3,
  leonardo: 1.1,
  claude: 0.9,
  unknown: 1.0,
};
