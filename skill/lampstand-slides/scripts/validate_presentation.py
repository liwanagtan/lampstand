#!/usr/bin/env python3
"""Check the bundled file schema and the skill's required sermon metadata/opening.

Requires jsonschema. This is not a Bible-reference, theological or emphasis-wording checker.
"""

import argparse
from datetime import date
import json
from pathlib import Path
import re
import sys


def validate(data, schema):
    from jsonschema import Draft202012Validator, FormatChecker

    errors = []
    validator = Draft202012Validator(schema, format_checker=FormatChecker())
    for issue in sorted(validator.iter_errors(data), key=lambda e: str(list(e.absolute_path))):
        path = ".".join(str(part) for part in issue.absolute_path) or "presentation"
        errors.append(f"{path}: {issue.message}")
    if not isinstance(data, dict):
        return errors

    pastor = data.get("speaker")
    placeholders = {"tbd", "unknown", "pastor name", "pastor's name", "your pastor", "n/a"}
    if not isinstance(pastor, str) or not pastor.strip() or pastor.strip().lower() in placeholders:
        errors.append("speaker: the confirmed pastor's name is required; do not use a placeholder.")

    service_date = data.get("date")
    if not isinstance(service_date, str) or not re.fullmatch(r"\d{4}-\d{2}-\d{2}", service_date):
        errors.append("date: the confirmed service date is required in YYYY-MM-DD format.")
    else:
        try:
            date.fromisoformat(service_date)
        except ValueError:
            errors.append("date: the service date must be a real calendar date.")

    slides = data.get("slides")
    if not isinstance(slides, list) or len(slides) < 2:
        errors.append("slides: include Countdown first, followed immediately by the Title sermon poster.")
        return errors
    first, second = slides[:2]
    if not isinstance(first, dict) or first.get("type") != "countdown":
        errors.append("slides.0: the first slide must be Countdown.")
    if not isinstance(second, dict) or second.get("type") != "title":
        errors.append("slides.1: the second slide must be Title (sermon poster).")
    elif second.get("speaker") != pastor or not isinstance(second.get("speaker"), str) or not second["speaker"].strip():
        errors.append("slides.1.speaker: include the same confirmed pastor as presentation.speaker.")
    if data.get("theme") not in (None, "lampstand"):
        errors.append("theme: use lampstand or omit it; legacy themes are disabled.")
    return errors


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("file", type=Path, help="The .lampstand.json file to check")
    args = parser.parse_args()
    try:
        data = json.loads(args.file.read_text(encoding="utf-8-sig"))
        schema_path = Path(__file__).resolve().parents[1] / "schema.json"
        schema = json.loads(schema_path.read_text(encoding="utf-8"))
        errors = validate(data, schema)
    except ImportError:
        print("Validation unavailable: Python package jsonschema is required. Use another JSON Schema validator and check the skill's metadata/opening rules separately.", file=sys.stderr)
        return 2
    except (OSError, ValueError) as exc:
        print(f"Cannot validate: {exc}", file=sys.stderr)
        return 1
    if errors:
        print("Presentation validation failed:", file=sys.stderr)
        for error in errors:
            print(f"- {error}", file=sys.stderr)
        return 1
    print(f"JSON Schema and required sermon opening passed ({len(data['slides'])} slides).")
    print("Check Bible references, attached-verse totals and translation-specific emphasis separately.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
