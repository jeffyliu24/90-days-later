#!/usr/bin/env python3
"""Collect reproducible evidence for one GitHub durability review.

The collector saves public facts and derived metrics. It does not assign a
grade, approve a draft, or publish content.
"""

from __future__ import annotations

import argparse
import csv
import datetime as dt
import json
import os
import pathlib
import re
import subprocess
import time
import urllib.error
import urllib.parse
import urllib.request
from collections import defaultdict
from typing import Any


UTC = dt.timezone.utc
API_VERSION = "2026-03-10"
BOT_PATTERN = re.compile(r"(?:\[bot\]|bot$|dependabot|github-actions|cursoragent|claude)", re.I)


def parse_date(value: str) -> dt.date:
    return dt.date.fromisoformat(value)


def iso_datetime(day: dt.date, end: bool = False) -> str:
    clock = "23:59:59Z" if end else "00:00:00Z"
    return f"{day.isoformat()}T{clock}"


def token_from_environment_or_gh() -> str | None:
    token = os.environ.get("GITHUB_TOKEN") or os.environ.get("GH_TOKEN")
    if token:
        return token
    try:
        result = subprocess.run(
            ["gh", "auth", "token"],
            check=True,
            capture_output=True,
            text=True,
            timeout=10,
        )
    except (FileNotFoundError, subprocess.CalledProcessError, subprocess.TimeoutExpired):
        return None
    return result.stdout.strip() or None


class HttpClient:
    def __init__(self, token: str | None = None) -> None:
        self.token = token

    def get_response(
        self,
        url: str,
        *,
        params: dict[str, Any] | None = None,
        github: bool = False,
        retries_for_202: int = 0,
    ) -> tuple[Any, dict[str, str], int]:
        query = urllib.parse.urlencode(params or {})
        if query:
            url = f"{url}?{query}"
        headers = {"User-Agent": "90-days-later-research"}
        if github:
            headers.update(
                {
                    "Accept": "application/vnd.github+json",
                    "X-GitHub-Api-Version": API_VERSION,
                }
            )
            if self.token:
                headers["Authorization"] = f"Bearer {self.token}"
        for attempt in range(retries_for_202 + 1):
            request = urllib.request.Request(url, headers=headers)
            try:
                with urllib.request.urlopen(request, timeout=45) as response:
                    body = response.read()
                    status = response.status
                    response_headers = {key.lower(): value for key, value in response.headers.items()}
            except urllib.error.HTTPError as exc:
                body = exc.read()
                detail = body.decode("utf-8", errors="replace")[:500]
                raise RuntimeError(f"HTTP {exc.code} for {url}: {detail}") from exc
            if status == 202 and attempt < retries_for_202:
                time.sleep(2)
                continue
            payload = json.loads(body) if body else None
            return payload, response_headers, status
        raise RuntimeError(f"HTTP 202 did not resolve for {url}")

    def get_json(self, url: str, **kwargs: Any) -> Any:
        payload, _, _ = self.get_response(url, **kwargs)
        return payload


class GitHubClient:
    def __init__(self, token: str | None) -> None:
        self.http = HttpClient(token)

    def get(
        self,
        path: str,
        params: dict[str, Any] | None = None,
        *,
        retries_for_202: int = 0,
    ) -> Any:
        return self.http.get_json(
            f"https://api.github.com{path}",
            params=params,
            github=True,
            retries_for_202=retries_for_202,
        )

    def paginate(self, path: str, *, per_page: int = 100, max_pages: int = 100) -> list[Any]:
        rows: list[Any] = []
        for page in range(1, max_pages + 1):
            payload = self.get(path, {"per_page": per_page, "page": page})
            if not payload:
                break
            if not isinstance(payload, list):
                raise RuntimeError(f"expected list while paginating {path}")
            rows.extend(payload)
            if len(payload) < per_page:
                break
        return rows

    def search_count(self, query: str) -> int:
        payload = self.get("/search/issues", {"q": query, "per_page": 1})
        return int(payload["total_count"])

    def commit_count(self, repo: str, start: dt.date, end: dt.date) -> int:
        payload, headers, _ = self.http.get_response(
            f"https://api.github.com/repos/{repo}/commits",
            params={
                "since": iso_datetime(start),
                "until": iso_datetime(end, end=True),
                "per_page": 1,
            },
            github=True,
        )
        if not payload:
            return 0
        link = headers.get("link", "")
        match = re.search(r"[?&]page=(\d+)>; rel=\"last\"", link)
        return int(match.group(1)) if match else len(payload)


def history_to_daily(rows: list[dict[str, Any]]) -> dict[dt.date, int]:
    daily: dict[dt.date, int] = defaultdict(int)
    for row in rows:
        week_start = dt.datetime.fromtimestamp(int(row["week"]), tz=UTC).date()
        values = list(row.get("days") or [])
        for offset in range(7):
            value = int(values[offset]) if offset < len(values) else 0
            daily[week_start + dt.timedelta(days=offset)] += value
    return dict(sorted(daily.items()))


def sum_dates(daily: dict[dt.date, int], start: dt.date, end: dt.date) -> int:
    return sum(value for day, value in daily.items() if start <= day <= end)


def release_summary(
    releases: list[dict[str, Any]], hype_date: dt.date, review_date: dt.date
) -> dict[str, Any]:
    published: list[tuple[dt.datetime, dict[str, Any]]] = []
    for release in releases:
        stamp = release.get("published_at")
        if stamp and not release.get("draft"):
            published.append((dt.datetime.fromisoformat(stamp.replace("Z", "+00:00")), release))
    published.sort(key=lambda item: item[0])
    recent_start = review_date - dt.timedelta(days=89)
    return {
        "count_total": len(published),
        "count_through_hype_date": sum(stamp.date() <= hype_date for stamp, _ in published),
        "count_after_hype_date": sum(
            hype_date < stamp.date() <= review_date for stamp, _ in published
        ),
        "count_recent_90d": sum(
            recent_start <= stamp.date() <= review_date for stamp, _ in published
        ),
        "latest": (
            {
                "tag_name": published[-1][1].get("tag_name"),
                "published_at": published[-1][1].get("published_at"),
                "html_url": published[-1][1].get("html_url"),
            }
            if published
            else None
        ),
    }


def enrich_tags(
    client: GitHubClient, repo: str, tags: list[dict[str, Any]], limit: int = 20
) -> list[dict[str, Any]]:
    enriched: list[dict[str, Any]] = []
    for row in tags[:limit]:
        sha = (row.get("commit") or {}).get("sha")
        detail: dict[str, Any] = {"name": row.get("name"), "commit_sha": sha}
        if sha:
            try:
                commit = client.get(f"/repos/{repo}/commits/{sha}")
                detail["committed_at"] = (
                    ((commit.get("commit") or {}).get("committer") or {}).get("date")
                )
                detail["html_url"] = commit.get("html_url")
            except RuntimeError as exc:
                detail["error"] = str(exc)
        enriched.append(detail)
    return enriched


def tag_summary(tags: list[dict[str, Any]]) -> dict[str, Any]:
    dated = [row for row in tags if row.get("committed_at")]
    dated.sort(key=lambda row: row["committed_at"])
    return {
        "enriched_tag_count": len(tags),
        "latest_by_commit_date": dated[-1] if dated else None,
        "note": "Tag dates use the referenced commit timestamp, not a GitHub Release timestamp.",
    }


def contributor_summary(rows: list[dict[str, Any]], owner: str) -> dict[str, Any]:
    total = sum(int(row.get("contributions") or 0) for row in rows)
    owner_total = sum(
        int(row.get("contributions") or 0)
        for row in rows
        if str(row.get("login") or "").lower() == owner.lower()
    )
    humans = [
        row
        for row in rows
        if row.get("type") != "Bot" and not BOT_PATTERN.search(str(row.get("login") or ""))
    ]
    return {
        "listed_contributors": len(rows),
        "listed_non_bot_contributors": len(humans),
        "total_contributions": total,
        "owner_contributions": owner_total,
        "owner_share": round(owner_total / total, 4) if total else None,
        "top_non_bot": [
            {"login": row.get("login"), "contributions": row.get("contributions")}
            for row in humans[:10]
        ],
    }


def star_summary(
    daily: dict[dt.date, int], hype_date: dt.date, review_date: dt.date, current_stars: int
) -> dict[str, Any]:
    bounded = {day: value for day, value in daily.items() if day <= review_date}
    peak_day, peak_value = max(bounded.items(), key=lambda item: (item[1], item[0]))
    first_30 = sum_dates(bounded, hype_date, hype_date + dt.timedelta(days=29))
    days_61_90 = sum_dates(
        bounded,
        hype_date + dt.timedelta(days=60),
        hype_date + dt.timedelta(days=89),
    )
    recent_30 = sum_dates(bounded, review_date - dt.timedelta(days=29), review_date)
    prior_30 = sum_dates(
        bounded,
        review_date - dt.timedelta(days=59),
        review_date - dt.timedelta(days=30),
    )
    acquired_to_hype = sum(value for day, value in bounded.items() if day <= hype_date)
    acquired_after_hype = sum(value for day, value in bounded.items() if hype_date < day <= review_date)
    acquired_total = sum(bounded.values())
    return {
        "peak_day": peak_day.isoformat(),
        "peak_day_star_events": peak_value,
        "acquired_star_events_through_hype_date": acquired_to_hype,
        "acquired_star_events_after_hype_date": acquired_after_hype,
        "acquired_star_events_total": acquired_total,
        "current_displayed_stars": current_stars,
        "first_30d_star_events": first_30,
        "days_61_90_star_events": days_61_90,
        "hype_retention_90": round(days_61_90 / first_30, 4) if first_30 else None,
        "recent_30d_star_events": recent_30,
        "prior_30d_star_events": prior_30,
        "recent_vs_prior_30d": round(recent_30 / prior_30, 4) if prior_30 else None,
        "note": (
            "GitHub star history counts star creation events. It does not subtract later unstars, "
            "so historical displayed star counts are approximate."
        ),
    }


def issue_and_commit_windows(
    client: GitHubClient, repo: str, hype_date: dt.date, review_date: dt.date
) -> dict[str, Any]:
    windows = {
        "pre_hype": (max(hype_date - dt.timedelta(days=53), parse_date("2008-01-01")), hype_date),
        "first_90d_after_hype": (hype_date + dt.timedelta(days=1), hype_date + dt.timedelta(days=90)),
        "recent_90d": (review_date - dt.timedelta(days=89), review_date),
        "recent_30d": (review_date - dt.timedelta(days=29), review_date),
    }
    output: dict[str, Any] = {}
    for name, (start, end) in windows.items():
        date_range = f"{start.isoformat()}..{end.isoformat()}"
        output[name] = {
            "start": start.isoformat(),
            "end": end.isoformat(),
            "commits": client.commit_count(repo, start, end),
            "issues_opened": client.search_count(
                f"repo:{repo} is:issue created:{date_range}"
            ),
            "issues_closed": client.search_count(
                f"repo:{repo} is:issue closed:{date_range}"
            ),
            "prs_opened": client.search_count(f"repo:{repo} is:pr created:{date_range}"),
            "prs_merged": client.search_count(f"repo:{repo} is:pr merged:{date_range}"),
        }
    output["current"] = {
        "open_issues": client.search_count(f"repo:{repo} is:issue is:open"),
        "open_prs": client.search_count(f"repo:{repo} is:pr is:open"),
    }
    return output


def registry_evidence(http: HttpClient, review_date: dt.date) -> dict[str, Any]:
    start = review_date - dt.timedelta(days=63)
    evidence: dict[str, Any] = {}
    endpoints = {
        "npm_metadata": "https://registry.npmjs.org/worldmonitor",
        "npm_downloads_since_sdk_launch": (
            f"https://api.npmjs.org/downloads/point/{start.isoformat()}:{review_date.isoformat()}/worldmonitor"
        ),
        "npm_downloads_last_month": "https://api.npmjs.org/downloads/point/last-month/worldmonitor",
        "pypi_metadata": "https://pypi.org/pypi/worldmonitor-sdk/json",
        "rubygems_metadata": "https://rubygems.org/api/v1/gems/worldmonitor.json",
    }
    for name, url in endpoints.items():
        try:
            evidence[name] = http.get_json(url)
        except RuntimeError as exc:
            evidence[name] = {"error": str(exc)}
    npm = evidence.get("npm_metadata") or {}
    pypi = evidence.get("pypi_metadata") or {}
    ruby = evidence.get("rubygems_metadata") or {}
    return {
        "npm": {
            "latest_version": (npm.get("dist-tags") or {}).get("latest"),
            "versions": sorted((npm.get("versions") or {}).keys()),
            "downloads_since_sdk_launch": evidence.get("npm_downloads_since_sdk_launch"),
            "downloads_last_month": evidence.get("npm_downloads_last_month"),
            "source": "https://registry.npmjs.org/worldmonitor",
        },
        "pypi": {
            "latest_version": (pypi.get("info") or {}).get("version"),
            "release_dates": {
                version: [item.get("upload_time_iso_8601") for item in files]
                for version, files in (pypi.get("releases") or {}).items()
            },
            "source": "https://pypi.org/project/worldmonitor-sdk/",
        },
        "rubygems": {
            "version": ruby.get("version"),
            "downloads": ruby.get("downloads"),
            "version_downloads": ruby.get("version_downloads"),
            "source": "https://rubygems.org/gems/worldmonitor",
        },
        "go": {
            "known_importers": 0,
            "observed_at": review_date.isoformat(),
            "source": "https://pkg.go.dev/github.com/koala73/worldmonitor/sdk/go",
            "note": "Captured from the public pkg.go.dev package page; not fetched by this script.",
        },
    }


def important_files(client: GitHubClient, repo: str) -> dict[str, Any]:
    paths = [
        "README.md",
        "LICENSE",
        "SECURITY.md",
        "CONTRIBUTING.md",
        "ARCHITECTURE.md",
        "CHANGELOG.md",
        "package.json",
        "package-lock.json",
        "SELF_HOSTING.md",
        ".github/workflows/test.yml",
    ]
    output: dict[str, Any] = {}
    for path in paths:
        encoded = urllib.parse.quote(path, safe="/")
        try:
            payload = client.get(f"/repos/{repo}/contents/{encoded}")
        except RuntimeError as exc:
            output[path] = {"error": str(exc)}
            continue
        output[path] = {
            "sha": payload.get("sha"),
            "size": payload.get("size"),
            "html_url": payload.get("html_url"),
        }
    return output


def collect(repo: str, hype_date: dt.date, review_date: dt.date) -> dict[str, Any]:
    token = token_from_environment_or_gh()
    github = GitHubClient(token)
    http = HttpClient()
    repository = github.get(f"/repos/{repo}")
    star_rows = github.paginate(
        f"/repos/{repo}/stargazers/history", per_page=30, max_pages=100
    )
    releases = github.paginate(f"/repos/{repo}/releases")
    tags = github.paginate(f"/repos/{repo}/tags")
    tag_details = enrich_tags(github, repo, tags)
    contributors = github.paginate(f"/repos/{repo}/contributors")
    advisories = github.paginate(f"/repos/{repo}/security-advisories")
    community = github.get(f"/repos/{repo}/community/profile")
    participation = github.get(
        f"/repos/{repo}/stats/participation", retries_for_202=4
    )
    commit_activity = github.get(
        f"/repos/{repo}/stats/commit_activity", retries_for_202=4
    )
    daily = history_to_daily(star_rows)
    owner = repo.split("/", 1)[0]

    normalized_repo = {
        key: repository.get(key)
        for key in (
            "id",
            "full_name",
            "html_url",
            "description",
            "homepage",
            "created_at",
            "updated_at",
            "pushed_at",
            "stargazers_count",
            "forks_count",
            "subscribers_count",
            "open_issues_count",
            "default_branch",
            "archived",
            "disabled",
            "language",
            "size",
            "topics",
        )
    }
    normalized_repo["license"] = repository.get("license")

    return {
        "schema_version": "0.1",
        "collected_at": dt.datetime.now(tz=UTC).isoformat(),
        "review_date": review_date.isoformat(),
        "hype_date": hype_date.isoformat(),
        "repository": normalized_repo,
        "derived": {
            "days_since_hype": (review_date - hype_date).days,
            "stars": star_summary(
                daily,
                hype_date,
                review_date,
                int(repository.get("stargazers_count") or 0),
            ),
            "releases": release_summary(releases, hype_date, review_date),
            "tags": tag_summary(tag_details),
            "contributors": contributor_summary(contributors, owner),
            "activity_windows": issue_and_commit_windows(
                github, repo, hype_date, review_date
            ),
        },
        "github": {
            "star_history_weeks": star_rows,
            "releases": [
                {
                    key: row.get(key)
                    for key in (
                        "tag_name",
                        "name",
                        "html_url",
                        "published_at",
                        "created_at",
                        "draft",
                        "prerelease",
                    )
                }
                for row in releases
            ],
            "tags": [
                {
                    "name": row.get("name"),
                    "commit_sha": (row.get("commit") or {}).get("sha"),
                }
                for row in tags
            ],
            "tag_details": tag_details,
            "contributors": [
                {
                    "login": row.get("login"),
                    "type": row.get("type"),
                    "contributions": row.get("contributions"),
                    "html_url": row.get("html_url"),
                }
                for row in contributors
            ],
            "security_advisories": [
                {
                    key: row.get(key)
                    for key in (
                        "ghsa_id",
                        "cve_id",
                        "html_url",
                        "summary",
                        "description",
                        "severity",
                        "state",
                        "published_at",
                        "updated_at",
                        "withdrawn_at",
                        "vulnerabilities",
                        "cvss",
                        "credits",
                    )
                }
                for row in advisories
            ],
            "community_profile": community,
            "participation": participation,
            "commit_activity": commit_activity,
            "important_files": important_files(github, repo),
        },
        "registries": registry_evidence(http, review_date),
        "sources": {
            "repository": f"https://github.com/{repo}",
            "star_history_docs": (
                "https://docs.github.com/en/rest/activity/starring"
                "#get-repository-star-history"
            ),
            "releases": f"https://github.com/{repo}/releases",
            "security": f"https://github.com/{repo}/security",
            "contributors": f"https://github.com/{repo}/graphs/contributors",
        },
    }


def write_outputs(payload: dict[str, Any], out_dir: pathlib.Path) -> None:
    out_dir.mkdir(parents=True, exist_ok=True)
    evidence_path = out_dir / "evidence.json"
    evidence_path.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )

    rows = payload["github"]["star_history_weeks"]
    daily = history_to_daily(rows)
    with (out_dir / "star-history.csv").open("w", encoding="utf-8", newline="") as handle:
        writer = csv.writer(handle)
        writer.writerow(["date", "new_star_events"])
        for day, value in daily.items():
            writer.writerow([day.isoformat(), value])


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("repo", help="GitHub repository in owner/name form")
    parser.add_argument("--hype-date", required=True, help="YYYY-MM-DD")
    parser.add_argument("--review-date", required=True, help="YYYY-MM-DD")
    parser.add_argument("--slug", help="Output slug; defaults to repository name")
    parser.add_argument("--out-root", default="data/snapshots")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    hype_date = parse_date(args.hype_date)
    review_date = parse_date(args.review_date)
    if review_date < hype_date:
        raise SystemExit("review date must be on or after hype date")
    slug = args.slug or args.repo.split("/", 1)[1]
    out_dir = pathlib.Path(args.out_root) / slug / review_date.isoformat()
    payload = collect(args.repo, hype_date, review_date)
    write_outputs(payload, out_dir)
    print(f"wrote {out_dir / 'evidence.json'}")
    print(f"wrote {out_dir / 'star-history.csv'}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
