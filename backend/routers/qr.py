from fastapi import APIRouter, Depends

from middleware.auth_middleware import get_current_user
from models.user import User
from schemas.qr import QRDecodeRequest, QRDecodeResponse
from services.qr_service import decode_qr_from_base64


router = APIRouter(prefix="/qr", tags=["qr"])


@router.post("/decode", response_model=QRDecodeResponse)
async def decode_qr(request: QRDecodeRequest, user: User = Depends(get_current_user)):
    """Decode a QR code from a base64-encoded image."""
    decoded_data = decode_qr_from_base64(request.image)
    return QRDecodeResponse(decoded_data=decoded_data)
