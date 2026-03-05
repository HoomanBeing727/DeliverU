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
    def password_min_length(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v


class LoginRequest(BaseModel):
    """Schema for user login."""

    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    """Schema for authentication token response."""

    access_token: str
    token_type: str = "bearer"
