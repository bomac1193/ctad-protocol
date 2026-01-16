/**
 * CTAD Process Declaration API
 *
 * POST /api/process-declaration
 *
 * Receives creative process data from Refyn Chrome extension
 * and creates a ProcessDeclaration record with optional reward calculation.
 */

import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import {
  validateProcessInput,
  mapPlatformToEnum,
  calculateContributionReward,
} from '@/lib/process-utils';
import type { ProcessDeclarationInput, ProcessDeclarationResponse } from '@/lib/types/process';

/**
 * CORS headers for cross-origin requests from Chrome extension
 */
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

/**
 * Handle CORS preflight requests
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders,
  });
}

/**
 * Create a new ProcessDeclaration
 */
export async function POST(request: NextRequest): Promise<NextResponse<ProcessDeclarationResponse>> {
  try {
    // Parse request body
    let input: ProcessDeclarationInput;
    try {
      input = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid JSON in request body' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Validate input
    const validation = validateProcessInput(input);
    if (!validation.valid) {
      return NextResponse.json(
        { success: false, error: validation.error },
        { status: 400, headers: corsHeaders }
      );
    }

    // Map platform string to Prisma enum
    const platformEnum = mapPlatformToEnum(input.platform);

    // Calculate session duration if not provided
    let sessionDuration = input.sessionDuration;
    if (!sessionDuration && input.sessionEndedAt) {
      const startTime = new Date(input.sessionStartedAt).getTime();
      const endTime = new Date(input.sessionEndedAt).getTime();
      sessionDuration = Math.round((endTime - startTime) / 1000);
    }

    // Create ProcessDeclaration record
    const processDeclaration = await prisma.processDeclaration.create({
      data: {
        platform: platformEnum as any,
        sessionStartedAt: new Date(input.sessionStartedAt),
        sessionEndedAt: input.sessionEndedAt ? new Date(input.sessionEndedAt) : null,
        sessionDuration,
        iterationCount: input.iterationCount || input.promptLineage.length,
        promptLineage: input.promptLineage as unknown as Prisma.InputJsonValue,
        rejectedOutputs: input.rejectedOutputs as unknown as Prisma.InputJsonValue,
        selectedOutput: (input.selectedOutput || null) as unknown as Prisma.InputJsonValue,
        consentForTrainingData: input.consentForTrainingData,
        consentTimestamp: input.consentTimestamp ? new Date(input.consentTimestamp) : null,
        consentVersion: input.consentVersion,
        contributorId: input.contributorId,
        contributorExpertiseTags: input.expertiseTags || [],
      },
    });

    // Calculate and update contributor rewards if:
    // 1. Contributor ID is provided
    // 2. Consent for training data is given
    let reward = undefined;
    if (input.contributorId && input.consentForTrainingData) {
      try {
        reward = await calculateContributionReward(
          input.contributorId,
          processDeclaration.id,
          input
        );
      } catch (rewardError) {
        // Log but don't fail the request if reward calculation fails
        console.error('[CTAD] Reward calculation error:', rewardError);
      }
    }

    // Return success response
    return NextResponse.json(
      {
        success: true,
        id: processDeclaration.id,
        reward,
      },
      { status: 201, headers: corsHeaders }
    );
  } catch (error) {
    console.error('[CTAD] Process declaration error:', error);

    // Handle Prisma-specific errors
    if (error instanceof Error) {
      if (error.message.includes('Unique constraint')) {
        return NextResponse.json(
          { success: false, error: 'Duplicate declaration' },
          { status: 409, headers: corsHeaders }
        );
      }
    }

    return NextResponse.json(
      { success: false, error: 'Failed to create process declaration' },
      { status: 500, headers: corsHeaders }
    );
  }
}

/**
 * GET /api/process-declaration
 *
 * Returns aggregated statistics (no PII)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const contributorId = searchParams.get('contributorId');

    // If contributor ID provided, return their stats
    if (contributorId) {
      const contributor = await prisma.contributor.findUnique({
        where: { anonymousId: contributorId },
        select: {
          totalContributions: true,
          totalPoints: true,
          currentTier: true,
          tasteScore: true,
          expertiseTags: true,
          platformStats: true,
        },
      });

      if (!contributor) {
        return NextResponse.json(
          { success: false, error: 'Contributor not found' },
          { status: 404, headers: corsHeaders }
        );
      }

      return NextResponse.json(
        {
          success: true,
          stats: {
            ...contributor,
            currentTier: contributor.currentTier.toLowerCase(),
          },
        },
        { headers: corsHeaders }
      );
    }

    // Otherwise return aggregate platform stats
    const platformCounts = await prisma.processDeclaration.groupBy({
      by: ['platform'],
      _count: { platform: true },
      where: { consentForTrainingData: true },
    });

    const totalDeclarations = await prisma.processDeclaration.count({
      where: { consentForTrainingData: true },
    });

    const totalContributors = await prisma.contributor.count();

    return NextResponse.json(
      {
        success: true,
        stats: {
          totalDeclarations,
          totalContributors,
          platformDistribution: platformCounts.reduce(
            (acc, curr) => {
              acc[curr.platform] = curr._count.platform;
              return acc;
            },
            {} as Record<string, number>
          ),
        },
      },
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error('[CTAD] Stats retrieval error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to retrieve statistics' },
      { status: 500, headers: corsHeaders }
    );
  }
}
