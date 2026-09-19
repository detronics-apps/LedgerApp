"""One-time conversion of reference/Tasks and Catergories.xlsx into
seed/tasks-and-categories.json. Dev-only tool - not shipped to GitHub Pages.
Only the Category / Tasks / Purpose columns are used; the owner-assignment
and rationale columns belong to a separate, unrelated exercise (see the
design spec, section 2.B) and are dropped.
"""
import json
import re
import sys

import openpyxl

SRC = sys.argv[1] if len(sys.argv) > 1 else "reference/Tasks and Catergories.xlsx"
OUT = "seed/tasks-and-categories.json"


def slugify(text):
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")


def main():
    wb = openpyxl.load_workbook(SRC, data_only=True)
    ws = wb["Tasks"]

    categories = {}
    tasks = []
    for row in ws.iter_rows(min_row=2, values_only=True):
        if not row or row[1] is None or row[2] is None:
            continue
        _, category_name, task_name, purpose, _rationale = row[:5]
        cat_id = slugify(category_name)
        if cat_id not in categories:
            categories[cat_id] = {
                "id": cat_id,
                "name": category_name.strip(),
                "description": "",
                "weight": 1,
                "archived": False,
                "order": len(categories),
            }
        tasks.append({
            "id": f"{cat_id}--{slugify(task_name)}",
            "categoryId": cat_id,
            "name": task_name.strip(),
            "description": (purpose or "").strip(),
            "weight": 1,
            "archived": False,
            "order": len(tasks),
        })

    data = {"categories": list(categories.values()), "tasks": tasks}
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

    print(f"Wrote {len(data['categories'])} categories and {len(data['tasks'])} tasks to {OUT}")


if __name__ == "__main__":
    main()
