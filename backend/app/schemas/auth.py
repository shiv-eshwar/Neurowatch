from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


class AuthCredentials(BaseModel):
    model_config = ConfigDict(extra="forbid")

    email: EmailStr
    password: str = Field(min_length=8)

    @field_validator("email", mode="before")
    @classmethod
    def normalize_email(cls, value: str) -> str:
        return value.strip().lower()


class SignupRequest(AuthCredentials):
    display_name: str = Field(min_length=2, max_length=48)

    @field_validator("display_name")
    @classmethod
    def normalize_display_name(cls, value: str) -> str:
        return value.strip()


class UserResponse(BaseModel):
    id: str
    email: str
    display_name: str | None
    created_at: datetime


class AuthResponse(BaseModel):
    user: UserResponse


class FirebaseAuthRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id_token: str = Field(min_length=10)
