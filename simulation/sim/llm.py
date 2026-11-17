"""Thin wrapper around the Claude API that returns validated Pydantic objects."""

from typing import TypeVar

import anthropic
from dotenv import load_dotenv
from pydantic import BaseModel

from .config import APP_DIR

load_dotenv(APP_DIR / ".env.local")
client = anthropic.Anthropic(max_retries=6)

T = TypeVar("T", bound=BaseModel)


# Models that accept the server-side refusal fallback (Haiku does not).
FALLBACK_MODELS = ("claude-opus-5-5", "claude-sonnet-5-5", "claude-fable-5-1")


def ask(model: str, system: str, user: str, schema: type[T], effort: str = "medium") -> tuple[T, dict]:
    extra = {}
    if model in FALLBACK_MODELS:
        # If safety classifiers decline a request, the API retries it on a fallback model.
        extra = {"betas": ["server-side-fallback-2026-07-01"], "fallbacks": "default"}
    response = client.beta.messages.parse(
        model=model,
        max_tokens=16000,
        **extra,
        output_config={"effort": effort},
        output_format=schema,
        system=system,
        messages=[{"role": "user", "content": user}],
    )
    if response.stop_reason == "refusal":
        raise RuntimeError("Model declined the request.")
    if response.parsed_output is None:
        raise RuntimeError(f"No structured output (stop_reason={response.stop_reason}).")
    usage = {
        "model": response.model,
        "input_tokens": response.usage.input_tokens,
        "output_tokens": response.usage.output_tokens,
    }
    return response.parsed_output, usage
