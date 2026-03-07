import re

from pydantic import BaseModel, EmailStr, field_validator


class RegisterRequest(BaseModel):
    """Schema for user registration."""

    email: EmailStr
    password: str

    @field_validator("email")
    @classmethod
    def must_be_hkust_email(cls, v: str) -> str:
        if not v.endswith("@connect.ust.hk"):
            raise ValueError("Only @connect.ust.hk emails are allowed")
        return v

    @field_validator("password")
    @classmethod
    def password_rules(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        if len(v) > 12:
            raise ValueError("Password must be at most 12 characters")
        if not re.fullmatch(r'[A-Za-z0-9]+', v):
            raise ValueError("Password must contain only letters and numbers")
        if not any(c.isupper() for c in v):
            raise ValueError("Password must contain at least one capital letter")
        return v


class LoginRequest(BaseModel):
    """Schema for user login."""

    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    """Schema for authentication token response."""

    access_token: str
    token_type: str = "bearer"
