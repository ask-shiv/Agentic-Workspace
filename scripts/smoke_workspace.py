import json
import os
from urllib.error import HTTPError
from urllib.request import Request, urlopen

base = os.environ.get("APP_URL", "http://127.0.0.1:5173") + "/api/conversations"


def request(url, body=None, method=None):
    req = Request(url, data=json.dumps(body).encode() if body is not None else None,
                  headers={"Content-Type": "application/json"}, method=method)
    with urlopen(req, timeout=20) as response:
        return json.load(response) if response.status != 204 else None


conversation = request(base, {}, "POST")
try:
    url = f'{base}/{conversation["id"]}/workspace'
    data = request(url)
    assert data["version"] == 0
    data["objective"] = "Smoke test objective"
    data["sections"][0]["content"] = "A lawyer-authored introduction."
    saved = request(url, data, "PUT")
    assert saved["version"] == 1
    assert request(url)["sections"][0]["content"] == data["sections"][0]["content"]
    try:
        request(url, data, "PUT")
        raise AssertionError("Stale save was accepted")
    except HTTPError as exc:
        assert exc.code == 409
    saved["sections"][0]["content"] = "Revised introduction."
    assert request(url, saved, "PUT")["version"] == 2
    with urlopen(url + "/export", timeout=20) as response:
        text = response.read().decode()
        assert response.headers["Content-Disposition"] == 'attachment; filename="document-review.md"'
        assert "Saved revision: 2" in text
        assert "Revised introduction." in text
    print("PASS: persistence, reload, stale-save rejection revision increment and export")
finally:
    request(f'{base}/{conversation["id"]}', method="DELETE")
