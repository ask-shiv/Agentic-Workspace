import httpx
import pytest

from takehome.web.app import app


@pytest.mark.asyncio
async def test_cors_accepts_only_local_frontend_origins():
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
        for origin in ["http://127.0.0.1:5173", "http://localhost:5173"]:
            response = await client.options("/api/conversations", headers={"Origin": origin, "Access-Control-Request-Method": "GET"})
            assert response.status_code == 200
            assert response.headers["access-control-allow-origin"] == origin
        response = await client.options("/api/conversations", headers={"Origin": "https://example.invalid", "Access-Control-Request-Method": "GET"})
        assert response.status_code == 400
        assert "access-control-allow-origin" not in response.headers
