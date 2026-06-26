import sys
from pathlib import Path
import copy
from urllib.parse import quote

import pytest
from fastapi.testclient import TestClient

# Ensure `src` is importable
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))
import app as app_module  # noqa: E402

client = TestClient(app_module.app)

ORIGINAL_ACTIVITIES = copy.deepcopy(app_module.activities)


@pytest.fixture(autouse=True)
def reset_activities():
    # Reset the in-memory activities before each test
    app_module.activities = copy.deepcopy(ORIGINAL_ACTIVITIES)
    yield


def test_get_activities():
    resp = client.get("/activities")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, dict)
    assert "Chess Club" in data


def test_signup_and_duplicate():
    activity_name = "Chess Club"
    email = "test.user@example.com"
    path = quote(activity_name, safe='')

    # First signup should succeed
    r1 = client.post(f"/activities/{path}/signup", params={"email": email})
    assert r1.status_code == 200

    # Duplicate signup should fail (400)
    r2 = client.post(f"/activities/{path}/signup", params={"email": email})
    assert r2.status_code == 400


def test_delete_participant():
    activity_name = "Chess Club"
    email = "remove.me@example.com"
    path = quote(activity_name, safe='')

    # Sign up the participant first
    r1 = client.post(f"/activities/{path}/signup", params={"email": email})
    assert r1.status_code == 200

    # Now delete the participant
    r2 = client.delete(f"/activities/{path}/participants", params={"email": email})
    assert r2.status_code == 200

    # Verify participant removed
    activities = client.get("/activities").json()
    assert email not in activities[activity_name]["participants"]


def test_delete_nonexistent():
    activity_name = "Chess Club"
    email = "i.dont.exist@example.com"
    path = quote(activity_name, safe='')

    r = client.delete(f"/activities/{path}/participants", params={"email": email})
    assert r.status_code == 404
