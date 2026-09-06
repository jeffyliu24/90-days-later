#!/usr/bin/env python3
"""Discover GitHub projects worth a 30/90/180/365-day follow-up.

The script intentionally creates a review artifact. It never edits cohorts,
assigns editorial grades, or publishes content.
"""

from __future__ import annotations

import argparse
import datetime as dt
import json
import math
import os
import pathlib
import sys
import urllib.error
import urllib.parse
import urllib.request
from collections import defaultdict
from typing import Any


UTC = dt.timezone.utc
RESOURCE_MARKERS = {
    "awesome",
    "book",
    "books",
    "cheatsheet",
    "course",
    "courses",
    "guide",
    "interview",
    "learning",
    "list",
    "prompts",
    "resources",
    "roadmap",
    "tutorial",
    "tutorials",
}


class GitHubClient:
    def __init__(self, token: str | None, api_version: str) -> None:
        self.token = token
        self.api_version = api_version

    def get(self, path: str, params: dict[str, Any] | None = None) -> Any:
        query = urllib.parse.urlencode(params or {})
        url = f"https://api.github.com{path}"
        if query:
            url = f"{url}?{query}"
        headers = {
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": self.api_version,
            "User-Agent": "90-days-later-research",
        }
        if self.token:
            headers["Authorization"] = f"Bearer {self.token}"
        request = urllib.request.Request(url, headers=headers)
        try:
            with urllib.request.urlopen(request, timeout=30) as response:
                return json.load(response)
        except urllib.error.HTTPError as exc:
            body = exc.read().decode("utf-8", errors="replace")
            raise RuntimeError(f"GitHub API {exc.code} for {path}: {body[:300]}") from exc

    def search(self, query: str, per_page: int) -> list[dict[str, Any]]:
        payload = self.get(
            "/search/repositories",
            {"q": query, "sort": "stars", "order": "desc", "per_page": per_page},
        )
        return list(payload.get("items", []))

    def star_history(self, full_name: str, pages: int) -> list[dict[str, Any]]:
        safe_name = urllib.parse.quote(full_name, safe="/")
        history: list[dict[str, Any]] = []
        for page in range(1, pages + 1):
            rows = self.get(
                f"/repos/{safe_name}/stargazers/history",
                {"per_page": 30, "page": page},
            )
            if not rows:
                break
            history.extend(rows)
            if len(rows) < 30:
                break
        return history


def parse_date(value: str) -> dt.date:
    return dt.date.fromisoformat(value)


def nearest_milestone(
    age_days: int, milestones: dict[str, dict[str, int]]
) -> tuple[str, int | None, str | None]:
    matches: list[tuple[int, str, str]] = []
    for label, rule in milestones.items():
        target = int(rule["day"])
        delta = age_days - target
        if delta < 0 and abs(delta) <= int(rule["lead_days"]):
            matches.append((abs(delta), label, "upcoming"))
        elif delta >= 0 and delta <= int(rule["overdue_days"]):
            matches.append((delta, label, "due"))
    if not matches:
        return ("new" if age_days < 18 else "backlog", None, None)
    distance, label, state = min(matches)
    return label, distance, state


def resource_collection_reason(repo: dict[str, Any]) -> str | None:
    """Return a reason when a repository is editorial material, not a tool."""
    name = str(repo.get("name") or "").lower().replace("_", "-")
    description = str(repo.get("description") or "").lower()
    topics = {str(topic).lower() for topic in repo.get("topics") or []}
    name_tokens = set(name.split("-"))
    if name.startswith("awesome-") or "awesome" in name_tokens:
        return "resource_collection:awesome"
    if name_tokens & {"roadmap", "guide", "cheatsheet", "interview"} or name.endswith(
        ("guide", "roadmap", "cheatsheet")
    ):
        return "resource_collection:name"
    if topics & RESOURCE_MARKERS and any(
        phrase in description
        for phrase in ("a collection of", "curated list", "interview guide", "learning resources")
    ):
        return "resource_collection:description"
    return None


def screening_flags(candidate: dict[str, Any]) -> list[str]:
    flags: list[str] = []
    total = int(candidate.get("stars_current") or 0)
    peak = int(candidate.get("peak_day_stars") or 0)
    if total and peak / total >= 0.025:
        flags.append("extreme_single_day_star_concentration")
    if not candidate.get("license") or candidate.get("license") == "NOASSERTION":
        flags.append("license_needs_manual_review")
    if not candidate.get("language"):
        flags.append("missing_primary_language")
    return flags


def history_to_daily(rows: list[dict[str, Any]]) -> dict[dt.date, int]:
    daily: dict[dt.date, int] = defaultdict(int)
    for row in rows:
        week_start = dt.datetime.fromtimestamp(int(row["week"]), tz=UTC).date()
        values = list(row.get("days") or [])
        for offset in range(7):
            count = int(values[offset]) if offset < len(values) else 0
            daily[week_start + dt.timedelta(days=offset)] += count
    return dict(daily)


def sum_window(daily: dict[dt.date, int], start: dt.date, end: dt.date) -> int:
    return sum(value for day, value in daily.items() if start <= day <= end)


def analyze_star_history(
    rows: list[dict[str, Any]], today: dt.date, milestones: dict[str, dict[str, int]]
) -> dict[str, Any]:
    daily = history_to_daily(rows)
    if not daily:
        return {"history_status": "unavailable"}

    peak_day, peak_day_stars = max(daily.items(), key=lambda item: (item[1], item[0]))
    peak_week_row = max(rows, key=lambda row: int(row.get("total", 0)))
    peak_week_stars = int(peak_week_row.get("total", 0))
    age_days = max(0, (today - peak_day).days)
    milestone, distance, milestone_state = nearest_milestone(age_days, milestones)
    target_days = (milestones.get(milestone) or {}).get("day")
    review_due_date = None
    if target_days is not None:
        review_due_date = (peak_day + dt.timedelta(days=int(target_days))).isoformat()

    first_30 = sum_window(daily, peak_day, peak_day + dt.timedelta(days=29))
    days_61_90 = sum_window(
        daily, peak_day + dt.timedelta(days=60), peak_day + dt.timedelta(days=89)
    )
    retention_90 = None
    if first_30 > 0 and age_days >= 89:
        retention_90 = round(days_61_90 / first_30, 4)

    recent_30 = sum_window(daily, today - dt.timedelta(days=29), today)
    prior_30 = sum_window(
        daily, today - dt.timedelta(days=59), today - dt.timedelta(days=30)
    )

    return {
        "history_status": "ok",
        "peak_day": peak_day.isoformat(),
        "peak_day_stars": peak_day_stars,
        "peak_week_stars": peak_week_stars,
        "days_since_peak": age_days,
        "milestone": milestone,
        "milestone_state": milestone_state,
        "milestone_distance_days": distance,
        "review_due_date": review_due_date,
        "stars_first_30d_from_peak": first_30,
        "stars_days_61_90_from_peak": days_61_90 if age_days >= 89 else None,
        "hype_retention_90": retention_90,
        "stars_recent_30d": recent_30,
        "stars_prior_30d": prior_30,
    }


def candidate_priority(candidate: dict[str, Any]) -> tuple[int, float, int]:
    milestone_rank = {"90d": 0, "180d": 1, "30d": 2, "365d": 3, "new": 4, "backlog": 5}
    peak = int(candidate.get("peak_day_stars") or 0)
    total = int(candidate.get("stars_current") or 0)
    normalized_burst = peak / max(1.0, math.sqrt(total))
    return (milestone_rank.get(candidate.get("milestone"), 9), -normalized_burst, -peak)


def build_brief(candidates: list[dict[str, Any]], generated_at: str) -> str:
    lines = [
        f"# 候选项目简报 · {generated_at[:10]}",
        "",
        "> 自动生成，仅供人工选题；不代表推荐或评级。",
        "",
        "| 优先级 | 项目 | 类别 | 复查目标 | 到期日 | 状态 | 单日峰值 | 当前 stars | 风险提示 |",
        "| ---: | --- | --- | --- | --- | --- | ---: | ---: | --- |",
    ]
    for index, item in enumerate(candidates, start=1):
        categories = ", ".join(item.get("categories", []))
        flags = ", ".join(item.get("screening_flags", [])) or "—"
        lines.append(
            "| {index} | [{name}]({url}) | {categories} | {milestone} | {due} | "
            "{state} | {peak:,} | {stars:,} | {flags} |".format(
                index=index,
                name=item["full_name"],
                url=item["html_url"],
                categories=categories,
                milestone=item.get("milestone", "—"),
                due=item.get("review_due_date") or "—",
                state=item.get("milestone_state") or "—",
                peak=int(item.get("peak_day_stars") or 0),
                stars=int(item.get("stars_current") or 0),
                flags=flags,
            )
        )
    lines.extend(
        [
            "",
            "## 人工审核时要问",
            "",
            "- 这是真正可运行的工具，还是论文演示、模板或资源列表？",
            "- 峰值日期对应什么真实事件？",
            "- 是否接近已承诺的 30/90/180/365 天复查节点？",
            "- 除 star 外，能否找到维护和下游采用证据？",
            "- 这个项目能让读者学到什么可迁移的知识？",
            "",
        ]
    )
    return "\n".join(lines)


def load_json(path: pathlib.Path) -> dict[str, Any]:
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def discover(config: dict[str, Any], token: str | None, today: dt.date) -> dict[str, Any]:
    client = GitHubClient(token, str(config["api_version"]))
    pool: dict[str, dict[str, Any]] = {}
    pushed_after = today - dt.timedelta(days=int(config["lookback_days"]))

    for entry in config["queries"]:
        query = f"{entry['query']} pushed:>={pushed_after.isoformat()}"
        for repo in client.search(query, int(config["per_query"])):
            full_name = repo["full_name"]
            if full_name not in pool:
                pool[full_name] = {"repo": repo, "categories": set()}
            pool[full_name]["categories"].add(entry["category"])

    max_pool = int(config["max_pool_size"])
    if not token:
        max_pool = min(max_pool, 15)
        print(
            "warning: GITHUB_TOKEN is missing; limiting star-history enrichment to 15 repositories",
            file=sys.stderr,
        )

    ranked_pool = sorted(
        pool.values(), key=lambda item: int(item["repo"].get("stargazers_count", 0)), reverse=True
    )[:max_pool]
    candidates: list[dict[str, Any]] = []
    unscored: list[dict[str, Any]] = []
    rejected: list[dict[str, Any]] = []

    for item in ranked_pool:
        repo = item["repo"]
        base = {
            "full_name": repo["full_name"],
            "html_url": repo["html_url"],
            "description": repo.get("description"),
            "categories": sorted(item["categories"]),
            "topics": sorted(repo.get("topics") or []),
            "language": repo.get("language"),
            "license": (repo.get("license") or {}).get("spdx_id"),
            "created_at": repo.get("created_at"),
            "pushed_at": repo.get("pushed_at"),
            "stars_current": int(repo.get("stargazers_count", 0)),
            "forks_current": int(repo.get("forks_count", 0)),
            "open_issues_current": int(repo.get("open_issues_count", 0)),
        }
        try:
            history = client.star_history(repo["full_name"], int(config["history_pages"]))
            analysis = analyze_star_history(history, today, config["milestones"])
        except RuntimeError as exc:
            analysis = {"history_status": "error", "history_error": str(exc)}
        candidate = {**base, **analysis}
        candidate["screening_flags"] = screening_flags(candidate)
        rejection_reason = resource_collection_reason(repo)
        if rejection_reason:
            candidate["rejection_reason"] = rejection_reason
            rejected.append(candidate)
            continue
        if (
            candidate.get("history_status") == "ok"
            and candidate["stars_current"] >= int(config["min_total_stars"])
            and int(candidate.get("peak_day_stars") or 0) >= int(config["min_peak_daily_stars"])
        ):
            candidates.append(candidate)
        else:
            unscored.append(candidate)

    candidates.sort(key=candidate_priority)
    candidates = candidates[: int(config["max_candidates"])]
    return {
        "schema_version": config["schema_version"],
        "generated_at": dt.datetime.now(tz=UTC).isoformat(),
        "observation_date": today.isoformat(),
        "editorial_status": "candidate_only",
        "candidate_count": len(candidates),
        "candidates": candidates,
        "unscored_count": len(unscored),
        "unscored": unscored,
        "rejected_count": len(rejected),
        "rejected": rejected,
    }


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--config", default="config/discovery.json")
    parser.add_argument("--out-dir", default="data/candidates")
    parser.add_argument("--brief-dir", default="content/drafts")
    parser.add_argument("--today", help="Override observation date (YYYY-MM-DD)")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    today = parse_date(args.today) if args.today else dt.datetime.now(tz=UTC).date()
    config = load_json(pathlib.Path(args.config))
    result = discover(config, os.environ.get("GITHUB_TOKEN"), today)

    out_dir = pathlib.Path(args.out_dir)
    brief_dir = pathlib.Path(args.brief_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    brief_dir.mkdir(parents=True, exist_ok=True)
    stem = today.isoformat()
    json_path = out_dir / f"{stem}.json"
    brief_path = brief_dir / f"candidate-brief-{stem}.md"
    json_path.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    brief_path.write_text(
        build_brief(result["candidates"], result["generated_at"]), encoding="utf-8"
    )
    print(f"wrote {json_path} and {brief_path} ({result['candidate_count']} candidates)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
