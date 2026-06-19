import { describe, expect, it } from "vitest";
import { normalizeAsset, secretFindings } from "../src/lib/assets/schema";
import {
  parseExistingRegistry,
  registryFromAssets,
  registryWithStableTimestamp,
  validateAssets
} from "../src/lib/assets/registry";

describe("AI asset schema", () => {
  it("normalizes a callable asset with a verification trio", () => {
    const asset = normalizeAsset(
      {
        id: "model-decoupled-workflow",
        kind: "card",
        domain: "principle",
        visibility: "team",
        status: "valid",
        title: "Model-decoupled workflow",
        summary: "Use when deciding if a workflow depends too much on one model.",
        tags: ["model-decoupled", "workflow"],
        context_cost: "low",
        routes: ["codex", "claude-code"],
        verify: {
          command: "Fill substitution-risk and durable-substrate rows.",
          expected: "The workflow has a durable substrate outside the model.",
          failure_next: "Rescope around owned data, workflow, or verification."
        }
      },
      "ai/cards/model-decoupled-workflow.md"
    );

    expect(asset.id).toBe("model-decoupled-workflow");
    expect(asset.path).toBe("ai/cards/model-decoupled-workflow.md");
    expect(asset.tags).toEqual(["model-decoupled", "workflow"]);
    expect(asset.routes).toEqual(["codex", "claude-code"]);
  });

  it("normalizes Agent-Skills-shaped metadata assets", () => {
    const asset = normalizeAsset(
      {
        name: "workflow-home",
        description: "Use to consult and capture AI Workflow Home assets.",
        metadata: {
          id: "workflow-home",
          kind: "skill",
          domain: "coding",
          visibility: "team",
          status: "valid",
          title: "Workflow Home entry skill",
          tags: "skills,codex,claude-code",
          context_cost: "medium",
          routes: "codex,claude-code",
          verify_command: "npm run validate",
          verify_expected: "All AI assets validate.",
          verify_failure_next: "Fix schema errors before installing."
        }
      },
      "ai/skills/workflow-home/SKILL.md"
    );

    expect(asset.id).toBe("workflow-home");
    expect(asset.kind).toBe("skill");
    expect(asset.summary).toBe("Use to consult and capture AI Workflow Home assets.");
    expect(asset.tags).toEqual(["skills", "codex", "claude-code"]);
  });

  it("rejects unknown plain asset fields", () => {
    expect(() =>
      normalizeAsset(
        {
          id: "unknown-field",
          kind: "card",
          domain: "coding",
          visibility: "team",
          status: "valid",
          title: "Unknown field",
          summary: "This asset has an unsupported field.",
          tags: ["coding"],
          context_cost: "low",
          owner: "nobody",
          verify: {
            command: "Run check.",
            expected: "Check passes.",
            failure_next: "Fix check."
          }
        },
        "ai/cards/unknown-field.md"
      )
    ).toThrow(/unknown asset field 'owner'/);
  });

  it("rejects unknown Agent-Skills metadata fields", () => {
    expect(() =>
      normalizeAsset(
        {
          name: "workflow-home",
          description: "Use to consult AI Workflow Home assets.",
          metadata: {
            id: "workflow-home",
            kind: "skill",
            domain: "coding",
            visibility: "team",
            status: "valid",
            title: "Workflow Home entry skill",
            tags: "skills,codex",
            context_cost: "medium",
            unsupported: "silently ignored before",
            verify_command: "npm run validate",
            verify_expected: "All AI assets validate.",
            verify_failure_next: "Fix schema errors before installing."
          }
        },
        "ai/skills/workflow-home/SKILL.md"
      )
    ).toThrow(/unknown asset metadata field 'unsupported'/);
  });

  it("rejects assets without a complete verification trio", () => {
    expect(() =>
      normalizeAsset(
        {
          id: "broken",
          kind: "card",
          domain: "coding",
          visibility: "team",
          status: "valid",
          title: "Broken",
          summary: "Broken asset.",
          tags: ["coding"],
          context_cost: "low",
          verify: {
            command: "npm run validate",
            expected: "",
            failure_next: "Fix it."
          }
        },
        "ai/cards/broken.md"
      )
    ).toThrow(/verify.expected/);
  });

  it("rejects workflow as an asset kind because projects live in runtime inventory", () => {
    expect(() =>
      normalizeAsset(
        {
          id: "programmer-onboarding",
          kind: "workflow",
          domain: "coding",
          visibility: "team",
          status: "valid",
          title: "Programmer onboarding",
          summary: "This belongs in runtime docs or cards, not as an asset kind.",
          tags: ["coding"],
          context_cost: "low",
          verify: {
            command: "Run runtime inventory.",
            expected: "Projects appear in runtime inventory.",
            failure_next: "Move workflow-shaped content to runtime inventory or a card."
          }
        },
        "ai/workflows/programmer-onboarding.md"
      )
    ).toThrow(/kind/);
  });

  it("detects secret-like content before publication", () => {
    const findings = secretFindings(
      "Authorization: Bearer sk-test1234567890abcdef\nRESTIC_PASSWORD=abc123\nAWS_ACCESS_KEY_ID=AKIA1234567890ABCDEF\ncookie=sessionid=abc123"
    );
    expect(findings).toContain("OpenAI-style secret token");
    expect(findings).toContain("Bearer token");
    expect(findings).toContain("sensitive field assignment");
    expect(findings).toContain("AWS access key id");
  });
});

describe("AI asset registry", () => {
  it("sorts registry entries deterministically by kind then id", () => {
    const registry = registryFromAssets([
      normalizeAsset(
        {
          id: "z-profile",
          kind: "profile",
          domain: "environment",
          visibility: "private",
          status: "valid",
          title: "Z profile",
          summary: "Device profile.",
          tags: ["environment"],
          context_cost: "low",
          verify: {
            command: "Inspect profile.",
            expected: "No secrets.",
            failure_next: "Move secrets local-only."
          }
        },
        "ai/profiles/z-profile.md"
      ),
      normalizeAsset(
        {
          id: "a-card",
          kind: "card",
          domain: "coding",
          visibility: "team",
          status: "valid",
          title: "A card",
          summary: "Card summary.",
          tags: ["coding"],
          context_cost: "low",
          verify: {
            command: "Run check.",
            expected: "Check passes.",
            failure_next: "Fix check."
          }
        },
        "ai/cards/a-card.md"
      )
    ]);

    expect(registry.assets.map((asset) => asset.id)).toEqual(["a-card", "z-profile"]);
  });

  it("preserves generated_at when registry content has not changed", () => {
    const asset = normalizeAsset(
      {
        id: "stable-card",
        kind: "card",
        domain: "coding",
        visibility: "team",
        status: "valid",
        title: "Stable card",
        summary: "Stable card summary.",
        tags: ["coding"],
        context_cost: "low",
        verify: {
          command: "Run check.",
          expected: "Check passes.",
          failure_next: "Fix check."
        }
      },
      "ai/cards/stable-card.md"
    );
    const previous = registryFromAssets([asset], "2026-01-01T00:00:00.000Z");
    const next = registryWithStableTimestamp([asset], previous, "2026-02-01T00:00:00.000Z");

    expect(next.generated_at).toBe("2026-01-01T00:00:00.000Z");
  });

  it("updates generated_at when registry content changes", () => {
    const previousAsset = normalizeAsset(
      {
        id: "stable-card",
        kind: "card",
        domain: "coding",
        visibility: "team",
        status: "valid",
        title: "Stable card",
        summary: "Stable card summary.",
        tags: ["coding"],
        context_cost: "low",
        verify: {
          command: "Run check.",
          expected: "Check passes.",
          failure_next: "Fix check."
        }
      },
      "ai/cards/stable-card.md"
    );
    const changedAsset = { ...previousAsset, summary: "Changed summary." };
    const previous = registryFromAssets([previousAsset], "2026-01-01T00:00:00.000Z");
    const next = registryWithStableTimestamp(
      [changedAsset],
      previous,
      "2026-02-01T00:00:00.000Z"
    );

    expect(next.generated_at).toBe("2026-02-01T00:00:00.000Z");
  });

  it("rejects duplicate asset ids", () => {
    const first = normalizeAsset(
      {
        id: "duplicate-card",
        kind: "card",
        domain: "coding",
        visibility: "team",
        status: "valid",
        title: "Duplicate one",
        summary: "First.",
        tags: ["coding"],
        context_cost: "low",
        verify: {
          command: "Run check.",
          expected: "Check passes.",
          failure_next: "Fix check."
        }
      },
      "ai/cards/duplicate-card.md"
    );
    const second = { ...first, path: "ai/cards/duplicate-card-copy.md" };

    expect(validateAssets([first, second])).toEqual([
      "duplicate asset id 'duplicate-card' in ai/cards/duplicate-card.md and ai/cards/duplicate-card-copy.md"
    ]);
  });

  it("rejects asset kind that does not match its directory", () => {
    const asset = normalizeAsset(
      {
        id: "wrong-kind",
        kind: "prompt",
        domain: "coding",
        visibility: "team",
        status: "valid",
        title: "Wrong kind",
        summary: "Wrong directory.",
        tags: ["coding"],
        context_cost: "low",
        verify: {
          command: "Run check.",
          expected: "Check passes.",
          failure_next: "Fix check."
        }
      },
      "ai/cards/wrong-kind.md"
    );

    expect(validateAssets([asset])).toEqual([
      "ai/cards/wrong-kind.md: kind 'prompt' does not match directory kind 'card'"
    ]);
  });

  it("rejects existing registry with unknown top-level fields", () => {
    expect(() =>
      parseExistingRegistry({
        schema_version: "1.0.0",
        generated_at: "2026-01-01T00:00:00.000Z",
        assets: [],
        debug: "should not be here"
      })
    ).toThrow(/unknown registry field 'debug'/);
  });
});
