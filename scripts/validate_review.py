#!/usr/bin/env python3
"""Validate review front matter, editorial gates, and required sections."""

from __future__ import annotations

import argparse
import datetime as dt
import pathlib
import sys
from typing import Any


REQUIRED_FIELDS = {
    "title",
    "repo",
    "category",
    "hype_date",
    "review_date",
    "stage",
    "learning_value",
    "adoption_confidence",
    "overall_grade",
    "confidence",
    "verified_install",
    "license_clear",
    "adoption_evidence_count",
    "critical_red_flags",
    "human_reviewer",
    "status",
    "approved_by",
    "publish_at",
    "methodology_version",
}

REQUIRED_SECTIONS = {
    "## 一句话结论",
    "## 一夜爆火",
    "## 当时与现在",
    "## 证据",
    "## 评级",
    "## 学什么",
    "## 谁适合使用",
    "## 风险与反证",
    "## 来源",
    "## 下一次复查",
}

GRADES = {"A", "B", "C", "D"}
STAGES = {"hype", "30d", "90d", "180d", "365d"}
CONFIDENCE = {"low", "medium", "high"}
STATUSES = {"draft", "review", "approved", "scheduled", "published", "due_for_recheck"}


def parse_scalar(value: str) -> Any:
    value = value.strip()
    if len(value) >= 2 and value[0] == value[-1] and value[0] in {"'", '"'}:
        value = value[1:-1]
    lowered = value.lower()
    if lowered == "true":
        return True
    if lowered == "false":
        return False
    try:
        return int(value)
    except ValueError:
        return value


def parse_front_matter(text: str) -> tuple[dict[str, Any], str]:
    lines = text.splitlines()
    if not lines or lines[0].strip() != "---":
        raise ValueError("missing opening front matter delimiter")
    try:
        end = next(index for index in range(1, len(lines)) if lines[index].strip() == "---")
    except StopIteration as exc:
        raise ValueError("missing closing front matter delimiter") from exc
    data: dict[str, Any] = {}
    for line in lines[1:end]:
        if not line.strip() or line.lstrip().startswith("#"):
            continue
        if ":" not in line:
            raise ValueError(f"invalid front matter line: {line}")
        key, value = line.split(":", 1)
        data[key.strip()] = parse_scalar(value)
    return data, "\n".join(lines[end + 1 :])


def valid_date(value: Any) -> bool:
    try:
        dt.date.fromisoformat(str(value))
        return True
    except ValueError:
        return False


def validate(path: pathlib.Path) -> list[str]:
    errors: list[str] = []
    try:
        metadata, body = parse_front_matter(path.read_text(encoding="utf-8"))
    except (OSError, ValueError) as exc:
        return [str(exc)]

    missing = sorted(REQUIRED_FIELDS - metadata.keys())
    if missing:
        errors.append(f"missing fields: {', '.join(missing)}")
    if errors:
        return errors

    for field in ("hype_date", "review_date"):
        if not valid_date(metadata[field]):
            errors.append(f"{field} must be YYYY-MM-DD")
    for field in ("learning_value", "adoption_confidence", "overall_grade"):
        if metadata[field] not in GRADES:
            errors.append(f"{field} must be one of {sorted(GRADES)}")
    if metadata["stage"] not in STAGES:
        errors.append(f"stage must be one of {sorted(STAGES)}")
    if metadata["confidence"] not in CONFIDENCE:
        errors.append(f"confidence must be one of {sorted(CONFIDENCE)}")
    if metadata["status"] not in STATUSES:
        errors.append(f"status must be one of {sorted(STATUSES)}")

    missing_sections = sorted(section for section in REQUIRED_SECTIONS if section not in body)
    if missing_sections:
        errors.append(f"missing sections: {', '.join(missing_sections)}")

    if metadata["overall_grade"] == "A":
        if metadata["stage"] not in {"90d", "180d", "365d"}:
            errors.append("A grade is not allowed before the 90d review")
        if metadata["learning_value"] != "A" or metadata["adoption_confidence"] != "A":
            errors.append("A overall grade requires A learning_value and A adoption_confidence")
        if metadata["confidence"] != "high":
            errors.append("A overall grade requires high confidence")
        if metadata["verified_install"] is not True:
            errors.append("A overall grade requires verified_install: true")
        if metadata["license_clear"] is not True:
            errors.append("A overall grade requires license_clear: true")
        if int(metadata["adoption_evidence_count"]) < 1:
            errors.append("A overall grade requires independent adoption evidence")
        if int(metadata["critical_red_flags"]) != 0:
            errors.append("A overall grade cannot have unresolved critical red flags")
        if not str(metadata["human_reviewer"]).strip():
            errors.append("A overall grade requires a named human_reviewer")

    if metadata["status"] in {"approved", "scheduled", "published"}:
        if not str(metadata["approved_by"]).strip():
            errors.append(f"status {metadata['status']} requires approved_by")
    if metadata["status"] in {"scheduled", "published"}:
        if not str(metadata["publish_at"]).strip():
            errors.append(f"status {metadata['status']} requires publish_at")

    return errors


def collect_files(paths: list[str]) -> list[pathlib.Path]:
    files: list[pathlib.Path] = []
    for raw in paths:
        path = pathlib.Path(raw)
        if path.is_dir():
            files.extend(
                item
                for item in path.rglob("*.md")
                if "templates" not in item.parts
                and not item.name.startswith("candidate-brief-")
                and item.name != ".gitkeep"
            )
        elif path.suffix == ".md":
            files.append(path)
    return sorted(set(files))


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("paths", nargs="+", help="Markdown files or directories")
    args = parser.parse_args()
    failed = False
    files = collect_files(args.paths)
    for path in files:
        errors = validate(path)
        if errors:
            failed = True
            for error in errors:
                print(f"{path}: {error}", file=sys.stderr)
        else:
            print(f"ok: {path}")
    if not files:
        print("no review Markdown files found")
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
