"""Discover and filter Hermes skills for the Echo frontend."""

import asyncio
import logging
import re
from dataclasses import dataclass

from process_manager import HERMES_COMMAND

logger = logging.getLogger(__name__)

# Categories to hide (always-on dev tools)
HIDDEN_CATEGORIES = {"software-development"}


@dataclass
class SkillInfo:
    name: str
    category: str
    source: str  # "builtin" | "local"


async def discover_skills() -> list[dict]:
    """Run `hermes skills list`, parse output, filter, and group by category."""
    raw = await _run_skills_list()
    skills = _parse_skills_table(raw)
    filtered = _filter_skills(skills)
    return _group_by_category(filtered)


async def _run_skills_list() -> str:
    proc = await asyncio.create_subprocess_exec(
        HERMES_COMMAND, "skills", "list",
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    stdout, _ = await proc.communicate()
    return stdout.decode(errors="replace")


def _parse_skills_table(raw: str) -> list[SkillInfo]:
    """Parse the ASCII table output from `hermes skills list`."""
    skills = []
    # Match table rows: │ name │ category │ source │ trust │
    row_pattern = re.compile(
        r"│\s*([^│]+?)\s*│\s*([^│]*?)\s*│\s*(\w+)\s*│\s*\w+\s*│"
    )
    for line in raw.split("\n"):
        m = row_pattern.match(line)
        if not m:
            continue
        name = m.group(1).strip()
        category = m.group(2).strip()
        source = m.group(3).strip()
        # Skip header row
        if name in ("Name", "name"):
            continue
        skills.append(SkillInfo(name=name, category=category, source=source))
    return skills


def _filter_skills(skills: list[SkillInfo]) -> list[SkillInfo]:
    """Apply filtering rules:
    - Hide builtin skills with no category
    - Hide builtin skills in HIDDEN_CATEGORIES
    - Show ALL local skills
    - Show builtin skills with allowed categories
    """
    result = []
    for s in skills:
        if s.source == "local":
            # Always show local skills
            result.append(s)
        elif s.source == "builtin":
            # Hide if no category
            if not s.category:
                continue
            # Hide if in hidden categories
            if s.category.lower() in HIDDEN_CATEGORIES:
                continue
            result.append(s)
    return result


def _group_by_category(skills: list[SkillInfo]) -> list[dict]:
    """Group skills by category. No-category local skills → 'Local / Custom'."""
    groups: dict[str, list[dict]] = {}
    for s in skills:
        cat = s.category if s.category else "Local / Custom"
        if cat not in groups:
            groups[cat] = []
        groups[cat].append({"name": s.name, "source": s.source})

    # Sort: "Local / Custom" first, then alphabetical
    result = []
    if "Local / Custom" in groups:
        result.append({"category": "Local / Custom", "skills": groups.pop("Local / Custom")})
    for cat in sorted(groups.keys()):
        result.append({"category": cat, "skills": groups[cat]})
    return result
