from pydantic import BaseModel


class QRDecodeRequest(BaseModel):
    """Schema for QR code decode request."""

    image: str


class QRDecodeResponse(BaseModel):
    """Schema for QR code decode response."""

    decoded_data: str | None

    model_config = {"from_attributes": True}
