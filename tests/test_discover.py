import datetime as dt
import pathlib
import sys
import unittest


sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1] / "scripts"))

from discover import (  # noqa: E402
    analyze_star_history,
    nearest_milestone,
    resource_collection_reason,
)


MILESTONES = {
    "30d": {"day": 30, "lead_days": 7, "overdue_days": 14},
    "90d": {"day": 90, "lead_days": 14, "overdue_days": 28},
    "180d": {"day": 180, "lead_days": 21, "overdue_days": 45},
}


class DiscoverTests(unittest.TestCase):
    def test_nearest_milestone_prefers_90_day_window(self):
        self.assertEqual(nearest_milestone(94, MILESTONES), ("90d", 4, "due"))

    def test_upcoming_milestone_is_not_presented_as_completed(self):
        self.assertEqual(nearest_milestone(80, MILESTONES), ("90d", 10, "upcoming"))

    def test_old_non_milestone_project_goes_to_backlog(self):
        self.assertEqual(nearest_milestone(140, MILESTONES), ("backlog", None, None))

    def test_awesome_list_is_rejected(self):
        repo = {
            "name": "awesome-mcp-servers",
            "description": "A collection of MCP servers",
            "topics": ["ai", "mcp"],
        }
        self.assertEqual(resource_collection_reason(repo), "resource_collection:awesome")

    def test_camel_case_guide_is_rejected(self):
        repo = {"name": "JavaGuide", "description": "Interview guide", "topics": ["ai"]}
        self.assertEqual(resource_collection_reason(repo), "resource_collection:name")

    def test_star_history_finds_daily_peak_and_retention(self):
        sunday = dt.datetime(2026, 1, 4, tzinfo=dt.timezone.utc)
        rows = []
        for week in range(14):
            values = [0] * 7
            values[1] = 100 if week == 0 else 10
            rows.append(
                {
                    "week": int((sunday + dt.timedelta(days=7 * week)).timestamp()),
                    "total": sum(values),
                    "days": values,
                }
            )
        today = dt.date(2026, 4, 10)
        result = analyze_star_history(rows, today, MILESTONES)
        self.assertEqual(result["peak_day"], "2026-01-05")
        self.assertEqual(result["peak_day_stars"], 100)
        self.assertEqual(result["milestone"], "90d")
        self.assertIsNotNone(result["hype_retention_90"])


if __name__ == "__main__":
    unittest.main()
