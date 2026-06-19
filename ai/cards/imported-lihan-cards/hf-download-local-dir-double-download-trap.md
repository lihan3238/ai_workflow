---
id: lihan-cards-hf-download-local-dir-double-download-trap
kind: card
domain: research
visibility: team
status: valid
title: hf download --local-dir + from_pretrained(hub_id) silently re-downloads
  the whole model
summary: hf download --local-dir writes a flat path that from_pretrained(hub_id)
  cannot see, so loading triggers a full re-download. Pick one layout per
  project.
summary_zh: HF --local-dir 下载后 from_pretrained 看不到会整模型重下,一个项目只选一种布局
tags:
  - huggingface
context_cost: medium
routes:
  - codex
  - claude-code
verify:
  command: After `hf download Qwen/Qwen3-8B --local-dir
    ~/.cache/huggingface/hub/Qwen3-8B`, run `python -c "from transformers import
    AutoModelForCausalLM;
    AutoModelForCausalLM.from_pretrained('Qwen/Qwen3-8B')"` and watch network.
  expected: Bug reproduces — the model RE-DOWNLOADS into
    ~/.cache/huggingface/hub/models--Qwen--Qwen3-8B/ even though the bytes are
    already on disk at Qwen3-8B/.
  failure_next: If no re-download happens, HF may have started symlinking the two
    layouts together; otherwise apply Fix below.
---

> Imported from lihan3238.github.io ai/cards/hf-download-local-dir-double-download-trap.md. The body is preserved; metadata was converted to AI Workflow Home asset schema.


## Trigger

You ran `hf download <org>/<name> --local-dir <path>` to pre-stage a
model, then your Python script calls `from_pretrained("<org>/<name>")`.
The script starts downloading the model AGAIN despite the bytes
being on disk.

## Symptoms

- `~/.cache/huggingface/hub/` contains BOTH `<name>/` (the
  `--local-dir` flat layout) AND `models--<org>--<name>/` (the
  canonical layout).
- `du -sh` on the canonical dir matches the model size — full
  duplicate, not just metadata.
- Script printed `Downloading model.safetensors ...` even though
  `hf download` reported "100% complete" earlier.
- Total `~/.cache/huggingface/hub/` size is ~2× expected.

## Diagnosis

`hf download --local-dir <X>` writes plain files at `<X>/` (no
`models--<org>--<name>/snapshots/<sha>/` hash structure).
`from_pretrained("<org>/<name>")` resolves the hub id to
`~/.cache/huggingface/hub/models--<org>--<name>/`, finds nothing
there, and downloads from scratch. The two layouts are NOT linked.

## Fix

Pick ONE layout and stick with it across the project.

**Option A — drop `--local-dir`** (recommended for transformers-only
workflows):

```bash
hf download Qwen/Qwen3-8B --exclude "*.bin"
# Files land at ~/.cache/huggingface/hub/models--Qwen--Qwen3-8B/snapshots/<sha>/...
```

Then `from_pretrained("Qwen/Qwen3-8B")` finds them. No path
coordination needed between the download command and the loading
script.

**Option B — keep `--local-dir`, point `from_pretrained` at the
local path**:

```python
from pathlib import Path
LOCAL = Path("~/.cache/huggingface/hub/Qwen3-8B").expanduser()
src = str(LOCAL) if (LOCAL / "config.json").is_file() else "Qwen/Qwen3-8B"
model = AutoModelForCausalLM.from_pretrained(src, dtype=torch.bfloat16)
```

Useful when you want a portable / inspectable directory tree (e.g.,
shipping to a server, mounting into a container, archiving by name).

**Never mix Option A's hub id with Option B's `--local-dir` —
that's exactly the trap.**

## Why This Happens

`--local-dir` was added for users who want plain files for shipping,
mounting, or inspection — it bypasses the hash-based cache structure
that `from_pretrained` was designed around. The flag does what it
says, but downstream readers using hub ids assume the canonical
structure. HF mentions this in passing but it's not loud enough in
the CLI help text.

## Cleanup

If you have already hit this and want to reclaim the duplicate:

```bash
# Inventory: find pairs where both layouts exist
ls ~/.cache/huggingface/hub/ | sort

# Confirm flat layout is complete (config.json + all *.safetensors present)
ls ~/.cache/huggingface/hub/<name>/

# Then delete the canonical duplicate + its lock dir
rm -rf ~/.cache/huggingface/hub/models--<org>--<name>
rm -rf ~/.cache/huggingface/hub/.locks/models--<org>--<name>
```

Reclaim is typically 10-50 GB per duplicated model. Run cleanup only
after verifying the loading script reads from the surviving layout.

## Reuse Rule

- **Load when**: planning a HuggingFace model download pipeline,
  especially when pre-staging models with `hf download` for a script
  / batch job / reproduction; or debugging unexpected re-downloads
  of models that "should be on disk."
- **Do not load when**: using only `from_pretrained(hub_id)` and
  letting HF manage the cache silently — the trap cannot fire.

## Related

- HF transformers cache docs: <https://huggingface.co/docs/transformers/installation#cache-setup>
- HF Hub CLI reference: <https://huggingface.co/docs/huggingface_hub/guides/cli>
