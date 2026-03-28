import { generateObject } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';
import type { RiskTier } from '@/lib/risk/pricing';

const RiskNarrativeSchema = z.object({
  explanation: z.string().trim().min(1),
  evidence: z.array(z.string().trim().min(1)).max(5),
});

const LLM_TIMEOUT_MS = 4_000;

export type RiskNarrativeResult = z.infer<typeof RiskNarrativeSchema> & {
  fallbackUsed: boolean;
};

type BuildRiskNarrativeInput = {
  payerName: string;
  tier: RiskTier;
  discountRate: number;
  evidence: string[];
};

type BuildRiskNarrativeOptions = {
  generateObjectImpl?: typeof generateObject;
  model?: Parameters<typeof generateObject>[0]['model'];
};

function buildFallbackNarrative(input: BuildRiskNarrativeInput): RiskNarrativeResult {
  return {
    explanation: `${input.payerName} queda clasificado en Tier ${input.tier} con una tasa de descuento del ${(input.discountRate * 100).toFixed(1)}% según señales determinísticas del BCRA.`,
    evidence: input.evidence.slice(0, 5),
    fallbackUsed: true,
  };
}

export async function buildRiskNarrative(
  input: BuildRiskNarrativeInput,
  options: BuildRiskNarrativeOptions = {},
): Promise<RiskNarrativeResult> {
  if (!options.generateObjectImpl && !process.env.OPENAI_API_KEY) {
    return buildFallbackNarrative(input);
  }

  const generateObjectImpl = options.generateObjectImpl ?? generateObject;
  const model = options.model ?? openai('gpt-4.1-mini');

  try {
    const generation = generateObjectImpl({
      model,
      schema: RiskNarrativeSchema,
      prompt: `Generá una explicación breve del riesgo crediticio.
Pagador: ${input.payerName}
Tier determinístico: ${input.tier}
Tasa determinística: ${(input.discountRate * 100).toFixed(2)}%
Hechos permitidos:
${input.evidence.map((item) => `- ${item}`).join('\n')}

No inventes hechos. Usá solo la evidencia provista.`,
    });
    const { object } = await Promise.race([
      generation,
      new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('LLM narrative timeout')), LLM_TIMEOUT_MS);
      }),
    ]);

    const filteredEvidence = object.evidence.filter((item) => input.evidence.includes(item)).slice(0, 5);

    return {
      explanation: object.explanation,
      evidence: filteredEvidence,
      fallbackUsed: false,
    };
  } catch {
    return buildFallbackNarrative(input);
  }
}
