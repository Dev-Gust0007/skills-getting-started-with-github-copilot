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
    # Arrange (fixture): restore in-memory activities before each test
    app_module.activities = copy.deepcopy(ORIGINAL_ACTIVITIES)
    yield


def test_get_activities():
    # Arrange: client ready

    # Act
    resp = client.get("/activities")

    # Assert
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, dict)
    assert "Chess Club" in data


def test_signup_and_duplicate():
    # Arrange
    activity_name = "Chess Club"
    email = "test.user@example.com"
    path = quote(activity_name, safe='')

    # Act
    first = client.post(f"/activities/{path}/signup", params={"email": email})
    second = client.post(f"/activities/{path}/signup", params={"email": email})

    # Assert
    assert first.status_code == 200
    assert second.status_code == 400


def test_delete_participant():
    # Arrange
    activity_name = "Chess Club"
    email = "remove.me@example.com"
    path = quote(activity_name, safe='')

    signup = client.post(f"/activities/{path}/signup", params={"email": email})
    assert signup.status_code == 200

    # Act
    deleted = client.delete(f"/activities/{path}/participants", params={"email": email})

    # Assert
    assert deleted.status_code == 200
    activities = client.get("/activities").json()
    assert email not in activities[activity_name]["participants"]


def test_delete_nonexistent():
    # Arrange
    activity_name = "Chess Club"
    email = "i.dont.exist@example.com"
    path = quote(activity_name, safe='')

    # Act
    resp = client.delete(f"/activities/{path}/participants", params={"email": email})

    # Assert
    assert resp.status_code == 404
