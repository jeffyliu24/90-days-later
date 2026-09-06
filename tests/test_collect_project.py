import datetime as dt
import pathlib
import sys
import unittest


sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1] / "scripts"))

from collect_project import (  # noqa: E402
    contributor_summary,
    history_to_daily,
    star_summary,
)


class CollectProjectTests(unittest.TestCase):
    def test_star_summary_distinguishes_events_from_current_count(self):
        daily = {
            dt.date(2026, 3, 2): 100,
            dt.date(2026, 3, 3): 10,
            dt.date(2026, 5, 1): 5,
        }
        result = star_summary(
            daily,
            dt.date(2026, 3, 2),
            dt.date(2026, 6, 1),
            current_stars=111,
        )
        self.assertEqual(result["peak_day_star_events"], 100)
        self.assertEqual(result["acquired_star_events_total"], 115)
        self.assertEqual(result["current_displayed_stars"], 111)

    def test_history_expands_sunday_first_days(self):
        sunday = dt.datetime(2026, 3, 1, tzinfo=dt.timezone.utc)
        result = history_to_daily(
            [{"week": int(sunday.timestamp()), "total": 3, "days": [1, 2, 0, 0, 0, 0, 0]}]
        )
        self.assertEqual(result[dt.date(2026, 3, 1)], 1)
        self.assertEqual(result[dt.date(2026, 3, 2)], 2)

    def test_contributor_summary_excludes_known_bot_accounts(self):
        rows = [
            {"login": "owner", "type": "User", "contributions": 90},
            {"login": "helper", "type": "User", "contributions": 5},
            {"login": "dependabot[bot]", "type": "Bot", "contributions": 5},
        ]
        result = contributor_summary(rows, "owner")
        self.assertEqual(result["listed_non_bot_contributors"], 2)
        self.assertEqual(result["owner_share"], 0.9)


if __name__ == "__main__":
    unittest.main()
