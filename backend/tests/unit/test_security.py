from app.core.security import hash_password, verify_password


def test_hash_and_verify_password():
    digest = hash_password("strong-password-123")
    assert verify_password("strong-password-123", digest) is True
    assert verify_password("wrong-password", digest) is False
