import pathlib
import sys
import tempfile
import unittest


sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1] / "scripts"))

from validate_review import REQUIRED_SECTIONS, validate  # noqa: E402


def review_text(**overrides):
    values = {
        "title": "Example",
        "repo": "owner/repo",
        "category": "coding-agent",
        "hype_date": "2026-01-01",
        "review_date": "2026-04-01",
        "stage": "90d",
        "learning_value": "A",
        "adoption_confidence": "A",
        "overall_grade": "A",
        "confidence": "high",
        "verified_install": "true",
        "license_clear": "true",
        "adoption_evidence_count": "1",
        "critical_red_flags": "0",
        "human_reviewer": "Editor",
        "status": "review",
        "approved_by": "",
        "publish_at": "",
        "methodology_version": "0.1",
    }
    values.update(overrides)
    front = "\n".join(f'{key}: "{value}"' for key, value in values.items())
    body = "\n\n".join(sorted(REQUIRED_SECTIONS))
    return f"---\n{front}\n---\n\n{body}\n"


class ValidateReviewTests(unittest.TestCase):
    def write_and_validate(self, text):
        with tempfile.TemporaryDirectory() as directory:
            path = pathlib.Path(directory) / "review.md"
            path.write_text(text, encoding="utf-8")
            return validate(path)

    def test_valid_a_review(self):
        self.assertEqual(self.write_and_validate(review_text()), [])

    def test_a_is_blocked_before_90_days(self):
        errors = self.write_and_validate(review_text(stage="30d"))
        self.assertTrue(any("not allowed before" in error for error in errors))

    def test_scheduled_content_requires_approval_and_time(self):
        errors = self.write_and_validate(review_text(status="scheduled"))
        self.assertTrue(any("requires approved_by" in error for error in errors))
        self.assertTrue(any("requires publish_at" in error for error in errors))


if __name__ == "__main__":
    unittest.main()

